import { useEffect, useMemo, useState, useCallback } from "react";
import { FavoritesCtx } from "./FavoritesContext";

const STORAGE_KEY = "fav_ids";

export function FavoritesProvider({ children }) {
  const [ids, setIds] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  const isFavorite = useCallback((id) => ids.includes(id), [ids]);

  const add = useCallback(
    (id) => setIds((prev) => (prev.includes(id) ? prev : [...prev, id])),
    []
  );
  const remove = useCallback(
    (id) => setIds((prev) => prev.filter((x) => x !== id)),
    []
  );
  const toggle = useCallback(
    (id) =>
      setIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      ),
    []
  );
  const clear = useCallback(() => setIds([]), []);

  const value = useMemo(
    () => ({ ids, isFavorite, add, remove, toggle, clear }),
    [ids, isFavorite, add, remove, toggle, clear]
  );

  return (
    <FavoritesCtx.Provider value={value}>{children}</FavoritesCtx.Provider>
  );
}
