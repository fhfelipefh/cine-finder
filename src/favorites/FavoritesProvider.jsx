import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "fav_ids";
const FavoritesCtx = createContext(null);

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

  const isFavorite = (id) => ids.includes(id);

  const add = (id) =>
    setIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  const remove = (id) => setIds((prev) => prev.filter((x) => x !== id));
  const toggle = (id) =>
    setIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  const clear = () => setIds([]);

  const value = useMemo(
    () => ({ ids, isFavorite, add, remove, toggle, clear }),
    [ids]
  );

  return (
    <FavoritesCtx.Provider value={value}>{children}</FavoritesCtx.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesCtx);
  if (!ctx)
    throw new Error(
      "useFavorites deve ser usado dentro de <FavoritesProvider>"
    );
  return ctx;
}
