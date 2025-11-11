import { WeeklySchedule, DailySchedule } from '../types';

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

export const isWithinWeeklySchedule = (
  weeklySchedule: WeeklySchedule | null | undefined,
  referenceDate: Date = new Date(),
): boolean => {
  if (!weeklySchedule) {
    return true;
  }

  const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayKey = dayMap[referenceDate.getDay()] as keyof WeeklySchedule;
  const daySchedule = weeklySchedule[dayKey];

  if (!daySchedule || daySchedule.closed) {
    return false;
  }

  const start = toMinutes(daySchedule.startTime);
  const end = toMinutes(daySchedule.endTime);

  if (start === null || end === null) {
    return true;
  }

  if (start === end) {
    return true;
  }

  const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();

  if (start < end) {
    return currentMinutes >= start && currentMinutes <= end;
  }

  return currentMinutes >= start || currentMinutes <= end;
};

export const formatWeeklySchedule = (
  weeklySchedule: WeeklySchedule | null | undefined,
  locale: string = 'fr-FR',
): Array<{ day: string; label: string; schedule: string }> => {
  if (!weeklySchedule) {
    return [];
  }

  const days = [
    { key: 'monday' as const, labelFr: 'Lundi', labelEs: 'Lunes' },
    { key: 'tuesday' as const, labelFr: 'Mardi', labelEs: 'Martes' },
    { key: 'wednesday' as const, labelFr: 'Mercredi', labelEs: 'Miércoles' },
    { key: 'thursday' as const, labelFr: 'Jeudi', labelEs: 'Jueves' },
    { key: 'friday' as const, labelFr: 'Vendredi', labelEs: 'Viernes' },
    { key: 'saturday' as const, labelFr: 'Samedi', labelEs: 'Sábado' },
    { key: 'sunday' as const, labelFr: 'Dimanche', labelEs: 'Domingo' },
  ];

  const closedText = locale.startsWith('es') ? 'Cerrado' : 'Fermé';

  return days.map(({ key, labelFr, labelEs }) => {
    const daySchedule = weeklySchedule[key];
    const label = locale.startsWith('es') ? labelEs : labelFr;
    
    if (!daySchedule || daySchedule.closed) {
      return { day: key, label, schedule: closedText };
    }

    return {
      day: key,
      label,
      schedule: `${daySchedule.startTime} - ${daySchedule.endTime}`,
    };
  });
};

export const getTodaySchedule = (
  weeklySchedule: WeeklySchedule | null | undefined,
  referenceDate: Date = new Date(),
): DailySchedule | null => {
  if (!weeklySchedule) {
    return null;
  }

  const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayKey = dayMap[referenceDate.getDay()] as keyof WeeklySchedule;
  return weeklySchedule[dayKey] || null;
};
