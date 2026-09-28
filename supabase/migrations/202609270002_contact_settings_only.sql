-- Owners using the application may edit only these contact channels.
alter table public.site_settings add column facebook text not null default '';
revoke update on public.site_settings from authenticated, anon;
grant update(instagram, facebook, whatsapp) on public.site_settings to authenticated;
-- Institutional assets remain maintained by trusted operators outside the panel.
drop policy "Staff uploads storage" on storage.objects;
create policy "Staff uploads storage" on storage.objects for insert to authenticated
with check(bucket_id='vehicle-images' and public.has_permission('stock.write'));
drop policy "Staff removes unused storage" on storage.objects;
create policy "Staff removes unused storage" on storage.objects for delete to authenticated using(
 bucket_id='vehicle-images' and public.has_permission('stock.write') and not exists(
 select 1 from public.vehicle_images i join public.vehicles v on v.id=i.vehicle_id
 where i.storage_path=name and v.status in ('available','reserved')));
