import { useCallback, useEffect, useState } from 'react';

/**
 * Standardizes the fetch → loading/error/retry/refetch pattern that was
 * previously hand-rolled (inconsistently) in every page:
 *
 *   const { data, loading, error, refetch } = useApiData(
 *     () => api.get('/bookings?limit=50'),
 *     []
 *   );
 *
 * `deps` works like useEffect's dependency array — the fetch re-runs
 * whenever they change (e.g. a tab or filter changing).
 */
export default function useApiData(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetcher()
      .then((result) => setData(result))
      .catch((err) => setError(err.message || 'Something went wrong'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load, setData };
}
