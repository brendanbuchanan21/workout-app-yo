import { TimeRange } from './TimeRangePicker';

export interface DateTick {
  x: number;
  label: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getRangeStart(range: TimeRange, endDate: Date): Date | null {
  if (range === 'all') return null;

  const start = new Date(endDate);
  switch (range) {
    case '1m':
      start.setMonth(start.getMonth() - 1);
      break;
    case '3m':
      start.setMonth(start.getMonth() - 3);
      break;
    case '6m':
      start.setMonth(start.getMonth() - 6);
      break;
    case '1y':
      start.setFullYear(start.getFullYear() - 1);
      break;
  }
  return start;
}

export function getDateDomain(
  dates: string[],
  range: TimeRange
): { start: Date; end: Date; spansYears: boolean } {
  const parsedDates = dates.map(parseDate).sort((a, b) => a.getTime() - b.getTime());
  const firstDate = parsedDates[0];
  const lastDate = parsedDates[parsedDates.length - 1];

  const today = new Date();
  const rangeStart = getRangeStart(range, today);
  const start = rangeStart ?? firstDate;
  const end = range === 'all' ? lastDate : today;

  return {
    start,
    end: end.getTime() <= start.getTime() ? new Date(start.getTime() + MS_PER_DAY) : end,
    spansYears: start.getFullYear() !== end.getFullYear(),
  };
}

export function getDateX(date: string, start: Date, end: Date, left: number, width: number): number {
  const totalMs = Math.max(end.getTime() - start.getTime(), MS_PER_DAY);
  const dateMs = parseDate(date).getTime();
  const progress = Math.min(1, Math.max(0, (dateMs - start.getTime()) / totalMs));
  return left + progress * width;
}

function formatTick(date: Date, includeYear: boolean): string {
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  if (!includeYear) return month;
  return `${month} '${String(date.getFullYear()).slice(-2)}`;
}

export function getDateTicks(
  start: Date,
  end: Date,
  left: number,
  width: number,
  includeYear: boolean
): DateTick[] {
  const spanDays = (end.getTime() - start.getTime()) / MS_PER_DAY;

  if (spanDays <= 45) {
    return [0, 0.5, 1].map((progress) => {
      const date = new Date(start.getTime() + (end.getTime() - start.getTime()) * progress);
      return {
        x: left + width * progress,
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };
    });
  }

  const monthTicks: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1, 12);
  if (cursor.getTime() < start.getTime()) cursor.setMonth(cursor.getMonth() + 1);

  while (cursor.getTime() <= end.getTime()) {
    monthTicks.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const maxTicks = 4;
  const uniqueTicks = [start, ...monthTicks, end].filter((date, index, dates) => (
    dates.findIndex((candidate) => (
      candidate.getFullYear() === date.getFullYear()
      && candidate.getMonth() === date.getMonth()
    )) === index
  ));

  const ticks = uniqueTicks.length <= maxTicks
    ? uniqueTicks
    : Array.from({ length: maxTicks }, (_, index) => {
      const tickIndex = Math.round(index * (uniqueTicks.length - 1) / (maxTicks - 1));
      return uniqueTicks[tickIndex];
    });

  return ticks.map((date) => ({
    x: left + ((date.getTime() - start.getTime()) / Math.max(end.getTime() - start.getTime(), MS_PER_DAY)) * width,
    label: formatTick(date, includeYear),
  }));
}

export function getBarWidth(xs: number[], maxWidth: number): number {
  const sortedXs = [...xs].sort((a, b) => a - b);
  const gaps = sortedXs
    .slice(1)
    .map((x, index) => x - sortedXs[index])
    .filter((gap) => gap > 0);

  if (gaps.length === 0) return maxWidth;
  return Math.max(4, Math.min(maxWidth, Math.min(...gaps) * 0.55));
}
