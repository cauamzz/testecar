-- NovaDrive: schema, least-privilege access and atomic stock operations.
create extension if not exists pgcrypto;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
create policy "Own admin membership" on public.admin_users for select to authenticated using (user_id = auth.uid());

create table public.vehicles (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 brand text not null check(length(brand) between 1 and 80),
 model text not null check(length(model) between 1 and 120),
 version text not null default '',
 year_manufacture int not null check(year_manufacture between 1900 and 2100),
 year_model int not null check(year_model between 1900 and 2100),
 price numeric(12,2) not null check(price > 0),
 mileage int not null check(mileage >= 0),
 fuel text not null default '', transmission text not null default '',
 color text not null default '', body_type text not null default '',
 engine text not null default '', steering text not null default '',
 plate_final text not null default '' check(plate_final ~ '^[0-9]?$'),
 description text not null default '' check(length(description) <= 10000),
 status text not null default 'draft' check(status in ('draft','available','reserved','sold','hidden')),
 featured boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint vehicle_year_order check(year_model >= year_manufacture and year_model <= year_manufacture + 2)
);
create index vehicles_public_idx on public.vehicles(status, created_at desc);
create index vehicles_brand_model_idx on public.vehicles(brand, model);
create index vehicles_price_idx on public.vehicles(price);
create table public.vehicle_images (
 id uuid primary key default gen_random_uuid(),
 vehicle_id uuid not null references public.vehicles(id) on delete cascade,
 storage_path text not null unique,
 position int not null default 0 check(position >= 0),
 is_cover boolean not null default false,
 created_at timestamptz not null default now()
);
create unique index vehicle_one_cover on public.vehicle_images(vehicle_id) where is_cover;
create index vehicle_images_vehicle_idx on public.vehicle_images(vehicle_id, position);
create table public.features (id uuid primary key default gen_random_uuid(), name text not null unique);
create table public.vehicle_features (
 vehicle_id uuid not null references public.vehicles(id) on delete cascade,
 feature_id uuid not null references public.features(id) on delete cascade,
 primary key(vehicle_id, feature_id)
);
create table public.leads (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 2 and 120),
 phone text not null check(phone ~ '^[0-9]{10,13}$'),
 email text not null check(length(email) <= 254 and email like '%@%.%'),
 type text not null check(type in ('vehicle_interest','financing','sell_vehicle','contact')),
 vehicle_id uuid references public.vehicles(id) on delete set null,
 message text not null default '' check(length(message) <= 5000),
 details jsonb not null default '{}' check(octet_length(details::text) <= 8000),
 consent_at timestamptz not null default now(),
 status text not null default 'new' check(status in ('new','contacted','negotiating','converted','archived')),
 created_at timestamptz not null default now()
);
create index leads_created_idx on public.leads(created_at desc);
create index leads_phone_created_idx on public.leads(phone, created_at desc);
create table public.site_settings (
 id int primary key default 1 check(id = 1),
 store_name text not null default 'NovaDrive Motors',
 logo text not null default '', whatsapp text not null default '', phone text not null default '',
 email text not null default '', instagram text not null default '', address text not null default '',
 city text not null default '', business_hours text not null default '',
 hero_title text not null default 'Seu próximo carro começa aqui.',
 hero_subtitle text not null default 'Encontre o carro que combina com a sua vida. Conheça nosso estoque e converse com quem entende do assunto.',
 hero_image text not null default '', updated_at timestamptz not null default now()
);
insert into public.site_settings(id) values(1);
insert into public.features(name) values ('Ar-condicionado'),('Direção elétrica'),('Multimídia'),('Câmera de ré'),('Sensor de estacionamento'),('Bancos de couro'),('Teto solar'),('Piloto automático'),('Controle de estabilidade'),('Airbags'),('Freios ABS'),('Chave presencial');

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
create trigger vehicle_updated before update on public.vehicles for each row execute function public.touch_updated_at();
create trigger settings_updated before update on public.site_settings for each row execute function public.touch_updated_at();

