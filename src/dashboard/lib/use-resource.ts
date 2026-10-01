import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

export interface Resource<T> {
  data: T | null;
  error: unknown | null;
  loading: boolean;
  reload: () => void;
  setData: (data: T) => void;
}

/** Loads a GET endpoint and re-fetches whenever `path` changes; stale responses are ignored. */
export function useResource<T>(path: string | null): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown | null>(null);
  const [loading, setLoading] = useState<boolean>(path !== null);
  const [nonce, setNonce] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    if (path === null) return;
    const request = ++latest.current;
    setLoading(true);
    api<T>(path)
      .then((result) => {
        if (request !== latest.current) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (request !== latest.current) return;
        setError(err);
      })
      .finally(() => {
        if (request === latest.current) setLoading(false);
      });
  }, [path, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload, setData };
}
