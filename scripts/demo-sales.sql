-- Explicitly authorized visual demo, 27/09/2026. Operator-only, NOT a schema migration.
-- Only these existing demo advertisements are changed. Real inventory is never selected.
begin;
lock table public.vehicles in share row exclusive mode;
create temporary table demo_sale_plan(slug text primary key, months_ago int, day_offset int) on commit drop;
insert into demo_sale_plan values
 ('demo-fiat-argo-2023',5,7),
 ('demo-hyundai-hb20-2022',4,9),
 ('demo-volkswagen-polo-2024',4,18),
 ('demo-chevrolet-onix-plus-2024',3,12),
 ('demo-jeep-renegade-2022',1,14),
 ('demo-nissan-kicks-2023',0,2),
 ('demo-honda-city-2023',0,9),
 ('demo-toyota-corolla-2022',0,17);
do $$ begin
 if (select count(*) from public.vehicles v join demo_sale_plan p using(slug)
     where v.status='available' and v.version ilike '%DEMONSTRAÇÃO%' and v.description ilike '%demonstração%') <> 8
 then raise exception 'Expected eight unchanged demonstration vehicles. No records changed.'; end if;
end $$;
-- Temporarily bypass only the snapshot trigger under transaction lock to date the
-- fictional history. No app permission or permanent bypass is introduced.
alter table public.vehicles disable trigger capture_sold_snapshot;
update public.vehicles v set status='sold',sold_advertised_price=v.price,
 sold_at=least(now(),(date_trunc('month',now() at time zone 'America/Sao_Paulo')
   -make_interval(months=>p.months_ago)+make_interval(days=>p.day_offset)+interval '12 hours') at time zone 'America/Sao_Paulo'),
 description=v.description || E'\nVenda simulada para demonstração do painel; data e valores não representam uma transação real.'
from demo_sale_plan p where v.slug=p.slug;
set constraints all immediate;
alter table public.vehicles enable trigger capture_sold_snapshot;
commit;
select slug,status,sold_at,sold_advertised_price from public.vehicles where slug in (
 'demo-fiat-argo-2023','demo-hyundai-hb20-2022','demo-volkswagen-polo-2024','demo-chevrolet-onix-plus-2024',
 'demo-jeep-renegade-2022','demo-nissan-kicks-2023','demo-honda-city-2023','demo-toyota-corolla-2022') order by sold_at;
