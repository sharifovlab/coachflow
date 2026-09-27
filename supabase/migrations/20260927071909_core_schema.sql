-- ============ CoachFlow core schema ============
create extension if not exists pgcrypto with schema extensions;

create table public.coaches (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  slug text not null unique,
  city text not null default 'Bakı',
  instagram text not null default '',
  card text not null default '',
  bio_az text not null default '',
  bio_ru text not null default '',
  lang text not null default 'ru' check (lang in ('az','ru')),
  remind_days int not null default 1 check (remind_days between 0 and 7),
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  name_az text not null default '',
  name_ru text not null default '',
  desc_az text not null default '',
  desc_ru text not null default '',
  price numeric(10,2) not null default 0 check (price >= 0),
  type text not null default 'monthly' check (type in ('monthly','package')),
  months int not null default 1 check (months between 1 and 24),
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  name text not null,
  exercises jsonb not null default '[]'::jsonb,   -- [{n:"Squat", s:"4x10"}]
  created_at timestamptz not null default now()
);

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  name text not null,
  items jsonb not null default '[]'::jsonb,       -- [{s:"b", f:"oat", g:250}]
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  name text not null,
  phone text not null default '',
  lang text not null default 'az' check (lang in ('az','ru')),
  goal text not null default 'fit' check (goal in ('lose','gain','fit','rehab')),
  billing_type text not null default 'monthly' check (billing_type in ('monthly','package','installment')),
  price numeric(10,2) not null default 0 check (price >= 0),
  months int not null default 1 check (months between 1 and 24),
  parts int not null default 1 check (parts between 1 and 24),
  parts_paid int not null default 0 check (parts_paid >= 0),
  next_payment date,
  check_day int not null default 0 check (check_day between 0 and 6),
  program_id uuid references public.programs(id) on delete set null,
  meal_plan_id uuid references public.meal_plans(id) on delete set null,
  access_token text not null unique default encode(extensions.gen_random_bytes(18),'hex'),
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  paid_on date not null default current_date,
  method text not null default 'card' check (method in ('card','cash','online')),
  part int,
  parts int,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  report_date date not null default current_date,
  weight numeric(5,1) check (weight between 20 and 400),
  note text not null default '' check (char_length(note) <= 1000),
  photo_path text,
  from_client boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.workout_log (
  client_id uuid not null references public.clients(id) on delete cascade,
  day date not null,
  done int[] not null default '{}',
  primary key (client_id, day)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  phone text not null check (char_length(phone) between 7 and 40),
  goal text not null default 'fit' check (goal in ('lose','gain','fit','rehab')),
  level text not null default 'new' check (level in ('new','some','pro')),
  service_id uuid references public.services(id) on delete set null,
  lang text not null default 'az' check (lang in ('az','ru')),
  health text not null default '' check (char_length(health) <= 500),
  consent boolean not null check (consent),
  status text not null default 'new' check (status in ('new','converted','rejected')),
  created_at timestamptz not null default now()
);

create table public.todo_done (
  coach_id uuid not null references public.coaches(id) on delete cascade,
  day date not null,
  key text not null,
  primary key (coach_id, day, key)
);

-- indexes on foreign keys
create index on public.services(coach_id);
create index on public.programs(coach_id);
create index on public.meal_plans(coach_id);
create index on public.clients(coach_id);
create index on public.clients(program_id);
create index on public.clients(meal_plan_id);
create index on public.payments(coach_id);
create index on public.payments(client_id);
create index on public.reports(coach_id);
create index on public.reports(client_id);
create index on public.leads(coach_id);
create index on public.leads(service_id);

-- ============ Row level security: a coach sees only their own rows ============
alter table public.coaches     enable row level security;
alter table public.services    enable row level security;
alter table public.programs    enable row level security;
alter table public.meal_plans  enable row level security;
alter table public.clients     enable row level security;
alter table public.payments    enable row level security;
alter table public.reports     enable row level security;
alter table public.workout_log enable row level security;
alter table public.leads       enable row level security;
alter table public.todo_done   enable row level security;

create policy "own profile read"   on public.coaches for select to authenticated using (id = (select auth.uid()));
create policy "own profile update" on public.coaches for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['services','programs','meal_plans','clients','payments','reports','leads','todo_done'] loop
    execute format('create policy "own rows" on public.%I for all to authenticated using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()))', t);
  end loop;
end $$;

create policy "own clients log" on public.workout_log for all to authenticated
  using (exists (select 1 from public.clients c where c.id = client_id and c.coach_id = (select auth.uid())))
  with check (exists (select 1 from public.clients c where c.id = client_id and c.coach_id = (select auth.uid())));

