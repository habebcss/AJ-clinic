/**
 * أوقات العيادة: من 9:00 صباحاً حتى 10:00 مساءً، كل موعد ساعة.
 * غيّر هون لو بدك تغيّر الدوام أو طول الموعد — كل الموقع بيقرأ من هون.
 */
export const ALL_SLOTS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00",
];

/** الفترات الثلاث — تُستخدم بالحجز وبإقفال فترة كاملة من اللوحة. */
export const PERIODS = [
  { key: "morning",   ar: "صباحاً", en: "Morning",   slots: ["09:00", "10:00", "11:00", "12:00"] },
  { key: "afternoon", ar: "ظهراً",  en: "Afternoon", slots: ["13:00", "14:00", "15:00", "16:00", "17:00"] },
  { key: "evening",   ar: "مساءً",  en: "Evening",   slots: ["18:00", "19:00", "20:00", "21:00"] },
] as const;

export type PeriodKey = (typeof PERIODS)[number]["key"];

/** يرجع أوقات فترة معيّنة، أو كل الأوقات لو الفترة غير معروفة. */
export function slotsForPeriod(key: string): string[] {
  const p = PERIODS.find((x) => x.key === key);
  return p ? [...p.slots] : [];
}

/** عرض الوقت بصيغة 12 ساعة بالعربي، مثل: 9:00 ص */
export function formatSlotAr(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const suffix = h < 12 ? "ص" : "م";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatSlotEn(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}
