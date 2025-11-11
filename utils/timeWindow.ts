import { OnlineOrderingSchedule } from '../types';

const toMinutes = (time: string): number | null => {
  const [hours, minutes] = time.split(':');
  if (hours === undefined || minutes === undefined) {
    return null;
  }

  const h = Number.parseInt(hours, 10);
  const m = Number.parseInt(minutes, 10);

  if (Number.isNaN(h) || Number.isNaN(m)) {
    return null;
  }

  if (h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }

  return h * 60 + m;
};

export const isWithinSchedule = (
  schedule: OnlineOrderingSchedule,
  referenceDate: Date = new Date(),
): boolean => {
  const start = toMinutes(schedule.startTime);
  const end = toMinutes(schedule.endTime);

  if (start === null || end === null) {
    return true;
  }

  // Same start and end means always available
  if (start === end) {
    return true;
  }

  const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();

  if (start < end) {
    return currentMinutes >= start && currentMinutes < end;
  }

  // Overnight schedule
  return currentMinutes >= start || currentMinutes < end;
};

export const formatScheduleWindow = (
  schedule: OnlineOrderingSchedule,
  locale: string = 'fr-FR',
): string => {
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const reference = new Date();
  const startDate = new Date(reference);
  const endDate = new Date(reference);

  const start = toMinutes(schedule.startTime);
  const end = toMinutes(schedule.endTime);

  if (start !== null) {
    startDate.setHours(Math.floor(start / 60), start % 60, 0, 0);
  }

  if (end !== null) {
    endDate.setHours(Math.floor(end / 60), end % 60, 0, 0);
  }

  const startLabel = formatter.format(startDate);
  const endLabel = formatter.format(endDate);

  return `${startLabel} – ${endLabel}`;
};

export const getNextScheduleChange = (
  schedule: OnlineOrderingSchedule,
  referenceDate: Date = new Date(),
): Date | null => {
  const start = toMinutes(schedule.startTime);
  const end = toMinutes(schedule.endTime);

  if (start === null || end === null) {
    return null;
  }

  const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();

  const targetMinutes = isWithinSchedule(schedule, referenceDate)
    ? end
    : start;

  const targetDate = new Date(referenceDate);
  targetDate.setSeconds(0, 0);
  targetDate.setHours(Math.floor(targetMinutes / 60), targetMinutes % 60, 0, 0);

  if (targetMinutes <= currentMinutes && targetMinutes === end) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  if (targetMinutes <= currentMinutes && targetMinutes === start && start >= end) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  return targetDate;
};

export const minutesUntilNextChange = (
  schedule: OnlineOrderingSchedule,
  referenceDate: Date = new Date(),
): number | null => {
  const nextChange = getNextScheduleChange(schedule, referenceDate);
  if (!nextChange) {
    return null;
  }

  const diffMs = nextChange.getTime() - referenceDate.getTime();
  return Math.max(0, Math.round(diffMs / 60000));
};
