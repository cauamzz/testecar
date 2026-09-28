-- Bounded pages: filtering/counting happens in PostgreSQL, never over a full browser inventory.
create function public.inventory_text(value text) returns text language sql immutable parallel safe
set search_path='' as $$ select lower(translate(coalesce(value,''),'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ','aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')); $$;
create index vehicles_public_order_idx on public.vehicles(created_at desc,id) where status in ('available','reserved');
create index vehicles_public_price_order_idx on public.vehicles(price,id) where status in ('available','reserved');
create index vehicles_public_mileage_order_idx on public.vehicles(mileage,id) where status in ('available','reserved');
create index vehicle_features_filter_idx on public.vehicle_features(feature_id,vehicle_id);

create function public.inventory_page(p_filters jsonb default '{}', p_page int default 1, p_size int default 12, p_admin boolean default false, p_options boolean default false)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare size int := greatest(1,least(coalesce(p_size,12),48)); requested int := greatest(1,least(coalesce(p_page,1),100000)); result jsonb;
begin
 if p_admin and not public.has_permission('stock.read') then raise exception 'Acesso negado.'; end if;
 if jsonb_typeof(p_filters) <> 'object' or octet_length(p_filters::text)>4096 then raise exception 'Filtros inválidos.'; end if;
 with filtered as materialized (
 select v.id,v.slug,v.brand,v.model,v.version,v.year_manufacture,v.year_model,v.price,v.mileage,v.fuel,v.transmission,v.steering,v.body_type,v.plate_final,v.status,v.featured,v.created_at
 from public.vehicles v
 where (p_admin or v.status in ('available','reserved'))
 and (not p_admin or coalesce(p_filters->>'status','all')='all' or v.status=p_filters->>'status')
 and (coalesce(p_filters->>'q','')='' or strpos(public.inventory_text(v.brand||' '||v.model||' '||v.version),public.inventory_text(p_filters->>'q'))>0)
 and not exists(select 1 from jsonb_each_text(p_filters) f where f.key in ('brand','model','version','body_type','fuel','transmission','steering','color') and f.value<>'' and public.inventory_text(to_jsonb(v)->>f.key)<>public.inventory_text(f.value))
 and (coalesce(p_filters->>'year_min','')='' or v.year_model >= (p_filters->>'year_min')::numeric)
 and (coalesce(p_filters->>'year_max','')='' or v.year_model <= (p_filters->>'year_max')::numeric)
 and (coalesce(p_filters->>'price_min','')='' or v.price >= (p_filters->>'price_min')::numeric)
 and (coalesce(p_filters->>'price_max','')='' or v.price <= (p_filters->>'price_max')::numeric)
 and (coalesce(p_filters->>'mileage_max','')='' or v.mileage <= (p_filters->>'mileage_max')::numeric)
 and (coalesce(p_filters->>'feature','')='' or exists(select 1 from public.vehicle_features f where f.vehicle_id=v.id and f.feature_id::text=p_filters->>'feature'))
 and (coalesce(p_filters->>'exclude','')='' or v.id::text<>p_filters->>'exclude')
 and (coalesce(p_filters->>'id','')='' or v.id::text=p_filters->>'id')
 ), totals as (select count(*)::int total from filtered), paging as (
 select total,least(requested,greatest(1,ceil(total::numeric/size)::int)) page from totals
 ), items as (
 select v.* from filtered v order by
 case when coalesce(p_filters->>'preferred_body','')<>'' then (v.body_type=p_filters->>'preferred_body')::int end desc,
 case when p_filters->>'sort'='featured' then v.featured::int end desc,
 case when p_filters->>'sort'='price_asc' then v.price end asc,
 case when p_filters->>'sort'='price_desc' then v.price end desc,
 case when p_filters->>'sort'='mileage' then v.mileage end asc,
 v.created_at desc,v.id
 limit size offset (select (page-1)*size from paging)
 )
 select jsonb_build_object('total',p.total,'page',p.page,'pageSize',size,'vehicles',coalesce((
 select jsonb_agg(case when p_options then jsonb_build_object('id',v.id,'brand',v.brand,'model',v.model,'year_model',v.year_model,'price',v.price)
 else to_jsonb(v)||jsonb_build_object('vehicle_images',coalesce((select jsonb_agg(to_jsonb(i)) from (
 select id,vehicle_id,storage_path,position,is_cover from public.vehicle_images where vehicle_id=v.id order by is_cover desc,position,id limit 1
 ) i),'[]'::jsonb)) end) from items v),'[]'::jsonb)) into result from paging p;
 return result;
end; $$;
revoke all on function public.inventory_page(jsonb,int,int,boolean,boolean) from public;
grant execute on function public.inventory_page(jsonb,int,int,boolean,boolean) to anon,authenticated;

create function public.inventory_facets(p_brand text default '',p_model text default '') returns jsonb
language sql stable security invoker set search_path='' as $$
 with visible as materialized (select brand,model,version,body_type,fuel,transmission,steering,color,price,year_model from public.vehicles where status in ('available','reserved'))
 select jsonb_build_object(
 'brand',coalesce((select jsonb_agg(x order by x) from (select distinct brand x from visible where brand<>'') a),'[]'),
 'model',coalesce((select jsonb_agg(x order by x) from (select distinct model x from visible where model<>'' and p_brand<>'' and brand=p_brand) a),'[]'),
 'version',coalesce((select jsonb_agg(x order by x) from (select distinct version x from visible where version<>'' and p_brand<>'' and p_model<>'' and brand=p_brand and model=p_model) a),'[]'),
 'body_type',coalesce((select jsonb_agg(x order by x) from (select distinct body_type x from visible where body_type<>'') a),'[]'),
 'fuel',coalesce((select jsonb_agg(x order by x) from (select distinct fuel x from visible where fuel<>'') a),'[]'),
 'transmission',coalesce((select jsonb_agg(x order by x) from (select distinct transmission x from visible where transmission<>'') a),'[]'),
 'steering',coalesce((select jsonb_agg(x order by x) from (select distinct steering x from visible where steering<>'') a),'[]'),
 'color',coalesce((select jsonb_agg(x order by x) from (select distinct color x from visible where color<>'') a),'[]'),
 'maxPrice',greatest(500000,coalesce((select max(price) from visible),0)),
 'minYear',least(1980,coalesce((select min(year_model) from visible),1980)),
 'maxYear',greatest(extract(year from now())::int+1,coalesce((select max(year_model) from visible),0)),
 'features',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'name',f.name) order by f.name) from public.features f where exists(select 1 from public.vehicle_features vf join public.vehicles v on v.id=vf.vehicle_id where vf.feature_id=f.id and v.status in ('available','reserved'))),'[]'));
$$;
revoke all on function public.inventory_facets(text,text) from public;
grant execute on function public.inventory_facets(text,text) to anon,authenticated;

create function public.stock_counts() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if not public.has_permission('stock.read') then raise exception 'Acesso negado.'; end if;
 return (select coalesce(jsonb_object_agg(status,n),'{}') from (select status,count(*) n from public.vehicles group by status) counts);
end; $$;
revoke all on function public.stock_counts() from public;
grant execute on function public.stock_counts() to authenticated;
