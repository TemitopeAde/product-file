import { useCallback, useEffect, useState } from 'react';
import { api, errorText } from './api';

interface CursorPage {
  nextCursor: string | null;
}

/** Cursor-paged list: `path` includes filters; changing it restarts from the first page. */
export function useCursorList<P extends CursorPage, T>(path: string, pick: (page: P) => T[]) {
  const [page, setPage] = useState<P | null>(null);
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setPage(null);
    setItems([]);
    setCursor(null);
    api<P>(path)
      .then((page) => {
        if (!active) return;
        setPage(page);
        setItems(pick(page));
        setCursor(page.nextCursor);
        setError(null);
      })
      .catch((err: unknown) => active && setError(errorText(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // `pick` is a stable selector supplied by the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce]);

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const separator = path.includes('?') ? '&' : '?';
      const page = await api<P>(`${path}${separator}cursor=${encodeURIComponent(cursor)}`);
      setItems((current) => [...current, ...pick(page)]);
      setCursor(page.nextCursor);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, path]);

  return { page, items, hasMore: cursor !== null, loading, loadingMore, error, loadMore, reload: () => setNonce((n) => n + 1) };
}
