import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  createFavorite,
  deleteFavorite,
  getMovieDetails,
  listFavorites,
  updateFavorite,
  findMovieByImdbId,
} from "../api/api";
import { FavoritesCtx } from "./FavoritesContext";
import { useAuth } from "../auth/AuthContext";

async function enrichFavorite(entry) {
  const imdbId = String(entry?.imdbId ?? "").trim();
  if (!imdbId) return null;
  let movie = entry?.movie || null;
  let tmdbId = entry?.tmdbId || movie?.id || null;

  if (!tmdbId) {
    const found = await findMovieByImdbId(imdbId).catch(() => null);
    tmdbId = found?.id || null;
    movie = movie || found || null;
  }

  if (tmdbId && (!movie || !movie.overview)) {
    movie = (await getMovieDetails(tmdbId).catch(() => movie)) || movie || null;
  }

  if (!tmdbId) return null;
  return {
    imdbId,
    tmdbId,
    notes: entry?.notes || "",
    createdAt: entry?.createdAt,
    updatedAt: entry?.updatedAt,
    movie,
  };
}

async function resolveFromTmdb(tmdbId) {
  const details = await getMovieDetails(tmdbId);
  const imdbId = String(details?.imdb_id || "").trim();
  if (!imdbId) throw new Error("IMDb ID indisponível para este título.");
  return {
    imdbId,
    tmdbId,
    movie: details,
    notes: "",
  };
}

export function FavoritesProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const ids = useMemo(
    () => items.map((it) => it.tmdbId).filter(Boolean),
    [items]
  );

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return [];
    }
    setLoading(true);
    try {
      let page = 1;
      const pageSize = 50;
      let aggregated = [];
      while (true) {
        const res = await listFavorites({ page, pageSize });
        const current = res.items || [];
        aggregated = aggregated.concat(current);
        if (!res.total || aggregated.length >= res.total || current.length < pageSize) {
          break;
        }
        page += 1;
      }
      const detailed = await Promise.all(
        aggregated.map((entry) => enrichFavorite(entry))
      );
      const filtered = detailed.filter(Boolean);
      setItems(filtered);
      return filtered;
    } catch (err) {
      console.error(err);
      setItems([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }
    refresh();
  }, [isAuthenticated, refresh]);

  const isFavorite = useCallback(
    (id) => {
      if (!id) return false;
      return items.some(
        (it) => it.tmdbId === id || it.imdbId === String(id).trim()
      );
    },
    [items]
  );

  const add = useCallback(
    async (tmdbId) => {
      if (!isAuthenticated) throw new Error("Autenticação necessária.");
      const resolved = await resolveFromTmdb(tmdbId);
      const saved = await createFavorite({ imdbId: resolved.imdbId });
      const merged = {
        ...resolved,
        notes: saved?.notes || "",
        createdAt: saved?.createdAt,
        updatedAt: saved?.updatedAt,
      };
      setItems((prev) => [...prev, merged]);
      return merged;
    },
    [isAuthenticated]
  );

  const remove = useCallback(
    async (id) => {
      if (!isAuthenticated) return;
      const target = items.find(
        (it) => it.tmdbId === id || it.imdbId === String(id).trim()
      );
      if (!target) return;
      await deleteFavorite(target.imdbId);
      setItems((prev) => prev.filter((it) => it.imdbId !== target.imdbId));
    },
    [items, isAuthenticated]
  );

  const toggle = useCallback(
    async (tmdbId) => {
      if (!isAuthenticated) throw new Error("Autenticação necessária.");
      const exists = items.find((it) => it.tmdbId === tmdbId);
      if (exists) {
        await deleteFavorite(exists.imdbId);
        setItems((prev) => prev.filter((it) => it.imdbId !== exists.imdbId));
        return;
      }
      await add(tmdbId);
    },
    [items, isAuthenticated, add]
  );

  const updateNotes = useCallback(
    async (imdbId, notes) => {
      if (!isAuthenticated) throw new Error("Autenticação necessária.");
      const clean = String(notes ?? "").trim();
      await updateFavorite(imdbId, { notes: clean });
      setItems((prev) =>
        prev.map((it) =>
          it.imdbId === imdbId ? { ...it, notes: clean } : it
        )
      );
    },
    [isAuthenticated]
  );

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      ids,
      items,
      loading,
      isFavorite,
      add,
      remove,
      toggle,
      clear,
      refresh,
      updateNotes,
    }),
    [ids, items, loading, isFavorite, add, remove, toggle, clear, refresh, updateNotes]
  );

  return (
    <FavoritesCtx.Provider value={value}>{children}</FavoritesCtx.Provider>
  );
}

FavoritesProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
