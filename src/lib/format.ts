/*
 * Language-neutral helpers. Anything with words (dates, sizes, statuses, "boxes") lives in
 * i18n's formatters so it follows the selected language.
 */

/** [120, 150] → "120/150" */
export const formatFluted = (fluted: number[] | number) => (Array.isArray(fluted) ? fluted.join('/') : String(fluted));

/** Parses "120/150/160" into [120, 150, 160]; returns null if any part isn't a number ≥ 0. */
export const parseSlashNumbers = (input: string): number[] | null => {
  const parts = input.split('/').map((p) => p.trim());
  if (parts.length === 0 || parts.some((p) => p === '')) return null;
  const numbers = parts.map(Number);
  return numbers.every((n) => Number.isFinite(n) && n >= 0) ? numbers : null;
};

/** Today's date as yyyy-mm-dd in the user's local timezone (for <input type="date" min>). */
export const todayInputValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

/** Whole days from today until the given date (negative when overdue). */
export const daysUntil = (iso: string) => {
  const target = new Date(iso);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
};
