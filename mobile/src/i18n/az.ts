// Azerbaijani strings. Must contain every key of ru.ts.
import type { ru } from './ru';

export const az: Record<keyof typeof ru, string> = {
  // tabs & common
  tab_today: 'Bu gün', tab_body: 'Bədən', tab_progress: 'İrəliləyiş', tab_me: 'Mən',
  tab_clients: 'Müştərilər', tab_programs: 'Proqramlar', tab_money: 'Pul',
  back: 'Geri', close: 'Bağla', cancel: 'Ləğv et', save: 'Yadda saxla', saved: 'Yadda saxlanıldı', delete: 'Sil', done: 'Hazır',
  loading: 'Yüklənir…', err_network: 'Bağlantı yoxdur. Yenidən cəhd edin', copied: 'Kopyalandı', search: 'Axtarış', new: 'Yeni',
  kg: 'kq', t: 't', min: 'dəq', days_short: 'gün', today: 'Bu gün', hi: 'Salam, {name}', settings: 'Ayarlar',
  name: 'Ad', phone: 'Telefon', language: 'Dil', skip: 'Keç', remove: 'Çıxar', replace: 'Dəyiş', photo: 'foto', photos: 'Fotolar',
  workout: 'Məşq', exercises: 'Hərəkətlər', sets: 'Setlər', reps: 'Təkrar', rest: 'İstirahət', weight: 'Çəki', time: 'Vaxt', volume: 'Həcm',
  // welcome / auth / join
  welcome_title: 'Məşq et və inkişafını gör',
  welcome_sub: 'Məşqçidən proqram, hər set bir toxunuşla və gördüyün işi göstərən əzələ xəritəsi.',
  welcome_client: 'Müştəriyəm — kodum var', welcome_coach: 'Məşqçiyəm',
  join_title: 'Məşqçidən kod', join_sub: '6 simvol. Məşqçi onu WhatsApp-da göndərib.', join_go: 'Daxil ol',
  join_bad: 'Belə kod yoxdur. Məşqçinizdən yoxlayın', join_limit: 'Çox cəhd oldu. Bir dəqiqə gözləyin',
  join_hello: 'Salam, {name}!', join_coach: 'Məşqçi {coach} sənin üçün plan hazırlayıb',
  auth_in_title: 'Xoş gəldiniz', auth_up_title: 'Məşqçi hesabı', auth_sub: 'CoachFlow saytındakı eyni hesab.',
  auth_in: 'Daxil ol', auth_up: 'Yarat', auth_name: 'Adınız', auth_pass: 'Şifrə (ən az 6 simvol)',
  auth_wrong: 'E-poçt və ya şifrə yanlışdır', auth_confirm: 'Məktub göndərdik — e-poçtu təsdiqləyib daxil olun',
  // client today
  week_done: 'Həftə tamamlandı: {n} məşq. Belə davam!',
  week_left: 'Həftənin hədəfinə {n} məşq qalıb ({goal})', streak: 'Seriya', streak_title: 'Seriya: {n} həftə',
  streak_explain: 'Ən azı {goal} dəfə məşq etdiyiniz həftə sayılır. İstirahət günləri seriyanı qırmır — bərpa da inkişafın bir hissəsidir.',
  streak_week: 'Bu həftə: {n} / {goal}',
  pending_sync: '{n} məşq internet gözləyir',
  in_progress: 'Məşq davam edir', sets_n: '{n} set', next_workout: 'Növbəti',
  day_of: '{n}-ci gün / {total}', day_n: '{n}-ci gün', exercises_n: '{n} hərəkət',
  no_program: 'Hələ proqram yoxdur', no_program_sub: 'Məşqçi tezliklə əlavə edəcək. Hələlik sərbəst məşq edə bilərsiniz.',
  targets: 'Bu gün işləyəcək', ready_short: 'bərpa olunub', ready_pct: '{n}% hazır',
  continue: 'Davam et', start: 'Məşqə başla', free_workout: 'Sərbəst məşq',
  report_day: 'Bu gün hesabat günüdür', report_day_sub: 'Çəkinizi ölçüb 20 saniyəyə məşqçiyə göndərin',
  readiness: 'Əzələlərin hazırlığı', open_map: 'Xəritə', payment: 'Ödəniş',
  pay_overdue: '{n} gün gecikib', pay_today: 'Ödəniş bu gün', pay_in: '{n} gün sonra',
  last_workout: 'Son məşq', report_now: 'Hesabat göndər', offline_first_load: 'İlk yükləmə üçün internet lazımdır.',
  // report
  report_title: 'Məşqçiyə hesabat', report_sub: 'Səhər ac qarına çəki ən dəqiqidir. Fotonu yalnız məşqçi görür.',
  report_note_ph: 'Özünüzü necə hiss edirsiniz, yuxu, qidalanma?', report_photo: 'Foto əlavə et', report_photo_change: 'Fotonu dəyiş',
  report_photo_private: 'Yalnız məşqçiniz görür', report_send: 'Göndər', report_sent: 'Hesabat göndərildi',
  report_photo_fail: 'Hesabat göndərildi, foto yüklənmədi',
  // workout
  no_active: 'Aktiv məşq yoxdur', add_exercise: 'Hərəkət əlavə et', set_done: '{n}-ci set hazırdır',
  finish_workout: 'Məşqi bitir', next_exercise: 'Növbəti hərəkət', ex_of: 'Hərəkət {n} / {total}',
  plan_line: 'Plan: {sets} × {reps} · istirahət {rest} san', set_n: '{n}-ci set', last_time: 'Keçən dəfə', first_time: 'İlk dəfədir — rahat çəki seçin',
  bodyweight: 'öz çəkisi', ex_complete: 'Hərəkət tamamlandı', up_next: 'Sonra: {name}', last_one: 'Bu, son hərəkət idi',
  one_more_set: 'Daha bir set', undo_set: 'Son seti ləğv et', free_title: 'Sərbəst məşq', free_sub: 'Hərəkətləri yol boyu əlavə edin — əzələ yükünü biz hesablayacağıq.',
  pr_live: 'Yeni rekord!', next_set: 'Sonra: {n}-ci set', exit_title: 'Məşqdən çıxırsınız?', finish_save: 'Bitir və yadda saxla',
  continue_later: 'Sonra davam et', discard: 'Məşqi sil',
  // done
  done_title: 'Məşq tamamlandı', done_pr_title: 'Rekord var!', new_record: 'Yeni rekord', was: 'əvvəl',
  how_was_it: 'Necə keçdi?', feel_1: 'Çətinliklə', feel_2: 'Ağır', feel_3: 'Normal', feel_4: 'Yaxşı', feel_5: 'Əla',
  synced: 'Məşqçi məşqi görür', syncing: 'Göndərilir…', saved_offline: 'Telefonda saxlanıldı — internet olanda göndərəcəyik',
  // body
  body_title: 'Əzələ xəritəsi', m_load: 'Yük', m_ready: 'Hazırlıq', r_today: 'Bu gün', r_week: 'Həftə', r_7: '7 gün', r_30: '30 gün',
  ready_explain: 'Yaşıl əzələlər bərpa olunub, narıncılar son məşqlərdən hələ yorğundur.',
  legend_load: 'çox', legend_ready: 'yorğun', front: 'Öndən', back_view: 'Arxadan', flip: 'Çevir', tap_muscle: 'Əzələyə toxunun · sürüşdürün — çevirin',
  insight_title: 'Həftəlik disbalans', insight_text: '{weak} {strong} yükünün yalnız {pct}%-ni alıb. Bir neçə set əlavə edin — bu, oynaqları və qaməti qoruyur.',
  most_loaded: 'Ən çox işləyənlər', nothing_in_range: 'Bu dövrdə məşq yoxdur', recovering_now: 'Hələ bərpa olunur',
  all_ready: 'Bütün əzələlər hazırdır', sets_short: 'set', ready_in: '~{h} saata hazır', last_trained: 'Sonuncu dəfə: {when}',
  never_trained: 'Hələ məşq olunmayıb', what_hit_it: 'Nə yükləyib', try_these: 'Bunları yoxlayın',
  // progress
  weight_trend: 'Çəki (trend)', weight_empty: 'Həftədə bir dəfə çəkinizi qeyd edin — burada su dəyişmələri olmadan trend xətti görünəcək.',
  log_weight: 'Çəkini yaz', records: 'Rekordlar', records_empty: 'Əvvəlki nəticəni keçəndə rekordlar görünəcək.',
  consistency: 'Müntəzəmlik', this_month: 'bu ay', last_120: '4 ayda', grid_hint: '12 həftə · nə qədər parlaqsa, bir o qədər çox set',
  history: 'Tarixçə', history_empty: 'Hələ məşq yoxdur',
  // me
  my_coach: 'Məşqçim', card_number: 'Kart nömrəsi', next_payment: 'Növbəti ödəniş',
  bill_monthly: 'aylıq', bill_package: '{n} aylıq paket', bill_installment: 'hissə-hissə: {paid} / {parts}',
  all_synced: 'Bütün məşqlər göndərilib', leave: 'Çıxış', leave_title: 'Hesabdan çıxırsınız?',
  leave_text: 'Geri qayıtmaq üçün məşqçinin kodu lazım olacaq.', leave_pending: 'Diqqət: {n} məşq hələ göndərilməyib və itəcək.',
  // picker
  pick_title: 'Hərəkət', pick_for: 'Hərəkətlər: {m}', pick_hint: 'Süzmək üçün əzələyə toxunun', all_muscles: 'Bütün əzələlər',
  pick_custom: '«{q}» öz hərəkətim kimi əlavə et', eq_barbell: 'Ştanq', eq_dumbbell: 'Hantel', eq_machine: 'Trenajor', eq_cable: 'Blok', eq_bodyweight: 'Öz çəkisi', eq_kettlebell: 'Girya',
  // coach today
  month_in: 'Bu ay alınıb', of_expected: 'gözlənilən {sum}-dan', overdue_sum: 'Gecikmiş: {sum}',
  trained_week: 'bu həftə məşq edib', workouts_week: 'bu həftə məşq', new_leads: 'yeni müraciət',
  todo: 'İşlər', all_clear: 'Hər şey hazırdır', all_clear_sub: 'Yeni ödənişlər, müraciətlər və hesabatlar burada görünəcək.',
  swipe_hint: 'Sağa — hazır · sola — WhatsApp', paid_ok: '{sum} ödəniş qeyd olundu',
  overdue_n: '{n} gün gecikib', mark_paid: 'Ödənilib', new_lead: 'Müraciət', make_client: 'Müştəri et',
  new_report: 'Yeni hesabat', seen: 'Baxıldı', dismiss: 'Gizlət', silent_for: 'Səssizdir — son məşq {when}',
  no_workouts_yet: 'Hələ məşq etməyib', recent_workouts: 'Son məşqlər',
  goal_lose: 'Arıqlama', goal_gain: 'Kütlə yığma', goal_fit: 'Forma', goal_rehab: 'Reabilitasiya',
  // clients
  search_clients: 'Ad və ya telefon', f_all: 'Hamısı', f_debt: 'Ödəniş', f_silent: 'Səssiz', f_active: 'Aktiv',
  no_clients: 'Hələ müştəri yoxdur', no_clients_sub: 'Müştəri əlavə edin — o, kod alıb dərhal proqramı görəcək.', add_client: 'Yeni müştəri',
  nothing_found: 'Heç nə tapılmadı', last_seen: 'məşq {when}', week_n: 'bu həftə {n}', client: 'Müştəri',
  // add client
  client_lang: 'Müştərinin dili', goal: 'Məqsəd', billing: 'Ödəniş', b_monthly: 'Aylıq', b_package: 'Paket', b_installment: 'Hissə-hissə',
  price_azn: 'Məbləğ, AZN', months: 'Ay', parts: 'Ödəniş sayı', first_payment: 'İlk ödəniş', program: 'Proqram',
  create_get_code: 'Yarat və kodu al', client_added: 'Müştəri əlavə olundu', send_code_to: 'Kodu göndərin: {name}',
  code_hint: 'Müştəri tətbiqi yükləyib bu kodu daxil edir — başqa heç nə lazım deyil.', send_whatsapp: 'WhatsApp-da göndər', copy_invite: 'Dəvəti kopyala',
  // client card
  code: 'Kod', paid_in_full: 'Tam ödənilib', this_week: 'bu həftə', weeks_streak: 'həftə ardıcıl',
  plan: 'Plan', not_set: 'Seçilməyib', check_day: 'Hesabat günü', check_day_hint: 'Bu gün müştəri çəkisini ölçüb hesabat göndərmək xatırlatmasını görəcək.',
  payments: 'Ödənişlər', m_card: 'Kart', m_cash: 'Nağd', m_online: 'Onlayn', confirm_paid: '{sum} qeyd et', join_code: 'Giriş kodu',
  new_program: 'Yeni proqram', delete_client: 'Müştəri silinsin?', delete_client_text: '{name} və bütün məşq, hesabat və ödəniş tarixçəsi birdəfəlik silinəcək.',
  // programs
  no_programs: 'Proqram yoxdur', no_programs_sub: 'Proqram qurun — müştərilər onu tətbiqdə görəcək.',
  days_n: '{n} gün', clients_n: '{n} müştəri', program_name: 'Proqramın adı',
  weekly_coverage: 'Həftəlik əhatə', coverage_hint: '«Soyuq» əzələyə toxunun — hərəkət seçək.', full_body_covered: 'Bütün bədən işləyir',
  add_day: 'Gün', day_name_ph: '{n}-ci gün: məsələn, Ayaqlar', delete_day: 'Günü sil', coach_note_ph: 'Müştəriyə məsləhət (texnika, temp)',
  move_up: 'Yuxarı', move_down: 'Aşağı', program_used_by: 'Proqramdan istifadə edənlər: {n}', coverage_note: 'Hədəf — həftədə əzələ başına təxminən {n} set',
  delete_program: 'Proqram silinsin?', delete_program_text: 'Proqram silinəcək.', delete_program_used: 'Ondan {n} nəfər istifadə edir — onların proqramı itəcək.',
  // money
  received: 'Alınıb', expected: 'Gözlənilir', overdue: 'Gecikmiş', next_14: 'Yaxın 14 gün', no_payments_month: 'Bu ay ödəniş yoxdur',
  // settings
  profile: 'Profil', phone_wa: 'Telefon (WhatsApp)', public_page: 'Müraciət səhifəsi', public_page_hint: 'Linki Instagram-a qoyun — müraciətlər «İşlər»-ə gələcək.', sign_out: 'Hesabdan çıx',
  // WhatsApp templates
  wa_pay: 'Salam, {name}! Ödənişi xatırladıram: {sum}. Kart: {card}. Təşəkkürlər!',
  wa_lead: 'Salam, {name}! Mən {coach}, siz müşayiət üçün müraciət etmisiniz. Məqsədi və formatı müzakirə edək?',
  wa_report: '{name}, hesabat üçün təşəkkürlər! Baxdım — ',
  wa_pr: '{name}, yeni rekord: {ex} {w}! Əla iş 🔥',
  wa_silent: '{name}, salam! Çoxdandır məşq görmürəm — hər şey qaydasındadır? Ritmə qayıdaq 💪',
  wa_invite: 'Salam, {name}! Mən {coach}. Proqramın artıq CoachFlow tətbiqindədir.\n1) Yüklə: {link}\n2) Kodu daxil et: {code}',
};
