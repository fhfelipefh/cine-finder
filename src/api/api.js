import axios from "axios";

const TMDB_ACCESS_TOKEN_AUTH = import.meta.env.VITE_TMDB_ACCESS_TOKEN_AUTH;

export async function getPopularMovies(page = 1) {
  if (!TMDB_ACCESS_TOKEN_AUTH) {
    throw new Error("TMDB_ACCESS_TOKEN_AUTH não foi definido no ambiente.");
  }

  const url = `https://api.themoviedb.org/3/movie/popular?language=pt-br&page=${page}`;

  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${TMDB_ACCESS_TOKEN_AUTH}`,
    },
  };

  return axios.get(url, options)
    .then((response) => response.data)
    .catch((error) => {
      throw error;
    });
}
