-- ===== Workouts for the mobile app: join codes, program days, sessions, sets =====

-- Short join code a coach gives to a client (6 chars, no ambiguous letters).
-- SECURITY DEFINER so the uniqueness check sees every coach's clients, not only the caller's.
create or replace function public.gen_join_code() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.clients where join_code = code);
  end loop;
  return code;
end $$;
revoke execute on function public.gen_join_code() from public, anon;
grant execute on function public.gen_join_code() to authenticated; -- needed: it is the column default on coach inserts

alter table public.clients add column join_code text;
update public.clients set join_code = public.gen_join_code() where join_code is null;
alter table public.clients alter column join_code set default public.gen_join_code();
alter table public.clients alter column join_code set not null;
alter table public.clients add constraint clients_join_code_key unique (join_code);

alter table public.coaches add column phone text not null default '';

-- Program days: [{id, name, items:[{ex, sets, reps, rest, note}]}]
alter table public.programs add column days jsonb not null default '[]'::jsonb;

create table public.workout_sessions (
  id uuid primary key,                         -- generated on the phone, makes saving idempotent
  client_id uuid not null references public.clients(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  day_id text,
  day_name text not null default '' check (char_length(day_name) <= 120),
  started_at timestamptz not null,
  finished_at timestamptz,
  feel int check (feel between 1 and 5),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index on public.workout_sessions(client_id, started_at desc);
create index on public.workout_sessions(coach_id);
create index on public.workout_sessions(program_id);

create table public.set_logs (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  exercise_id text not null check (char_length(exercise_id) between 1 and 60),
  ex_order int not null default 0 check (ex_order between 0 and 100),
  set_index int not null check (set_index between 0 and 50),
  weight numeric(6,2) check (weight between 0 and 1000),
  reps int not null check (reps between 0 and 500),
  done_at timestamptz not null
);
create index on public.set_logs(session_id);
create index on public.set_logs(client_id, done_at desc);
create index on public.set_logs(coach_id);

alter table public.workout_sessions enable row level security;
alter table public.set_logs enable row level security;
create policy "coach reads own sessions" on public.workout_sessions for select to authenticated using (coach_id = (select auth.uid()));
create policy "coach reads own sets"     on public.set_logs         for select to authenticated using (coach_id = (select auth.uid()));

-- Failed join attempts, to slow down guessing
create table public.claim_failures (at timestamptz not null default now());
alter table public.claim_failures enable row level security;
create index on public.claim_failures(at);

-- ===== Client: exchange join code for the secret token =====
create or replace function public.client_claim(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare cl public.clients; co public.coaches; c text := upper(regexp_replace(coalesce(p_code,''), '[^A-Za-z0-9]', '', 'g'));
begin
  if (select count(*) from public.claim_failures where at > now() - interval '1 minute') >= 30 then
    raise exception 'too many requests';
  end if;
  select * into cl from public.clients where join_code = c;
  if cl.id is null then
    insert into public.claim_failures default values;
    delete from public.claim_failures where at < now() - interval '1 day';
    return null;
  end if;
  select * into co from public.coaches where id = cl.coach_id;
  return jsonb_build_object('token', cl.access_token, 'name', cl.name, 'lang', cl.lang, 'coach', co.name);
end $$;

-- ===== Client: everything the mobile app needs =====
create or replace function public.client_app_view(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare cl public.clients; co public.coaches;
begin
  select * into cl from public.clients where access_token = p_token;
  if cl.id is null then return null; end if;
  select * into co from public.coaches where id = cl.coach_id;
  return jsonb_build_object(
    'client', jsonb_build_object('id', cl.id, 'name', cl.name, 'lang', cl.lang, 'goal', cl.goal,
       'billing_type', cl.billing_type, 'price', cl.price, 'months', cl.months, 'parts', cl.parts,
       'parts_paid', cl.parts_paid, 'next_payment', cl.next_payment, 'check_day', cl.check_day),
    'coach', jsonb_build_object('name', co.name, 'card', co.card, 'phone', co.phone, 'instagram', co.instagram),
    'program', (select jsonb_build_object('id', p.id, 'name', p.name, 'days', p.days, 'legacy', p.exercises)
                from public.programs p where p.id = cl.program_id),
    'meal', (select jsonb_build_object('name', m.name, 'items', m.items) from public.meal_plans m where m.id = cl.meal_plan_id),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'day_id', s.day_id, 'day_name', s.day_name,
                  'started_at', s.started_at, 'finished_at', s.finished_at, 'feel', s.feel) order by s.started_at)
                from public.workout_sessions s where s.client_id = cl.id and s.started_at > now() - interval '120 days'), '[]'::jsonb),
    'sets', coalesce((select jsonb_agg(jsonb_build_array(l.session_id, l.exercise_id, l.ex_order, l.set_index, l.weight, l.reps, l.done_at) order by l.done_at)
                from public.set_logs l where l.client_id = cl.id and l.done_at > now() - interval '120 days'), '[]'::jsonb),
    'weights', coalesce((select jsonb_agg(jsonb_build_object('d', r.report_date, 'kg', r.weight, 'note', r.note, 'photo', r.photo_path is not null) order by r.report_date, r.created_at)
                from public.reports r where r.client_id = cl.id and r.report_date > current_date - 365), '[]'::jsonb)
  );
