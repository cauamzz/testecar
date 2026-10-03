-- Independent destinations; blank specialized channels use the general number.
alter table public.site_settings
  add column whatsapp_financing text not null default '' check (whatsapp_financing = '' or whatsapp_financing ~ '^(55)?[1-9][0-9]{9,10}$'),
  add column whatsapp_sales text not null default '' check (whatsapp_sales = '' or whatsapp_sales ~ '^(55)?[1-9][0-9]{9,10}$'),
  add column whatsapp_purchase text not null default '' check (whatsapp_purchase = '' or whatsapp_purchase ~ '^(55)?[1-9][0-9]{9,10}$');
grant update(whatsapp_financing, whatsapp_sales, whatsapp_purchase) on public.site_settings to authenticated;

-- Separate private table: actual negotiated amounts must never be public vehicle fields.
create table public.vehicle_sales (
  vehicle_id uuid primary key references public.vehicles(id) on delete cascade,
  actual_price numeric(12,2) not null check (actual_price > 0 and actual_price < 10000000000),
  updated_at timestamptz not null default now()
);
alter table public.vehicle_sales enable row level security;
revoke all on public.vehicle_sales from anon, authenticated;
grant select, insert, update, delete on public.vehicle_sales to authenticated;
create policy "Read negotiated sales" on public.vehicle_sales for select to authenticated
  using (public.has_permission('stock.read'));
create policy "Insert negotiated sales" on public.vehicle_sales for insert to authenticated
  with check (public.has_permission('stock.write'));
create policy "Update negotiated sales" on public.vehicle_sales for update to authenticated
  using (public.has_permission('stock.write')) with check (public.has_permission('stock.write'));
create policy "Remove negotiated sales" on public.vehicle_sales for delete to authenticated
  using (public.has_permission('stock.write'));

create function public.validate_vehicle_sale() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  perform 1 from public.vehicles where id=new.vehicle_id and status='sold' for update;
  if not found then raise exception 'Registre a venda somente para um veículo vendido.'; end if;
  new.updated_at := statement_timestamp();
  return new;
end; $$;
revoke all on function public.validate_vehicle_sale() from public;
create trigger validate_vehicle_sale before insert or update on public.vehicle_sales
  for each row execute function public.validate_vehicle_sale();

create function public.record_vehicle_sale(p_vehicle_id uuid, p_actual_price numeric) returns void
language plpgsql security invoker set search_path='' as $$
begin
  if not public.has_permission('stock.write') then raise exception 'Acesso negado.'; end if;
  if p_actual_price is null or p_actual_price <= 0 or p_actual_price >= 10000000000 then
    raise exception 'Informe um valor de venda válido.';
  end if;
  update public.vehicles set status='sold' where id=p_vehicle_id;
  if not found then raise exception 'Veículo não encontrado.'; end if;
  insert into public.vehicle_sales(vehicle_id,actual_price,updated_at)
    values(p_vehicle_id,p_actual_price,statement_timestamp())
    on conflict(vehicle_id) do update set actual_price=excluded.actual_price,updated_at=excluded.updated_at;
end; $$;
revoke all on function public.record_vehicle_sale(uuid,numeric) from public;
grant execute on function public.record_vehicle_sale(uuid,numeric) to authenticated;

-- Clear a previous negotiation when a vehicle returns to stock (including direct API writes).
create function public.clear_vehicle_sale() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status <> 'sold' then delete from public.vehicle_sales where vehicle_id=new.id; end if;
  return new;
end; $$;
revoke all on function public.clear_vehicle_sale() from public;
create trigger clear_vehicle_sale after update of status on public.vehicles
  for each row execute function public.clear_vehicle_sale();
