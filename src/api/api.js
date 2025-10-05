import axios from "axios";
import { getClientUUID } from "../utils/uuid";

const TMDB_ACCESS_TOKEN_AUTH = import.meta.env.VITE_TMDB_ACCESS_TOKEN_AUTH;
const API = import.meta.env.VITE_API_URL;
const API_BASE = (API || "").trim().replace(/\/+$/, "");

function buildUrl(path) {
  const p = String(path || "");
  if (!API_BASE) return p;
  if (API_BASE.endsWith("/api") && p.startsWith("/api/")) {
    return API_BASE + p.slice(4);
  }
  const left = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
  const right = p.startsWith("/") ? p : "/" + p;
  return left + right;
}

const client = axios.create({
  baseURL: "https://api.themoviedb.org/3",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${TMDB_ACCESS_TOKEN_AUTH}`,
  },
});

export async function getPopularMovies(page = 1) {
  const { data } = await client.get(`/movie/popular`, {
    params: { language: "pt-BR", page },
  });
  return data;
}

export async function getSimilarMovies(movieId, page = 1) {
  if (!movieId) throw new Error("movieId é obrigatório.");
  const { data } = await client.get(`/movie/${movieId}/similar`, {
    params: { language: "pt-BR", page },
  });
  return data;
}

export async function getMovieDetails(movieId) {
  if (!movieId) throw new Error("movieId é obrigatório.");
  const { data } = await client.get(`/movie/${movieId}`, {
    params: {
      language: "pt-BR",
      append_to_response: "credits,videos,images,release_dates",
    },
  });
  return data;
}

export async function searchMovies(query, page = 1) {
  if (!query) return { results: [], total_pages: 1, total_results: 0 };
  const { data } = await client.get(`/search/movie`, {
    params: {
      query,
      language: "pt-BR",
      page,
      include_adult: false,
    },
  });
  return data;
}

export async function getGenres() {
  const { data } = await client.get(`/genre/movie/list`, {
    params: { language: "pt-BR" },
  });
  return data?.genres || [];
}

export async function getMoviesByGenre(genreId, page = 1) {
  if (!genreId) return { results: [], total_pages: 1, total_results: 0 };
  const { data } = await client.get(`/discover/movie`, {
    params: {
      with_genres: genreId,
      language: "pt-BR",
      sort_by: "popularity.desc",
      page,
      include_adult: false,
    },
  });
  return data;
}

export async function getNowPlayingMovies(page = 1) {
  const { data } = await client.get(`/movie/now_playing`, {
    params: {
      language: "pt-BR",
      page,
    },
  });
  return data;
}

export async function listComments(imdbId, page = 1, pageSize = 10) {
  if (!imdbId) throw new Error("imdbId é obrigatório");
  const cleanId = String(imdbId).trim();
  const url = buildUrl(
    `/api/comments/${encodeURIComponent(
      cleanId
    )}?page=${page}&pageSize=${pageSize}`
  );
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const err = new Error(json?.message || "Erro ao listar comentários");
    err.status = res.status;
    throw err;
  }
  return json.data;
}

export async function createComment(payload) {
  const res = await fetch(buildUrl(`/api/comments`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const err = new Error(json?.message || "Erro ao criar comentário");
    err.status = res.status;
    throw err;
  }
  return json.data;
}

export async function updateComment(id, payload) {
  const res = await fetch(buildUrl(`/api/comments/${String(id).trim()}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const err = new Error(json?.message || "Erro ao atualizar comentário");
    err.status = res.status;
    throw err;
  }
  return json.data;
}

export async function deleteComment(id) {
  const res = await fetch(buildUrl(`/api/comments/${String(id).trim()}`), {
    method: "DELETE",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const err = new Error(json?.message || "Erro ao deletar comentário");
    err.status = res.status;
    throw err;
  }
  return true;
}

export async function findMovieByImdbId(imdbId) {
  if (!imdbId) throw new Error("imdbId é obrigatório.");
  const { data } = await client.get(`/find/${encodeURIComponent(imdbId)}`, {
    params: { external_source: "imdb_id", language: "pt-BR" },
  });
  const results = data?.movie_results || [];
  return results[0] || null;
}

export async function getMyVotes() {
  const uuid = getClientUUID();
  const res = await fetch(buildUrl(`/api/votes/me`), {
    headers: { "x-client-uuid": uuid },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const err = new Error(json?.message || "Erro ao listar meus votos");
    err.status = res.status;
    throw err;
  }
  const data = json.data;
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
    ? data.items
    : [];

  return items.map((v) => ({
    id: v.id || v._id,
    imdbId: String(v.imdbId || "").trim(),
    rating: Number(v.rating ?? 0),
    identityType: v.identityType || "ip",
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  }));
}

export async function createOrUpdateVote(payload) {
  const body = {
    imdbId: String(payload?.imdbId ?? "").trim(),
    rating: Number(payload?.rating ?? 0),
  };
  const uuid = getClientUUID();
  const res = await fetch(buildUrl(`/api/votes`), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-client-uuid": uuid },
    body: JSON.stringify({ ...body, uuid }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const err = new Error(json?.message || "Erro ao registrar voto");
    err.status = res.status;
    throw err;
  }
  return json.data;
}

export async function getVote(id) {
  const uuid = getClientUUID();
  const res = await fetch(buildUrl(`/api/votes/by-id/${String(id).trim()}`), {
    headers: { "x-client-uuid": uuid },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const err = new Error(json?.message || "Erro ao obter voto");
    err.status = res.status;
    throw err;
  }
  return json.data;
}

export async function updateVote(id, payload) {
  const uuid = getClientUUID();
  const res = await fetch(buildUrl(`/api/votes/by-id/${String(id).trim()}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-client-uuid": uuid },
    body: JSON.stringify({ rating: Number(payload?.rating ?? 0), uuid }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const err = new Error(json?.message || "Erro ao atualizar voto");
    err.status = res.status;
    throw err;
  }
  return json.data;
}

export async function deleteVote(id) {
  const uuid = getClientUUID();
  const res = await fetch(buildUrl(`/api/votes/by-id/${String(id).trim()}`), {
    method: "DELETE",
    headers: { "x-client-uuid": uuid },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const err = new Error(json?.message || "Erro ao remover voto");
    err.status = res.status;
    throw err;
  }
  return true;
}

export async function getRanking() {
  const url = buildUrl(`/api/votes/ranking`);
  if (import.meta.env.DEV) console.debug("GET", url);
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const err = new Error(json?.message || "Erro ao carregar ranking");
    err.status = res.status;
    throw err;
  }
  const raw = json.data;
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
  return list.map((r) => ({
    ...r,
    imdbId: String(r.imdbId || "").trim(),
    average: Number(r.average ?? r.avgRating ?? r.avg ?? 0),
    count: Number(r.count ?? r.votes ?? r.total ?? 0),
  }));
}

export async function getMovieStats(imdbId) {
  if (!imdbId) throw new Error("imdbId é obrigatório");
  const cleanId = String(imdbId).trim();
  const res = await fetch(
    buildUrl(`/api/votes/ranking/${encodeURIComponent(cleanId)}`)
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const err = new Error(json?.message || "Erro ao carregar estatísticas");
    err.status = res.status;
    throw err;
  }
  const d = json.data || {};
  return {
    ...d,
    imdbId: String(d.imdbId || cleanId),
    average: Number(d.average ?? d.avgRating ?? d.avg ?? 0),
    count: Number(d.count ?? d.votes ?? d.total ?? 0),
    histogram: d.histogram || d.breakdown || undefined,
  };
}
