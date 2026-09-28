-- Enforced at the RPC boundary, including direct calls that bypass Next.js.
create index if not exists leads_created_at_security_idx on public.leads(created_at);
create index if not exists leads_phone_created_at_security_idx on public.leads(phone, created_at);

create or replace function public.submit_lead(p_name text, p_phone text, p_email text, p_type text, p_vehicle_id uuid, p_message text, p_details jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid; begin
 if p_name is null or p_phone is null or p_email is null or p_type is null or p_message is null or p_details is null
 or length(btrim(p_name)) not between 2 and 120 or p_phone !~ '^[0-9]{10,13}$'
 or length(p_email) > 254 or p_email !~ '^[^ @]+@[^ @]+\.[^ @]+$'
 or p_type not in ('vehicle_interest','financing','sell_vehicle','contact')
 or length(p_message) > 5000 or jsonb_typeof(p_details) <> 'object' or octet_length(p_details::text) > 8000
 then raise exception 'Confira os campos do formulário.'; end if;
 -- Serialize acceptance, so concurrent requests cannot bypass the shared cap.
 perform pg_advisory_xact_lock(270005, 1);
 if (select count(*) from public.leads where created_at > now() - interval '1 minute') >= 30
 or (select count(*) from public.leads where created_at > now() - interval '1 day') >= 500
 or exists(select 1 from public.leads where phone = p_phone and created_at > now() - interval '1 minute')
 or (select count(*) from public.leads where phone = p_phone and created_at > now() - interval '1 hour') >= 5
 then raise exception 'Aguarde antes de enviar novamente.'; end if;
 if p_vehicle_id is not null and not exists(select 1 from public.vehicles where id = p_vehicle_id and status in ('available','reserved')) then raise exception 'Veículo indisponível.'; end if;
 insert into public.leads(name,phone,email,type,vehicle_id,message,details) values(btrim(p_name),p_phone,p_email,p_type,p_vehicle_id,p_message,p_details) returning id into result;
 return result;
end; $$;
revoke all on function public.submit_lead(text,text,text,text,uuid,text,jsonb) from public;
grant execute on function public.submit_lead(text,text,text,text,uuid,text,jsonb) to anon, authenticated;
