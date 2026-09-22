import { useEffect, useState } from 'react';
import { getApplicationContext, type ApplicationContext } from '../services/applicationDetailService';

const empty: ApplicationContext = { interviews: [], documents: [], activity: [] };
export function useApplicationContext(applicationId: string | null, enabled: boolean) {
  const [data, setData] = useState<ApplicationContext>(empty);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    if (!applicationId || !enabled) { setData(empty); return () => { active = false; }; }
    setLoading(true);
    getApplicationContext(applicationId).then(result => { if (active) setData(result); }).catch(() => { if (active) setData(empty); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applicationId, enabled]);
  const refresh = async () => {
    if (!applicationId || !enabled) return;
    setLoading(true);
    try { setData(await getApplicationContext(applicationId)); } finally { setLoading(false); }
  };
  return { data, loading, refresh };
}
