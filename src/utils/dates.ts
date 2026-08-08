import type { ISODateTime, LocalDateKey } from "../models/common";

/**
 * Local calendar day key (YYYY-MM-DD). Deliberately NOT
 * `new Date().toISOString().slice(0, 10)` — UTC can shift the local date.
 */
export function getLocalDateKey(date: Date = new Date()): LocalDateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function nowIso(): ISODateTime {
  return new Date().toISOString();
}

/** Parse a LocalDateKey into a local-time Date (midnight local). */
export function parseDateKey(key: LocalDateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: LocalDateKey, days: number): LocalDateKey {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return getLocalDateKey(date);
}

/** Monday of the week containing `key` (RED Fit weeks start Monday). */
export function getWeekStart(key: LocalDateKey): LocalDateKey {
  const date = parseDateKey(key);
  const day = date.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return getLocalDateKey(date);
}

/** 0 = Montag … 6 = Sonntag (RED Fit day index, unlike JS getDay). */
export function getDayIndex(date: Date = new Date()): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

const WEEKDAYS_DE = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

const MONTHS_DE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

export function weekdayNameDe(dayIndex: number): string {
  return WEEKDAYS_DE[dayIndex] ?? "";
}

/** "Freitag, 8. August" */
export function formatDateGerman(key: LocalDateKey): string {
  const date = parseDateKey(key);
  return `${WEEKDAYS_DE[getDayIndex(date)]}, ${date.getDate()}. ${MONTHS_DE[date.getMonth()]}`;
}

/** "8. Aug." — short form for lists. */
export function formatDateShortGerman(key: LocalDateKey): string {
  const date = parseDateKey(key);
  const short = MONTHS_DE[date.getMonth()].slice(0, 3);
  return `${date.getDate()}. ${short}.`;
}

/** Seconds → "01:28" (or "1:02:03" above an hour). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Seconds → "62 Min" / "1 Std 5 Min" for summaries. */
export function formatDurationLong(totalSeconds: number): string {
  const minutes = Math.max(0, Math.round(totalSeconds / 60));
  if (minutes < 60) return `${minutes} Min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} Std` : `${h} Std ${m} Min`;
}

/** ISO timestamp → "18:25" local time. */
export function formatTime(iso: ISODateTime): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Time-of-day greeting for the Today screen. */
export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 11) return "Guten Morgen";
  if (hour >= 11 && hour < 18) return "Guten Tag";
  return "Guten Abend";
}

/** ISO week key like "2026-W32" — used for the training-week streak. */
export function getIsoWeekKey(key: LocalDateKey): string {
  const date = parseDateKey(key);
  // ISO week: Thursday of the current week decides the year.
  const target = new Date(date.valueOf());
  target.setDate(target.getDate() - getDayIndex(date) + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() - getDayIndex(firstThursday) + 3);
  const week =
    1 +
    Math.round(
      (target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000),
    );
  return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** The Monday key of the previous ISO week relative to `weekStart`. */
export function previousWeekStart(weekStart: LocalDateKey): LocalDateKey {
  return addDays(weekStart, -7);
}
