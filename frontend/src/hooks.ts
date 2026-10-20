/** Hook data: status mesin, opsi suara, antrian, dan riwayat. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { Engine, HistoryResponse, QueueJob, StatusResponse } from './types';

export function useOptions() {
  const [engines, setEngines] = useState<Engine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .options()
      .then((list) => {
        if (alive) setEngines(list);
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { engines, error, loading };
}

export function useStatus(intervalMs = 4000) {
  const [status, setStatus] = useState<StatusResponse | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      api
        .status()
        .then((s) => {
          if (alive) setStatus(s);
        })
        .catch(() => {
          /* biarkan status terakhir */
        });
    };
    tick();
    const timer = window.setInterval(tick, intervalMs);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [intervalMs]);

  return status?.engines ?? {};
}

export function useQueue(intervalMs = 3000) {
  const [items, setItems] = useState<QueueJob[]>([]);
  const [queued, setQueued] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.queueList();
      setItems(data.items ?? []);
      setQueued(data.queued ?? 0);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
    timer.current = window.setInterval(() => void refresh(), intervalMs);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [refresh, intervalMs]);

  const cancel = useCallback(
    async (id: string) => {
      await api.cancelJob(id);
      await refresh();
    },
    [refresh],
  );

  const clearDone = useCallback(async () => {
    await api.clearDone();
    await refresh();
  }, [refresh]);

  return { items, queued, error, refresh, cancel, clearDone };
}

export function useHistory() {
  const [data, setData] = useState<HistoryResponse>({ files: [], folders: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setData(await api.history());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...data, loading, error, refresh };
}
