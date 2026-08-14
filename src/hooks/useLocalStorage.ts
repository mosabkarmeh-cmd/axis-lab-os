import { useCallback, useState } from "react";

function readValue<T>(key: string, initialValue: T): T {
  if (typeof window === "undefined") return initialValue;
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? initialValue : JSON.parse(stored) as T;
  } catch {
    return initialValue;
  }
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => readValue(key, initialValue));
  const updateValue = useCallback((nextValue: T | ((current: T) => T)) => {
    setValue((current) => {
      const resolved = typeof nextValue === "function"
        ? (nextValue as (current: T) => T)(current)
        : nextValue;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // Keep the in-memory value when storage is unavailable or full.
      }
      return resolved;
    });
  }, [key]);
  return [value, updateValue] as const;
}
