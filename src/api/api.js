import axios from "axios";

const TMDB_ACCESS_TOKEN_AUTH = import.meta.env.VITE_TMDB_ACCESS_TOKEN_AUTH;
const API = import.meta.env.VITE_API_URL;
const API_BASE = (API || "").trim().replace(/\/+$/, "");
const TOKEN_STORAGE_KEY = "cinefinder.auth.token";

function buildUrl(path) {
  const p = String(path || "");
  if (!API_BASE) return p;
  const base = API_BASE.endsWith("/api") ? API_BASE.slice(0, -4) : API_BASE;
  const left = base.endsWith("/") ? base.slice(0, -1) : base;
  const right = p.startsWith("/") ? p : "/" + p;
  return left + right;
}

function loadInitialToken() {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    return null;
  }
  return null;
}

let authToken = loadInitialToken();

export function getStoredAuthToken() {
  return authToken || null;
}

export function setStoredAuthToken(token) {
  authToken = token || null;
  try {
    if (typeof localStorage !== "undefined") {
      if (authToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
  } catch {
    /* ignore storage failures */
  }
  return authToken;
}

export function clearStoredAuthToken() {
  return setStoredAuthToken(null);
}

function appendQuery(path, params) {
  if (!params) return path;
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((v) => query.append(key, v));
    } else {
      query.append(key, value);
    }
  });
  const qs = query.toString();
  if (!qs) return path;
  return path.includes("?") ? `${path}&${qs}` : `${path}?${qs}`;
}