-- payments/reports/leads must point at the coach's own client/service
create or replace function public.check_same_coach() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name in ('payments','reports') then
    if not exists (select 1 from public.clients c where c.id = new.client_id and c.coach_id = new.coach_id) then
      raise exception 'client does not belong to coach';
    end if;
  end if;
  if tg_table_name = 'clients' then
    if new.program_id is not null and not exists (select 1 from public.programs p where p.id = new.program_id and p.coach_id = new.coach_id) then
      raise exception 'program does not belong to coach';
    end if;
    if new.meal_plan_id is not null and not exists (select 1 from public.meal_plans m where m.id = new.meal_plan_id and m.coach_id = new.coach_id) then
      raise exception 'meal plan does not belong to coach';
    end if;
  end if;
  return new;
end $$;
create trigger payments_same_coach before insert or update on public.payments for each row execute function public.check_same_coach();
create trigger reports_same_coach  before insert or update on public.reports  for each row execute function public.check_same_coach();
create trigger clients_same_coach  before insert or update on public.clients  for each row execute function public.check_same_coach();

-- ============ New coach signup: create profile + starter content ============
create or replace function public.handle_new_coach() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  s text;
  pname text := coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1));
  plang text := case when new.raw_user_meta_data->>'lang' = 'az' then 'az' else 'ru' end;
begin
  base := lower(regexp_replace(split_part(new.email,'@',1), '[^a-zA-Z0-9]+', '', 'g'));
  if base = '' then base := 'coach'; end if;
  s := base;
  while exists (select 1 from public.coaches where slug = s) loop
    s := base || floor(random()*9000+1000)::int::text;
  end loop;

  insert into public.coaches (id, name, slug, lang) values (new.id, pname, s, plang);

  insert into public.services (coach_id, name_az, name_ru, desc_az, desc_ru, price, type, months, sort) values
   (new.id,'Onlayn müşayiət · 1 ay','Онлайн-ведение · 1 месяц','Fərdi proqram, qidalanma planı, həftəlik hesabat və WhatsApp dəstəyi.','Индивидуальная программа, план питания, еженедельный отчёт и поддержка в WhatsApp.',120,'monthly',1,1),
   (new.id,'Onlayn müşayiət · 3 ay','Онлайн-ведение · 3 месяца','Eyni xidmət, 3 ay üçün sərfəli qiymətə.','То же ведение на 3 месяца по выгодной цене.',330,'package',3,2);

  insert into public.programs (coach_id, name, exercises) values
   (new.id, case when plang='az' then 'Arıqlama · 3 gün' else 'Похудение · 3 дня' end,
    case when plang='az'
      then '[{"n":"Ştanqla squat","s":"4×10"},{"n":"Yuxarı blok çəkişi","s":"3×12"},{"n":"Hantelləri uzanaraq sıxma","s":"3×10"},{"n":"Planka","s":"3×45 san"}]'::jsonb
      else '[{"n":"Приседания со штангой","s":"4×10"},{"n":"Тяга верхнего блока","s":"3×12"},{"n":"Жим гантелей лёжа","s":"3×10"},{"n":"Планка","s":"3×45 сек"}]'::jsonb end),
   (new.id, case when plang='az' then 'Evdə inventarsız' else 'Дома без инвентаря' end,
    case when plang='az'
      then '[{"n":"Lunge","s":"3×12"},{"n":"Şınav","s":"3×15"},{"n":"Qluteal körpü","s":"3×15"},{"n":"Berpi","s":"3×10"}]'::jsonb
      else '[{"n":"Выпады","s":"3×12"},{"n":"Отжимания","s":"3×15"},{"n":"Ягодичный мост","s":"3×15"},{"n":"Бёрпи","s":"3×10"}]'::jsonb end);

  insert into public.meal_plans (coach_id, name, items) values
   (new.id, case when plang='az' then 'Arıqlama' else 'Похудение' end,
    '[{"s":"b","f":"oat","g":250},{"s":"b","f":"egg","g":100},{"s":"b","f":"apple","g":150},{"s":"l","f":"chicken","g":150},{"s":"l","f":"grechka","g":200},{"s":"l","f":"salad","g":200},{"s":"s","f":"kesmik","g":150},{"s":"s","f":"walnut","g":15},{"s":"d","f":"kutum","g":200},{"s":"d","f":"salad","g":200},{"s":"d","f":"oil","g":10}]'::jsonb);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_coach();

revoke execute on function public.handle_new_coach() from public, anon, authenticated;
revoke execute on function public.check_same_coach() from public, anon, authenticated;
