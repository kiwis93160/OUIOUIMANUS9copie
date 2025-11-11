import { useCallback, useEffect, useState } from 'react';
import { WeeklySchedule, DailySchedule } from '../types';
import { api } from '../services/api';

const DEFAULT_SCHEDULE: WeeklySchedule = {
  monday: { startTime: '11:00', endTime: '23:00', closed: false },
  tuesday: { startTime: '11:00', endTime: '23:00', closed: false },
  wednesday: { startTime: '11:00', endTime: '23:00', closed: false },
  thursday: { startTime: '11:00', endTime: '23:00', closed: false },
  friday: { startTime: '11:00', endTime: '23:00', closed: false },
  saturday: { startTime: '11:00', endTime: '23:00', closed: false },
  sunday: { startTime: '11:00', endTime: '23:00', closed: false },
};

let cachedSchedule: WeeklySchedule | null = null;

interface UseOnlineOrderingSchedulesResult {
  schedule: WeeklySchedule | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateSchedule: (schedule: WeeklySchedule) => Promise<WeeklySchedule>;
}

const useOnlineOrderingSchedules = (): UseOnlineOrderingSchedulesResult => {
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(cachedSchedule);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const remote = await api.getOnlineOrderingSchedules();
      const resolved = remote ?? DEFAULT_SCHEDULE;
      cachedSchedule = resolved;
      setSchedule(resolved);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch online ordering schedules', err);
      cachedSchedule = DEFAULT_SCHEDULE;
      setSchedule(DEFAULT_SCHEDULE);
      setError(err instanceof Error ? err.message : 'Impossible de charger les horaires.');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSchedule = useCallback(async (newSchedule: WeeklySchedule) => {
    const updated = await api.updateOnlineOrderingSchedules(newSchedule);
    setSchedule(updated);
    cachedSchedule = updated;
    return updated;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    schedule,
    loading,
    error,
    refresh,
    updateSchedule,
  };
};

export default useOnlineOrderingSchedules;
export { DEFAULT_SCHEDULE };
