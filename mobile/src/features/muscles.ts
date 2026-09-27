// Muscle groups: ids, labels, size class, which body view shows them.
export const MUSCLES = [
  'chest', 'delts', 'rear_delts', 'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'traps',
  'upper_back', 'lats', 'lower_back', 'glutes', 'quads', 'hamstrings', 'adductors', 'calves',
] as const;
export type Muscle = (typeof MUSCLES)[number];

export const LARGE_MUSCLES: ReadonlySet<Muscle> = new Set<Muscle>([
  'chest', 'lats', 'upper_back', 'quads', 'hamstrings', 'glutes', 'lower_back',
]);

export const FRONT_MUSCLES: readonly Muscle[] = ['traps', 'delts', 'chest', 'biceps', 'forearms', 'abs', 'obliques', 'quads', 'adductors', 'calves'];
export const BACK_MUSCLES: readonly Muscle[] = ['traps', 'rear_delts', 'triceps', 'forearms', 'upper_back', 'lats', 'lower_back', 'glutes', 'hamstrings', 'calves'];

export function viewOf(m: Muscle): 'front' | 'back' {
  return FRONT_MUSCLES.includes(m) ? 'front' : 'back';
}

export const MUSCLE_LABEL: Record<'az' | 'ru', Record<Muscle, string>> = {
  ru: {
    chest: 'Грудь', delts: 'Плечи', rear_delts: 'Задняя дельта', biceps: 'Бицепс', triceps: 'Трицепс',
    forearms: 'Предплечья', abs: 'Пресс', obliques: 'Косые мышцы', traps: 'Трапеции', upper_back: 'Верх спины',
    lats: 'Широчайшие', lower_back: 'Поясница', glutes: 'Ягодицы', quads: 'Квадрицепс', hamstrings: 'Бицепс бедра',
    adductors: 'Приводящие', calves: 'Икры',
  },
  az: {
    chest: 'Döş', delts: 'Çiyinlər', rear_delts: 'Arxa deltoid', biceps: 'Biseps', triceps: 'Triseps',
    forearms: 'Qolüstü', abs: 'Qarın', obliques: 'Yan qarın', traps: 'Trapesiya', upper_back: 'Kürəyin üstü',
    lats: 'Enli kürək', lower_back: 'Bel', glutes: 'Sağrı', quads: 'Kvadriseps', hamstrings: 'Bud arxası',
    adductors: 'Bud içi', calves: 'Baldır',
  },
};

// Groups used for the readiness chips on Today.
export const REGIONS: { id: string; muscles: Muscle[]; label: { az: string; ru: string } }[] = [
  { id: 'legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'adductors'], label: { ru: 'Ноги', az: 'Ayaqlar' } },
  { id: 'back', muscles: ['lats', 'upper_back', 'lower_back', 'traps'], label: { ru: 'Спина', az: 'Kürək' } },
  { id: 'chest', muscles: ['chest'], label: { ru: 'Грудь', az: 'Döş' } },
  { id: 'shoulders', muscles: ['delts', 'rear_delts'], label: { ru: 'Плечи', az: 'Çiyinlər' } },
  { id: 'arms', muscles: ['biceps', 'triceps', 'forearms'], label: { ru: 'Руки', az: 'Qollar' } },
  { id: 'core', muscles: ['abs', 'obliques'], label: { ru: 'Кор', az: 'Kor' } },
];
