import { createContext, useContext } from "react";

export const FavoritesCtx = createContext(null);

export function useFavorites() {
  const ctx = useContext(FavoritesCtx);
  if (!ctx)
    throw new Error(
      "useFavorites deve ser usado dentro de <FavoritesProvider>"
    );
  return ctx;
}
