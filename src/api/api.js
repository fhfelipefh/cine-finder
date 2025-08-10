import axios from "axios";

const TMDB_ACCESS_TOKEN_AUTH = import.meta.env.VITE_TMDB_ACCESS_TOKEN_AUTH;

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

export async function getMovieDetails(movieId) {
  if (!movieId) throw new Error("movieId é obrigatório.");
  const { data } = await client.get(`/movie/${movieId}`, {
    params: {
      language: "pt-BR",
      append_to_response: "credits,videos,recommendations,images,release_dates",
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
