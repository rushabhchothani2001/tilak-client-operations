import type { BoxSize, OrderSpec } from '../types';
import { PAPER_LABELS, PLY_LABELS, PRINT_LABELS } from './labels';

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const numberFormatter = new Intl.NumberFormat('en-IN');

export const formatDate = (iso: string) => dateFormatter.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFormatter.format(new Date(iso));
export const formatNumber = (n: number) => numberFormatter.format(n);

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
/** 13125 → "₹13,125.00" */
export const formatINR = (rupees: number) => inrFormatter.format(rupees);

export const formatSize = (size: BoxSize) =>
  `${size.length} × ${size.width} × ${size.height} ${size.unit}`;

export const formatPaper = (spec: Pick<OrderSpec, 'paperType' | 'printType'>) =>
  spec.paperType === 'printed' && spec.printType
    ? `${PAPER_LABELS.printed} · ${PRINT_LABELS[spec.printType]}`
    : PAPER_LABELS[spec.paperType];

/** [120, 150] → "120/150" */
export const formatFluted = (fluted: number[] | number) =>
  Array.isArray(fluted) ? fluted.join('/') : String(fluted);

/** Parses "120/150/160" into [120, 150, 160]; returns null if any part isn't a number ≥ 0. */
export const parseSlashNumbers = (input: string): number[] | null => {
  const parts = input.split('/').map((p) => p.trim());
  if (parts.length === 0 || parts.some((p) => p === '')) return null;
  const numbers = parts.map(Number);
  return numbers.every((n) => Number.isFinite(n) && n >= 0) ? numbers : null;
};

export const formatPly =(spec: Pick<OrderSpec, 'ply'>) => PLY_LABELS[spec.ply];

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
