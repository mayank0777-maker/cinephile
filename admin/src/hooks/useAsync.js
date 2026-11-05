import { useCallback, useEffect, useRef, useState } from "react";

// Runs an async function and tracks { data, loading, error }. Re-runs when deps change.
export function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [state, setState] = useState({ data: null, loading: immediate, error: null });
  const callId = useRef(0);

  const run = useCallback(async () => {
    const id = ++callId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      if (id === callId.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      if (id === callId.current) setState({ data: null, loading: false, error });
      return null;
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (immediate) run();
  }, [run, immediate]);

  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) };
}

export function useDebounce(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// Seconds remaining until a target date; updates every second.
export function useCountdown(target) {
  const calc = () => (target ? Math.max(0, Math.floor((new Date(target).getTime() - Date.now()) / 1000)) : 0);
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    if (!target) return undefined;
    const t = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(t);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  return left;
}
