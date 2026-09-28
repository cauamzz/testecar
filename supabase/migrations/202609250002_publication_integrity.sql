-- Check at commit time so save_vehicle can replace all photos atomically.
create function public.ensure_published_vehicle_photos() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target uuid; begin
 if tg_table_name = 'vehicles' then
  target := coalesce(new.id, old.id);
 else
  target := case when tg_op = 'DELETE' then old.vehicle_id else new.vehicle_id end;
 end if;
 if exists(select 1 from public.vehicles where id=target and status in ('available','reserved')) and not exists(
   select 1 from public.vehicle_images i join storage.objects o on o.bucket_id='vehicle-images' and o.name=i.storage_path
   where i.vehicle_id=target and i.is_cover
 ) then raise exception 'Adicione uma foto de capa válida antes de publicar.'; end if;
 if tg_table_name='vehicle_images' then
 if tg_op='UPDATE' then
 if old.vehicle_id <> new.vehicle_id then
  if exists(select 1 from public.vehicles where id=old.vehicle_id and status in ('available','reserved')) and not exists(
   select 1 from public.vehicle_images i join storage.objects o on o.bucket_id='vehicle-images' and o.name=i.storage_path where i.vehicle_id=old.vehicle_id and i.is_cover
  ) then raise exception 'O veículo de origem precisa manter uma foto de capa.'; end if;
 end if;
 end if;
 end if;
 return null;
end; $$;
revoke all on function public.ensure_published_vehicle_photos() from public;
create constraint trigger valid_published_vehicle after insert or update on public.vehicles deferrable initially deferred for each row execute function public.ensure_published_vehicle_photos();
create constraint trigger valid_published_photos after insert or update or delete on public.vehicle_images deferrable initially deferred for each row execute function public.ensure_published_vehicle_photos();

drop policy "Admin storage access" on storage.objects;
create policy "Admin reads storage" on storage.objects for select to authenticated using(bucket_id in ('vehicle-images','site-assets') and public.is_admin());
create policy "Admin uploads storage" on storage.objects for insert to authenticated with check(bucket_id in ('vehicle-images','site-assets') and public.is_admin());
-- Uploads always use new UUID filenames; overwriting published objects is unnecessary.
create policy "Admin removes unused storage" on storage.objects for delete to authenticated using(
 public.is_admin() and (bucket_id='site-assets' or (bucket_id='vehicle-images' and not exists(
  select 1 from public.vehicle_images i join public.vehicles v on v.id=i.vehicle_id where i.storage_path=name and v.status in ('available','reserved')
 )))
);
