-- New coaches get starter programs built from the exercise catalog (programs.days), so the mobile app
-- can show muscle coverage from day one. Legacy text list (programs.exercises) is kept for the web app.
create or replace function public.handle_new_coach() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  s text;
  pname text := coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1));
  plang text := case when new.raw_user_meta_data->>'lang' = 'az' then 'az' else 'ru' end;
  az boolean := (plang = 'az');
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

  insert into public.programs (coach_id, name, exercises, days) values
   (new.id,
    case when az then 'Bütün bədən · 3 gün' else 'Всё тело · 3 дня' end,
    case when az
      then '[{"n":"Ştanqla squat","s":"4×8-10"},{"n":"Ştanqı uzanaraq sıxma","s":"4×8-10"},{"n":"Hantellə dartma","s":"3×10-12"},{"n":"Yana hantel qaldırma","s":"3×12-15"},{"n":"Planka","s":"3×45 san"}]'::jsonb
      else '[{"n":"Приседания со штангой","s":"4×8-10"},{"n":"Жим штанги лёжа","s":"4×8-10"},{"n":"Тяга гантели одной рукой","s":"3×10-12"},{"n":"Махи гантелями в стороны","s":"3×12-15"},{"n":"Планка","s":"3×45 сек"}]'::jsonb end,
    jsonb_build_array(
      jsonb_build_object('id','a','name', case when az then 'Gün A' else 'День A' end, 'items', '[
        {"ex":"back_squat","sets":4,"reps":"8-10","rest":120,"note":""},
        {"ex":"bench_press","sets":4,"reps":"8-10","rest":120,"note":""},
        {"ex":"db_row","sets":3,"reps":"10-12","rest":90,"note":""},
        {"ex":"lateral_raise","sets":3,"reps":"12-15","rest":60,"note":""},
        {"ex":"plank","sets":3,"reps":"45","rest":60,"note":""}]'::jsonb),
      jsonb_build_object('id','b','name', case when az then 'Gün B' else 'День B' end, 'items', '[
        {"ex":"romanian_deadlift","sets":4,"reps":"8-10","rest":120,"note":""},
        {"ex":"overhead_press","sets":3,"reps":"8-10","rest":90,"note":""},
        {"ex":"lat_pulldown","sets":3,"reps":"10-12","rest":90,"note":""},
        {"ex":"lunge","sets":3,"reps":"10","rest":90,"note":""},
        {"ex":"db_curl","sets":3,"reps":"12","rest":60,"note":""},
        {"ex":"triceps_pushdown","sets":3,"reps":"12","rest":60,"note":""}]'::jsonb),
      jsonb_build_object('id','c','name', case when az then 'Gün C' else 'День C' end, 'items', '[
        {"ex":"leg_press","sets":4,"reps":"10-12","rest":120,"note":""},
        {"ex":"incline_db_press","sets":3,"reps":"10","rest":90,"note":""},
        {"ex":"seated_cable_row","sets":3,"reps":"10-12","rest":90,"note":""},
        {"ex":"hip_thrust","sets":3,"reps":"10","rest":90,"note":""},
        {"ex":"face_pull","sets":3,"reps":"15","rest":60,"note":""},
        {"ex":"hanging_leg_raise","sets":3,"reps":"12","rest":60,"note":""}]'::jsonb))),
   (new.id,
    case when az then 'Evdə inventarsız' else 'Дома без инвентаря' end,
    case when az
      then '[{"n":"Şınav","s":"3×15"},{"n":"Lunge","s":"3×12"},{"n":"Qluteal körpü","s":"3×15"},{"n":"Berpi","s":"3×10"},{"n":"Planka","s":"3×45 san"}]'::jsonb
      else '[{"n":"Отжимания","s":"3×15"},{"n":"Выпады","s":"3×12"},{"n":"Ягодичный мост","s":"3×15"},{"n":"Бёрпи","s":"3×10"},{"n":"Планка","s":"3×45 сек"}]'::jsonb end,
    jsonb_build_array(
      jsonb_build_object('id','home','name', case when az then 'Ev məşqi' else 'Домашняя' end, 'items', '[
        {"ex":"push_up","sets":3,"reps":"15","rest":60,"note":""},
        {"ex":"lunge","sets":3,"reps":"12","rest":60,"note":""},
        {"ex":"glute_bridge","sets":3,"reps":"15","rest":60,"note":""},
        {"ex":"burpee","sets":3,"reps":"10","rest":90,"note":""},
        {"ex":"plank","sets":3,"reps":"45","rest":45,"note":""},
        {"ex":"side_plank","sets":3,"reps":"30","rest":45,"note":""}]'::jsonb)));

  insert into public.meal_plans (coach_id, name, items) values
   (new.id, case when az then 'Arıqlama' else 'Похудение' end,
    '[{"s":"b","f":"oat","g":250},{"s":"b","f":"egg","g":100},{"s":"b","f":"apple","g":150},{"s":"l","f":"chicken","g":150},{"s":"l","f":"grechka","g":200},{"s":"l","f":"salad","g":200},{"s":"s","f":"kesmik","g":150},{"s":"s","f":"walnut","g":15},{"s":"d","f":"kutum","g":200},{"s":"d","f":"salad","g":200},{"s":"d","f":"oil","g":10}]'::jsonb);
  return new;
end $$;