end $$;

-- ===== Client: save a finished (or partial) workout; safe to call again with the same session =====
create or replace function public.client_save_session(p_token text, p_session jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare cl public.clients; sid uuid; existing public.workout_sessions; n int;
begin
  select * into cl from public.clients where access_token = p_token;
  if cl.id is null then raise exception 'not found'; end if;
  sid := (p_session->>'id')::uuid;
  select * into existing from public.workout_sessions where id = sid;
  if existing.id is not null and existing.client_id <> cl.id then raise exception 'not found'; end if;
  if existing.id is null and (select count(*) from public.workout_sessions where client_id = cl.id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too many requests';
  end if;
  n := coalesce(jsonb_array_length(p_session->'sets'), 0);
  if n > 300 then raise exception 'too many sets'; end if;

  insert into public.workout_sessions (id, client_id, coach_id, program_id, day_id, day_name, started_at, finished_at, feel, note)
  values (sid, cl.id, cl.coach_id,
          (select id from public.programs where id = nullif(p_session->>'program_id','')::uuid and coach_id = cl.coach_id),
          left(p_session->>'day_id', 60), left(coalesce(p_session->>'day_name',''), 120),
          (p_session->>'started_at')::timestamptz, (p_session->>'finished_at')::timestamptz,
          nullif(p_session->>'feel','')::int, left(coalesce(p_session->>'note',''), 1000))
  on conflict (id) do update set finished_at = excluded.finished_at, feel = excluded.feel, note = excluded.note,
     day_name = excluded.day_name;

  delete from public.set_logs where session_id = sid;
  insert into public.set_logs (session_id, client_id, coach_id, exercise_id, ex_order, set_index, weight, reps, done_at)
  select sid, cl.id, cl.coach_id, left(x->>'ex', 60), coalesce((x->>'order')::int, 0), (x->>'i')::int,
         nullif(x->>'w','')::numeric, (x->>'r')::int, (x->>'at')::timestamptz
  from jsonb_array_elements(coalesce(p_session->'sets', '[]'::jsonb)) x;
  return true;
end $$;

revoke execute on function public.client_claim(text) from public;
revoke execute on function public.client_app_view(text) from public;
revoke execute on function public.client_save_session(text, jsonb) from public;
grant execute on function public.client_claim(text) to anon, authenticated;
grant execute on function public.client_app_view(text) to anon, authenticated;
grant execute on function public.client_save_session(text, jsonb) to anon, authenticated;
