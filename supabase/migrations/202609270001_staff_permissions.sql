-- Administrative owner and per-user access, enforced by RLS.
alter table public.admin_users add column username text unique;
alter table public.admin_users add column active boolean not null default true;
alter table public.admin_users add column is_owner boolean not null default false;
alter table public.admin_users add column permissions text[] not null default '{}';
update public.admin_users set is_owner=true;
update public.admin_users a set username=split_part(u.email,'@',1) from auth.users u where u.id=a.user_id and u.email like '%@login.novadrive.invalid';
alter table public.admin_users add constraint valid_admin_username check(username is null or username ~ '^[a-z0-9][a-z0-9._-]{2,31}$');
alter table public.admin_users add constraint valid_admin_permissions check(permissions <@ array['stock.read','stock.write','stock.delete','leads.read','leads.write','settings.write']::text[]);
alter table public.admin_users add constraint consistent_admin_permissions check(
 (not ('stock.write'=any(permissions)) or 'stock.read'=any(permissions)) and
 (not ('stock.delete'=any(permissions)) or ('stock.write'=any(permissions) and 'stock.read'=any(permissions))) and
 (not ('leads.write'=any(permissions)) or 'leads.read'=any(permissions)));
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admin_users where user_id=auth.uid() and active);
$$;
create function public.has_permission(p_permission text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admin_users where user_id=auth.uid() and active and (is_owner or p_permission=any(permissions)));
$$;
revoke all on function public.has_permission(text) from public;
grant execute on function public.has_permission(text) to anon,authenticated;
drop policy "Own admin membership" on public.admin_users;
create policy "Own membership or owner directory" on public.admin_users for select to authenticated using(user_id=auth.uid() or public.has_permission('users.manage'));
-- Only the Edge Function's service credential may manage memberships.
revoke insert,update,delete on public.admin_users from anon,authenticated;
grant select,insert,update,delete on public.admin_users to service_role;
drop policy "Public published vehicles" on public.vehicles;
drop policy "Admin vehicles" on public.vehicles;
create policy "Public published vehicles" on public.vehicles for select using(status in ('available','reserved') or public.has_permission('stock.read'));
create policy "Stock insert" on public.vehicles for insert to authenticated with check(public.has_permission('stock.write'));
create policy "Stock update" on public.vehicles for update to authenticated using(public.has_permission('stock.write')) with check(public.has_permission('stock.write'));
create policy "Stock delete" on public.vehicles for delete to authenticated using(public.has_permission('stock.delete'));
drop policy "Admin photos" on public.vehicle_images;
create policy "Stock manages vehicle_images" on public.vehicle_images for all to authenticated using(public.has_permission('stock.write')) with check(public.has_permission('stock.write'));
drop policy "Admin features" on public.features;
create policy "Stock manages features" on public.features for all to authenticated using(public.has_permission('stock.write')) with check(public.has_permission('stock.write'));
drop policy "Admin vehicle features" on public.vehicle_features;
create policy "Stock manages vehicle_features" on public.vehicle_features for all to authenticated using(public.has_permission('stock.write')) with check(public.has_permission('stock.write'));
drop policy "Admin leads" on public.leads;
create policy "Read leads" on public.leads for select to authenticated using(public.has_permission('leads.read'));
create policy "Update leads" on public.leads for update to authenticated using(public.has_permission('leads.write')) with check(public.has_permission('leads.write'));
drop policy "Admin settings" on public.site_settings;
create policy "Edit settings" on public.site_settings for update to authenticated using(public.has_permission('settings.write')) with check(public.has_permission('settings.write'));
drop policy "Admin reads storage" on storage.objects;
drop policy "Admin uploads storage" on storage.objects;
drop policy "Admin removes unused storage" on storage.objects;
create policy "Staff reads storage" on storage.objects for select to authenticated using((bucket_id='vehicle-images' and public.has_permission('stock.read')) or (bucket_id='site-assets' and public.has_permission('settings.write')));
create policy "Staff uploads storage" on storage.objects for insert to authenticated with check((bucket_id='vehicle-images' and public.has_permission('stock.write')) or (bucket_id='site-assets' and public.has_permission('settings.write')));
create policy "Staff removes unused storage" on storage.objects for delete to authenticated using(
 (bucket_id='site-assets' and public.has_permission('settings.write')) or
 (bucket_id='vehicle-images' and public.has_permission('stock.write') and not exists(
 select 1 from public.vehicle_images i join public.vehicles v on v.id=i.vehicle_id where i.storage_path=name and v.status in ('available','reserved'))));

-- Attendance permission never changes personal data or consent evidence.
revoke update on public.leads from authenticated;
grant update(status) on public.leads to authenticated;

create or replace function public.save_vehicle(p_vehicle jsonb, p_images jsonb, p_features uuid[]) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare v_id uuid := coalesce((p_vehicle->>'id')::uuid, gen_random_uuid()); img jsonb; begin
 if not public.has_permission('stock.write') then raise exception 'Acesso negado.'; end if;
 if jsonb_array_length(p_images) > 30 then raise exception 'Máximo de 30 fotos.'; end if;
 if p_vehicle->>'status' in ('available','reserved') and jsonb_array_length(p_images) = 0 then raise exception 'Adicione uma foto antes de publicar.'; end if;
 for img in select value from jsonb_array_elements(p_images) loop
  if not exists(select 1 from storage.objects where bucket_id='vehicle-images' and name=img->>'storage_path') then raise exception 'Foto não encontrada no armazenamento.'; end if;
 end loop;
 insert into public.vehicles(id,slug,brand,model,version,year_manufacture,year_model,price,mileage,fuel,transmission,color,body_type,engine,steering,plate_final,description,status,featured)
 values(v_id,p_vehicle->>'slug',p_vehicle->>'brand',p_vehicle->>'model',p_vehicle->>'version',(p_vehicle->>'year_manufacture')::int,(p_vehicle->>'year_model')::int,(p_vehicle->>'price')::numeric,(p_vehicle->>'mileage')::int,p_vehicle->>'fuel',p_vehicle->>'transmission',p_vehicle->>'color',p_vehicle->>'body_type',p_vehicle->>'engine',p_vehicle->>'steering',p_vehicle->>'plate_final',p_vehicle->>'description',p_vehicle->>'status',(p_vehicle->>'featured')::boolean)
 on conflict(id) do update set slug=excluded.slug,brand=excluded.brand,model=excluded.model,version=excluded.version,year_manufacture=excluded.year_manufacture,year_model=excluded.year_model,price=excluded.price,mileage=excluded.mileage,fuel=excluded.fuel,transmission=excluded.transmission,color=excluded.color,body_type=excluded.body_type,engine=excluded.engine,steering=excluded.steering,plate_final=excluded.plate_final,description=excluded.description,status=excluded.status,featured=excluded.featured;
 delete from public.vehicle_images where vehicle_id=v_id;
 insert into public.vehicle_images(vehicle_id,storage_path,position,is_cover)
 select v_id, value->>'storage_path', ordinality::int-1, ordinality=1 from jsonb_array_elements(p_images) with ordinality;
 delete from public.vehicle_features where vehicle_id=v_id;
 insert into public.vehicle_features(vehicle_id,feature_id) select v_id, unnest(p_features);
 return v_id;
end; $$;
revoke all on function public.save_vehicle(jsonb,jsonb,uuid[]) from public;
grant execute on function public.save_vehicle(jsonb,jsonb,uuid[]) to authenticated;
