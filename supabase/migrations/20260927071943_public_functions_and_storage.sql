-- ===== Public sales page: read by slug =====
create or replace function public.get_public_page(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'name', c.name, 'city', c.city, 'instagram', c.instagram,
    'bio_az', c.bio_az, 'bio_ru', c.bio_ru, 'lang', c.lang,
    'services', coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name_az',s.name_az,'name_ru',s.name_ru,'desc_az',s.desc_az,'desc_ru',s.desc_ru,'price',s.price,'type',s.type,'months',s.months) order by s.sort, s.created_at)
                          from public.services s where s.coach_id = c.id), '[]'::jsonb))
  from public.coaches c where c.slug = lower(p_slug);
$$;

-- ===== Public sales page: submit a lead =====
create or replace function public.submit_lead(p_slug text, p_name text, p_phone text, p_goal text, p_level text,
  p_service uuid, p_lang text, p_health text, p_consent boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  if not coalesce(p_consent,false) then raise exception 'consent required'; end if;
  select id into cid from public.coaches where slug = lower(p_slug);
  if cid is null then raise exception 'coach not found'; end if;
  if (select count(*) from public.leads where coach_id = cid and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'too many requests';
  end if;
  if (select count(*) from public.leads where coach_id = cid and phone = trim(p_phone) and created_at > now() - interval '1 day') >= 2 then
    return true; -- silently ignore duplicates
  end if;
  insert into public.leads (coach_id, name, phone, goal, level, service_id, lang, health, consent)
  values (cid, trim(p_name), trim(p_phone),
          case when p_goal in ('lose','gain','fit','rehab') then p_goal else 'fit' end,
          case when p_level in ('new','some','pro') then p_level else 'new' end,
          (select id from public.services where id = p_service and coach_id = cid),
          case when p_lang = 'ru' then 'ru' else 'az' end,
          left(coalesce(p_health,''),500), true);
  return true;
end $$;

-- ===== Client link: everything the client screen needs =====
create or replace function public.client_view(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare cl public.clients; co public.coaches;
begin
  select * into cl from public.clients where access_token = p_token;
  if cl.id is null then return null; end if;
  select * into co from public.coaches where id = cl.coach_id;
  return jsonb_build_object(
    'name', cl.name, 'lang', cl.lang, 'billing_type', cl.billing_type, 'price', cl.price, 'months', cl.months,
    'parts', cl.parts, 'parts_paid', cl.parts_paid, 'next_payment', cl.next_payment,
    'coach', jsonb_build_object('name', co.name, 'card', co.card, 'phone_hint', co.instagram),
    'program', (select jsonb_build_object('name', p.name, 'exercises', p.exercises) from public.programs p where p.id = cl.program_id),
    'meal', (select jsonb_build_object('name', m.name, 'items', m.items) from public.meal_plans m where m.id = cl.meal_plan_id),
    'done_today', coalesce((select to_jsonb(w.done) from public.workout_log w where w.client_id = cl.id and w.day = current_date), '[]'::jsonb),
    'reports', coalesce((select jsonb_agg(jsonb_build_object('d', r.report_date, 'kg', r.weight, 'note', r.note) order by r.report_date, r.created_at)
                         from (select * from public.reports where client_id = cl.id order by report_date desc, created_at desc limit 30) r), '[]'::jsonb)
  );
end $$;

create or replace function public.client_toggle_exercise(p_token text, p_index int, p_done boolean) returns int[]
language plpgsql security definer set search_path = '' as $$
declare cid uuid; res int[];
begin
  select id into cid from public.clients where access_token = p_token;
  if cid is null then raise exception 'not found'; end if;
  if p_index < 0 or p_index > 50 then raise exception 'bad index'; end if;
  insert into public.workout_log (client_id, day, done) values (cid, current_date, '{}')
    on conflict (client_id, day) do nothing;
  if p_done then
    update public.workout_log set done = (select array_agg(distinct x order by x) from unnest(done || p_index) x)
      where client_id = cid and day = current_date returning done into res;
  else
    update public.workout_log set done = array_remove(done, p_index)
      where client_id = cid and day = current_date returning done into res;
  end if;
  return res;
end $$;

create or replace function public.client_submit_report(p_token text, p_weight numeric, p_note text, p_photo text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare cl public.clients;
begin
  select * into cl from public.clients where access_token = p_token;
  if cl.id is null then raise exception 'not found'; end if;
  if (select count(*) from public.reports where client_id = cl.id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'too many reports today';
  end if;
  if p_photo is not null and p_photo not like p_token || '/%' then raise exception 'bad photo path'; end if;
  insert into public.reports (coach_id, client_id, report_date, weight, note, photo_path, from_client)
  values (cl.coach_id, cl.id, current_date, p_weight, left(coalesce(p_note,''),1000), p_photo, true);
  return true;
end $$;

create or replace function public.client_token_ok(p_token text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.clients where access_token = p_token);
$$;

-- ===== Coach: record a payment and move the next due date (runs with coach's own rights) =====
create or replace function public.record_payment(p_client uuid, p_amount numeric, p_paid_on date, p_method text) returns void
language plpgsql security invoker set search_path = '' as $$
declare cl public.clients; newpaid int;
begin
  select * into cl from public.clients where id = p_client; -- RLS limits to own clients
  if cl.id is null then raise exception 'client not found'; end if;
  if cl.billing_type = 'installment' then
    newpaid := cl.parts_paid + 1;
    insert into public.payments (coach_id, client_id, amount, paid_on, method, part, parts)
      values (cl.coach_id, cl.id, p_amount, p_paid_on, p_method, newpaid, cl.parts);
    update public.clients set parts_paid = newpaid,
      next_payment = case when newpaid >= parts then null else (coalesce(next_payment, current_date) + interval '1 month')::date end
      where id = cl.id;
  else
    insert into public.payments (coach_id, client_id, amount, paid_on, method)
      values (cl.coach_id, cl.id, p_amount, p_paid_on, p_method);
    update public.clients set next_payment = (coalesce(next_payment, current_date)
      + make_interval(months => case when billing_type = 'package' then months else 1 end))::date
      where id = cl.id;
  end if;
end $$;

revoke execute on function public.get_public_page(text) from public;
revoke execute on function public.submit_lead(text,text,text,text,text,uuid,text,text,boolean) from public;
revoke execute on function public.client_view(text) from public;
revoke execute on function public.client_toggle_exercise(text,int,boolean) from public;
revoke execute on function public.client_submit_report(text,numeric,text,text) from public;
revoke execute on function public.client_token_ok(text) from public;
revoke execute on function public.record_payment(uuid,numeric,date,text) from public, anon;

grant execute on function public.get_public_page(text) to anon, authenticated;
grant execute on function public.submit_lead(text,text,text,text,text,uuid,text,text,boolean) to anon, authenticated;
grant execute on function public.client_view(text) to anon, authenticated;
grant execute on function public.client_toggle_exercise(text,int,boolean) to anon, authenticated;
grant execute on function public.client_submit_report(text,numeric,text,text) to anon, authenticated;
grant execute on function public.client_token_ok(text) to anon, authenticated;
grant execute on function public.record_payment(uuid,numeric,date,text) to authenticated;

-- ===== Photo storage (private bucket) =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "client uploads with valid link" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'report-photos' and public.client_token_ok((storage.foldername(name))[1]));

create policy "coach reads own clients photos" on storage.objects for select to authenticated
  using (bucket_id = 'report-photos' and exists (
    select 1 from public.clients c where c.access_token = (storage.foldername(name))[1] and c.coach_id = (select auth.uid())));

create policy "coach deletes own clients photos" on storage.objects for delete to authenticated
  using (bucket_id = 'report-photos' and exists (
    select 1 from public.clients c where c.access_token = (storage.foldername(name))[1] and c.coach_id = (select auth.uid())));
