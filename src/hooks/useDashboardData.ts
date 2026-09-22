import { useEffect, useState } from 'react';
import { friendlyError } from '../lib/errors';
import { getDashboardData, type DashboardData } from '../services/dashboardService';

const empty: DashboardData = { upcomingInterviews: [], activeGoals: [], nextTasks: [] };

export function useDashboardData(enabled: boolean, demo: boolean) {
  const [data, setData] = useState<DashboardData>(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = async () => {
    if (!enabled || demo) return setData(empty);
    setLoading(true); setError(null);
    try { setData(await getDashboardData()); } catch (caught) { setError(friendlyError(caught, 'Some dashboard details could not be loaded.')); } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [enabled, demo]);
  return { data, loading, error, refresh };
}
