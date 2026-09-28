-- Deletion is a separate, explicitly assigned staff permission.
alter table public.admin_users drop constraint valid_admin_permissions;
alter table public.admin_users add constraint valid_admin_permissions check (
  permissions <@ array['stock.read','stock.write','stock.delete','leads.read','leads.write','leads.delete','settings.write']::text[]
);
alter table public.admin_users add constraint lead_delete_requires_read check (
  not ('leads.delete'=any(permissions)) or 'leads.read'=any(permissions)
);
grant delete on public.leads to authenticated;
create policy "Delete leads" on public.leads for delete to authenticated
using (public.has_permission('leads.delete'));

-- This is an advertised-price snapshot, never revenue or profit.
alter table public.vehicles add column sold_at timestamptz;
alter table public.vehicles add column sold_advertised_price numeric(12,2) check (sold_advertised_price > 0);
create index vehicles_sold_at_idx on public.vehicles(sold_at desc) where status='sold';
-- Existing sold records have no reliable sale date. Do not invent one.
update public.vehicles set sold_advertised_price=price where status='sold';
create function public.capture_sold_snapshot() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.status <> 'sold' then
    new.sold_at := null;
    new.sold_advertised_price := null;
  elsif tg_op = 'INSERT' then
    new.sold_at := statement_timestamp();
    new.sold_advertised_price := new.price;
  elsif old.status is distinct from 'sold' then
    new.sold_at := statement_timestamp();
    new.sold_advertised_price := new.price;
  else
    new.sold_at := old.sold_at;
    new.sold_advertised_price := old.sold_advertised_price;
  end if;
  return new;
end; $$;
create trigger capture_sold_snapshot before insert or update on public.vehicles
for each row execute function public.capture_sold_snapshot();

create function public.sales_overview(p_period text default 'month') returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare
  today date := (now() at time zone 'America/Sao_Paulo')::date;
  starts_at timestamptz;
  result jsonb;
begin
  if not public.has_permission('stock.read') then raise exception 'Acesso negado.'; end if;
  if p_period is null or p_period not in ('month','30days','year','all') then raise exception 'Período inválido.'; end if;
  starts_at := case p_period
    when 'month' then date_trunc('month',today::timestamp) at time zone 'America/Sao_Paulo'
    when '30days' then (today - 29)::timestamp at time zone 'America/Sao_Paulo'
    when 'year' then date_trunc('year',today::timestamp) at time zone 'America/Sao_Paulo'
    else null end;
  with selected as materialized (
    select * from public.vehicles where status='sold' and (starts_at is null or sold_at>=starts_at)
  ) select jsonb_build_object(
    'count',count(*), 'total',coalesce(sum(sold_advertised_price),0),
    'average',coalesce(round(avg(sold_advertised_price),2),0),
    'demoCount',count(*) filter(where slug like 'demo-%'),
    'undatedCount',(select count(*) from public.vehicles where status='sold' and sold_at is null),
    'availableValue',(select coalesce(sum(price),0) from public.vehicles where status='available'),
    'reservedValue',(select coalesce(sum(price),0) from public.vehicles where status='reserved'),
    'recent',coalesce((select jsonb_agg(row_to_json(r)) from (
      select id,brand,model,slug,sold_at,sold_advertised_price from selected order by sold_at desc nulls last,id limit 5
    ) r),'[]'::jsonb)
  ) into result from selected;
  return result || jsonb_build_object('monthly',(
    select jsonb_agg(row_to_json(m) order by m."month") from (
      select to_char(months.month_start,'YYYY-MM') as "month", count(v.id) as count,
        coalesce(sum(v.sold_advertised_price),0) total
      from generate_series(date_trunc('month',today::timestamp)-interval '5 months',date_trunc('month',today::timestamp),interval '1 month') months(month_start)
      left join public.vehicles v on v.status='sold'
        and v.sold_at >= (months.month_start at time zone 'America/Sao_Paulo')
        and v.sold_at < ((months.month_start+interval '1 month') at time zone 'America/Sao_Paulo')
      group by months.month_start
    ) m
  ));
end; $$;
revoke all on function public.sales_overview(text) from public,anon;
grant execute on function public.sales_overview(text) to authenticated;