alter table public.vehicles enable row level security;
alter table public.vehicle_images enable row level security;
alter table public.features enable row level security;
alter table public.vehicle_features enable row level security;
alter table public.leads enable row level security;
alter table public.site_settings enable row level security;
create policy "Public published vehicles" on public.vehicles for select using (status in ('available','reserved') or public.is_admin());
create policy "Admin vehicles" on public.vehicles for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Published photos" on public.vehicle_images for select using (exists(select 1 from public.vehicles v where v.id = vehicle_id));
create policy "Admin photos" on public.vehicle_images for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Public features" on public.features for select using(true);
create policy "Admin features" on public.features for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Published features" on public.vehicle_features for select using(exists(select 1 from public.vehicles v where v.id = vehicle_id));
create policy "Admin vehicle features" on public.vehicle_features for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admin leads" on public.leads for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Public settings" on public.site_settings for select using(true);
create policy "Admin settings" on public.site_settings for update to authenticated using(public.is_admin()) with check(public.is_admin());
grant select on public.vehicles, public.vehicle_images, public.features, public.vehicle_features, public.site_settings to anon;
grant select,insert,update,delete on public.vehicles,public.vehicle_images,public.features,public.vehicle_features,public.leads to authenticated;
grant select,update on public.site_settings to authenticated;
grant select on public.admin_users to authenticated;
revoke all on public.leads from anon;

-- A public form cannot choose lead status, timestamps or read other leads.
create function public.submit_lead(p_name text, p_phone text, p_email text, p_type text, p_vehicle_id uuid, p_message text, p_details jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid; begin
 if length(p_name) not between 2 and 120 or p_phone !~ '^[0-9]{10,13}$' or length(p_email) > 254 or p_email !~ '^[^ @]+@[^ @]+\.[^ @]+$' or p_type not in ('vehicle_interest','financing','sell_vehicle','contact') or length(p_message) > 5000 or octet_length(p_details::text) > 8000 then raise exception 'Confira os campos do formulário.'; end if;
 perform pg_advisory_xact_lock(hashtext(p_phone));
 if exists(select 1 from public.leads where phone = p_phone and created_at > now() - interval '1 minute') then raise exception 'Aguarde um minuto antes de enviar novamente.'; end if;
 if p_vehicle_id is not null and not exists(select 1 from public.vehicles where id = p_vehicle_id and status in ('available','reserved')) then raise exception 'Veículo indisponível.'; end if;
 insert into public.leads(name,phone,email,type,vehicle_id,message,details) values(p_name,p_phone,p_email,p_type,p_vehicle_id,p_message,p_details) returning id into result;
 return result;
end; $$;
revoke all on function public.submit_lead(text,text,text,text,uuid,text,jsonb) from public;
grant execute on function public.submit_lead(text,text,text,text,uuid,text,jsonb) to anon, authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('vehicle-images','vehicle-images',false,10485760,array['image/jpeg','image/png','image/webp']),
 ('site-assets','site-assets',true,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "Admin storage access" on storage.objects for all to authenticated using(bucket_id in ('vehicle-images','site-assets') and public.is_admin()) with check(bucket_id in ('vehicle-images','site-assets') and public.is_admin());
create policy "Published storage photos" on storage.objects for select to anon,authenticated using(bucket_id = 'vehicle-images' and exists(select 1 from public.vehicle_images i join public.vehicles v on v.id = i.vehicle_id where i.storage_path = name and v.status in ('available','reserved')));

-- Atomic save prevents partial feature/photo replacements.
create function public.save_vehicle(p_vehicle jsonb, p_images jsonb, p_features uuid[]) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare v_id uuid := coalesce((p_vehicle->>'id')::uuid, gen_random_uuid()); img jsonb; begin
 if not public.is_admin() then raise exception 'Acesso negado.'; end if;
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