async function request(path, options = {}) {
  const { method = "GET", body, headers = {}, auth = true, query } = options;
  const finalHeaders = { Accept: "application/json", ...headers };
  let payload = body;

  if (body && !(body instanceof FormData) && typeof body !== "string") {
    finalHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  if (auth) {
    const token = getStoredAuthToken();
    if (!token) {
      const error = new Error("Autenticação necessária.");
      error.status = 401;
      throw error;
    }
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const target = buildUrl(appendQuery(path, query));
  const res = await fetch(target, {
    method,
    headers: finalHeaders,
    body: payload,
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  const success = res.ok && json?.success !== false;
  if (!success) {
    if (res.status === 401) clearStoredAuthToken();
    const err = new Error(json?.message || `Erro ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }

  return json?.data ?? json ?? null;
}

function normalizePagedResult(payload, fallbackPage = 1, fallbackSize = 10) {
  const base = payload || {};
  const items = Array.isArray(base.items)
    ? base.items
    : Array.isArray(base.results)
    ? base.results
    : Array.isArray(base.data)
    ? base.data
    : Array.isArray(base)
    ? base
    : [];
  const total =
    typeof base.total === "number"
      ? base.total
      : typeof base.count === "number"
      ? base.count
      : typeof base.totalItems === "number"
      ? base.totalItems
      : typeof base.totalCount === "number"
      ? base.totalCount
      : typeof base.pagination?.total === "number"
      ? base.pagination.total
      : Array.isArray(base.items)
      ? base.items.length
      : items.length;
  const page =
    typeof base.page === "number"
      ? base.page
      : typeof base.currentPage === "number"
      ? base.currentPage
      : typeof base.pagination?.page === "number"
      ? base.pagination.page
      : fallbackPage;
  const pageSize =
    typeof base.pageSize === "number"
      ? base.pageSize
      : typeof base.limit === "number"
      ? base.limit
      : typeof base.pagination?.pageSize === "number"
      ? base.pagination.pageSize
      : fallbackSize;
  return { items, total, page, pageSize };
}

function sanitizeImdbId(imdbId) {
  const clean = String(imdbId ?? "").trim();
  if (!clean) {
    throw new Error("IMDb ID é obrigatório.");
  }
  return clean;
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

export async function findMovieByImdbId(imdbId) {
  const clean = sanitizeImdbId(imdbId);
  const normalized = clean.toLowerCase();
  const { data } = await client.get(`/find/${encodeURIComponent(normalized)}`, {
    params: { external_source: "imdb_id", language: "pt-BR" },
  });
  const results = data?.movie_results || [];
  return results[0] || null;
}

export async function registerUser(payload) {
  const body = {
    name: String(payload?.name ?? "").trim(),
    email: String(payload?.email ?? "").trim().toLowerCase(),
    password: String(payload?.password ?? ""),
  };
  return request(`/auth/register`, { method: "POST", body, auth: false });
}

export async function loginUser(payload) {
  const body = {
    email: String(payload?.email ?? "").trim().toLowerCase(),
    password: String(payload?.password ?? ""),
  };
  return request(`/auth/login`, { method: "POST", body, auth: false });
}

export async function fetchProfile() {
  return request(`/users/me`);
}

export async function updateProfile(payload) {
  const body = {};
  if (payload?.name !== undefined) body.name = String(payload.name).trim();
  if (payload?.email !== undefined)
    body.email = String(payload.email).trim().toLowerCase();
  return request(`/users/me`, { method: "PUT", body });
}

export async function updatePassword(payload) {
  const body = {
    currentPassword: String(payload?.currentPassword ?? ""),
    newPassword: String(payload?.newPassword ?? ""),
  };
  return request(`/users/me/password`, { method: "PUT", body });
}

export async function deleteAccount() {
  return request(`/users/me`, { method: "DELETE" });
}

export async function listComments(imdbId, page = 1, pageSize = 10) {
  const clean = sanitizeImdbId(imdbId);
  const data = await request(`/comments/${encodeURIComponent(clean)}`, {
    query: { page, pageSize },
  });
  const paged = normalizePagedResult(data, page, pageSize);
  return {
    items: paged.items,
    total: paged.total,
    page: paged.page,
    pageSize: paged.pageSize,
  };
}

export async function createComment(payload) {
  const body = {
    imdbId: sanitizeImdbId(payload?.imdbId),
    rating: Number(payload?.rating ?? 0),
    comment: String(payload?.comment ?? "").trim(),
  };
  return request(`/comments`, { method: "POST", body });
}

export async function updateComment(id, payload) {
  const body = {};
  if (payload?.rating !== undefined)
    body.rating = Number(payload.rating ?? 0);
  if (payload?.comment !== undefined)
    body.comment = String(payload.comment ?? "").trim();
  return request(`/comments/${String(id).trim()}` , {
    method: "PUT",
    body,
  });
}

export async function deleteComment(id) {
  return request(`/comments/${String(id).trim()}`, { method: "DELETE" });
}

export async function getMyVotes() {
  const data = await request(`/votes/me`);
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
    ? data.items
    : [];
  return list.map((v) => ({
    id: v.id || v._id,
    imdbId: String(v.imdbId || "").trim(),
    rating: Number(v.rating ?? 0),
    userId: v.userId || v.user || null,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  }));
}

export async function createVote(payload) {
  const body = {
    imdbId: sanitizeImdbId(payload?.imdbId),
    rating: Number(payload?.rating ?? 0),
  };
  return request(`/votes`, { method: "POST", body });
}

export async function createOrUpdateVote(payload) {
  try {
    return await createVote(payload);
  } catch (err) {
    if (err?.status === 409 || err?.status === 400) {
      const mine = await getMyVotes().catch(() => []);
      const existing = mine.find(
        (v) => v.imdbId === sanitizeImdbId(payload?.imdbId)
      );
      if (!existing) throw err;
      return updateVote(existing.id, { rating: payload?.rating });
    }
    throw err;
  }
}

export async function getVote(id) {
  return request(`/votes/by-id/${String(id).trim()}`);
}

export async function updateVote(id, payload) {
  const body = {};
  if (payload?.rating !== undefined)
    body.rating = Number(payload.rating ?? 0);
  return request(`/votes/by-id/${String(id).trim()}` , {
    method: "PUT",
    body,
  });
}

export async function deleteVote(id) {
  await request(`/votes/by-id/${String(id).trim()}`, { method: "DELETE" });
  return true;
}

export async function getRanking() {
  const data = await request(`/votes/ranking`);
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
    ? data.items
    : [];
  return list.map((r) => ({
    ...r,
    imdbId: String(r.imdbId || "").trim(),
    average: Number(r.average ?? r.avgRating ?? r.avg ?? 0),
    count: Number(r.count ?? r.votes ?? r.total ?? 0),
  }));
}

export async function getMovieStats(imdbId) {
  const clean = sanitizeImdbId(imdbId);
  const data = await request(`/votes/ranking/${encodeURIComponent(clean)}`);
  const avg = Number(data?.average ?? data?.avgRating ?? data?.avg ?? 0);
  const count = Number(data?.count ?? data?.votes ?? data?.total ?? 0);
  return {
    ...data,
    imdbId: String(data?.imdbId || clean),
    average: avg,
    count,
    histogram: data?.histogram || data?.breakdown || {},
  };
}

export async function listFavorites({ page = 1, pageSize = 20 } = {}) {
  const data = await request(`/favorites`, { query: { page, pageSize } });
  const paged = normalizePagedResult(data, page, pageSize);
  return paged;
}

export async function createFavorite(payload) {
  const body = {
    imdbId: sanitizeImdbId(payload?.imdbId),
    notes:
      payload?.notes !== undefined ? String(payload.notes ?? "").trim() : undefined,
  };
  return request(`/favorites`, { method: "POST", body });
}

export async function updateFavorite(imdbId, payload) {
  const body = {
    notes:
      payload?.notes !== undefined ? String(payload.notes ?? "").trim() : undefined,
  };
  return request(`/favorites/${encodeURIComponent(sanitizeImdbId(imdbId))}` , {
    method: "PUT",
    body,
  });
}

export async function deleteFavorite(imdbId) {
  await request(`/favorites/${encodeURIComponent(sanitizeImdbId(imdbId))}`, {
    method: "DELETE",
  });
  return true;
}

export async function listMyListEntries({
  status,
  priority,
  search,
  sortBy = "updatedAt",
  sortDirection = "desc",
  page = 1,
  pageSize = 8,
} = {}) {
  const query = {
    page,
    pageSize,
    sortBy,
    sortDirection,
  };
  if (status && status !== "all") query.status = status;
  if (priority && priority !== "all") query.priority = priority;
  if (search) query.search = search;
  const data = await request(`/my-list`, { query });
  return normalizePagedResult(data, page, pageSize);
}

export async function getMyListStats() {
  return request(`/my-list/stats`);
}

export async function upsertMyListEntry(payload = {}) {
  const body = {
    imdbId: sanitizeImdbId(payload?.imdbId),
    status: payload?.status,
    score:
      payload?.score === null || payload?.score === undefined
        ? undefined
        : Number(payload.score),
    progress:
      payload?.progress === null || payload?.progress === undefined
        ? undefined
        : Number(payload.progress),
    rewatchCount:
      payload?.rewatchCount === null || payload?.rewatchCount === undefined
        ? undefined
        : Number(payload.rewatchCount),
    priority: payload?.priority,
    notes:
      payload?.notes === undefined ? undefined : String(payload.notes ?? ""),
    tags: Array.isArray(payload?.tags) ? payload.tags : undefined,
    startedAt: payload?.startedAt,
    finishedAt: payload?.finishedAt,
  };
  return request(`/my-list`, { method: "POST", body });
}

export async function updateMyListEntry(id, payload = {}) {
  if (!id) throw new Error("ID obrigat�rio para atualizar a lista pessoal.");
  const body = {};
  const allowed = [
    "status",
    "priority",
    "notes",
    "tags",
    "startedAt",
    "finishedAt",
    "isHidden",
    "title",
  ];
  allowed.forEach((key) => {
    if (payload[key] !== undefined) body[key] = payload[key];
  });
  if (payload.score !== undefined) body.score = Number(payload.score);
  if (payload.progress !== undefined) body.progress = Number(payload.progress);
  if (payload.rewatchCount !== undefined)
    body.rewatchCount = Number(payload.rewatchCount);
  return request(`/my-list/${String(id).trim()}`, { method: "PUT", body });
}

export async function deleteMyListEntry(id) {
  if (!id) throw new Error("ID obrigat�rio para remover da lista.");
  await request(`/my-list/${String(id).trim()}`, { method: "DELETE" });
  return true;
}

export async function getMyListEntryByImdb(imdbId) {
  const clean = sanitizeImdbId(imdbId);
  const data = await request(`/my-list`, {
    query: { imdbId: clean, page: 1, pageSize: 1 },
  });
  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.results)
    ? data.results
    : [];
  const found =
    items.find((item) => {
      const candidate =
        item?.imdbId || item?.movie?.imdbId || item?.movie?.imdbID || "";
      if (!candidate) return false;
      return sanitizeImdbId(candidate) === clean;
    }) || null;
  return found;
}

export async function listCatalogMovies({ page = 1, pageSize = 20 } = {}) {
  const data = await request(`/movies`, { query: { page, pageSize } });
  return normalizePagedResult(data, page, pageSize);
}

export async function createCatalogMovie(payload) {
  const body = {
    imdbId: sanitizeImdbId(payload?.imdbId),
    title: String(payload?.title ?? "").trim(),
    posterUrl: payload?.posterUrl,
    year: payload?.year,
    synopsis: payload?.synopsis,
  };
  return request(`/movies`, { method: "POST", body });
}

export async function getCatalogMovieByImdb(imdbId) {
  const clean = sanitizeImdbId(imdbId);
  return request(`/movies/imdb/${encodeURIComponent(clean)}`);
}

export async function updateCatalogMovie(id, payload) {
  const body = { ...payload };
  if (body.imdbId) body.imdbId = sanitizeImdbId(body.imdbId);
  return request(`/movies/${String(id).trim()}` , { method: "PUT", body });
}

export async function deleteCatalogMovie(id) {
  await request(`/movies/${String(id).trim()}`, { method: "DELETE" });
  return true;
}
