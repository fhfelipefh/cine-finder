import { useEffect, useRef, useState } from "react";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import Movies from "./components/Movies.jsx";
import "./App.css";
import {
  getPopularMovies,
  searchMovies,
  getMovieDetails,
  getGenres,
  getMoviesByGenre,
} from "./api/api.js";
import ErrorModal from "./components/ErrorModal.jsx";
import PaginationControls from "./components/PaginationControls.jsx";
import { BsStarFill } from "react-icons/bs";
import { PageTitles, CategoryAllOption } from "./constants.js";
import MovieDetailsModal from "./components/MovieDetailsModal.jsx";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import { useFavorites } from "./favorites/FavoritesProvider.jsx";
import TMDBAttribution from "./components/TMBDAttribution.jsx";

function App() {
  const [popularMovies, setPopularMovies] = useState([]);
  const [moviesPage, setMoviesPage] = useState(1);
  const [moviesTotalPages, setMoviesTotalPages] = useState(1);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoadingPopularMovies, setIsLoadingPopularMovies] = useState(true);
  const [pageTitle, setPageTitle] = useState(PageTitles.POPULAR);
  const [detailsId, setDetailsId] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [query, setQuery] = useState("");
  const [genres, setGenres] = useState([CategoryAllOption]);
  const [selectedGenre, setSelectedGenre] = useState(CategoryAllOption.id);
  const debounceRef = useRef(null);
  const { ids: favoriteIds } = useFavorites();

  function runCancelable(delayMs, work) {
    let active = true;
    const id = setTimeout(async () => {
      try {
        await work(() => active);
      } catch (e) {
        setErrorMsg(e?.message || String(e));
      }
    }, delayMs);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }

  useEffect(() => {
    if (pageTitle !== PageTitles.POPULAR) {
      return;
    }
    let active = true;
    (async () => {
      try {
        setIsLoadingPopularMovies(true);
        setErrorMsg("");
        const data = await getPopularMovies(moviesPage);
        if (!active) {
          return;
        }
        setPopularMovies(data.results);
        setMoviesTotalPages(data.total_pages);
      } catch (error) {
        if (!active) {
          return;
        }
        setErrorMsg(error?.message || String(error));
      } finally {
        if (active) setIsLoadingPopularMovies(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [moviesPage, pageTitle]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await getGenres();
        if (!active) {
          return;
        }
        setGenres([CategoryAllOption, ...list]);
      } catch (e) {
        setErrorMsg(e?.message || "Erro ao carregar gêneros.");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const isGlobalSearch =
      pageTitle === PageTitles.SEARCH && selectedGenre === CategoryAllOption.id;
    const isCategory = pageTitle === PageTitles.CATEGORY;
    if (!isGlobalSearch && !isCategory) {
      return;
    }
    const hasText = query.trim().length > 0;
    const wantsDebounce = hasText;
    const delay = debounceRef.current && wantsDebounce ? 600 : 0;

    async function fetchCategoryWithText(q, page, genreId) {
      const dataSearch = await searchMovies(q, page);
      const filtered = (dataSearch.results || []).filter(
        (m) =>
          Array.isArray(m.genre_ids) && m.genre_ids.includes(Number(genreId))
      );
      return {
        results: filtered,
        totalPages: filtered.length > 0 ? dataSearch.total_pages : 1,
      };
    }

    async function fetchCategoryNoText(page, genreId) {
      const data = await getMoviesByGenre(genreId, page);
      return { results: data.results || [], totalPages: data.total_pages || 1 };
    }

    async function fetchGlobalSearch(q, page) {
      const data = await searchMovies(q, page);
      return { results: data.results || [], totalPages: data.total_pages || 1 };
    }

    let mode;
    if (isCategory) {
      mode = hasText ? "CATEGORY_TEXT" : "CATEGORY";
    } else {
      mode = "GLOBAL";
    }
    
    const strategies = {
      CATEGORY_TEXT: () =>
        fetchCategoryWithText(query, moviesPage, selectedGenre),
      CATEGORY: () => fetchCategoryNoText(moviesPage, selectedGenre),
      GLOBAL: () => fetchGlobalSearch(query, moviesPage),
    };

    return runCancelable(delay, async (isActive) => {
      setIsLoadingPopularMovies(true);
      setErrorMsg("");
      try {
        const { results, totalPages } = await strategies[mode]();
        if (!isActive()) return;
        setPopularMovies(results);
        setMoviesTotalPages(totalPages);
      } catch (error) {
        if (!isActive()) return;
        setErrorMsg(error?.message || String(error));
      } finally {
        if (isActive()) setIsLoadingPopularMovies(false);
      }
    });
  }, [query, moviesPage, pageTitle, selectedGenre]);

  async function loadFavorites() {
    setPageTitle(PageTitles.FAVORITES);
    setMoviesPage(1);
    setMoviesTotalPages(1);
    setQuery("");
    setErrorMsg("");
    setIsLoadingPopularMovies(true);

    try {
      if (!favoriteIds || favoriteIds.length === 0) {
        setPopularMovies([]);
        return;
      }

      const details = await Promise.all(
        favoriteIds.map((id) => getMovieDetails(id).catch(() => null))
      );

      setPopularMovies(details.filter(Boolean));
    } catch (e) {
      setPopularMovies([]);
      setErrorMsg(e?.message || "Erro ao carregar favoritos.");
    } finally {
      setIsLoadingPopularMovies(false);
    }
  }

  function loadPopular() {
    setPageTitle(PageTitles.POPULAR);
    setMoviesPage(1);
    setQuery("");
    setSelectedGenre(CategoryAllOption.id);
  }

  function openDetails(id) {
    setDetailsId(id);
    setShowDetails(true);
  }

  function handleSearchInput(e) {
    const value = e.target.value;
    setQuery(value);
    setMoviesPage(1);
    const hasText = value.trim().length > 0;
    if (selectedGenre !== CategoryAllOption.id) {
      setPageTitle(PageTitles.CATEGORY);
      debounceRef.current = hasText ? true : null;
    } else if (hasText) {
      setPageTitle(PageTitles.SEARCH);
      debounceRef.current = true;
    } else {
      debounceRef.current = null;
      setPageTitle(PageTitles.POPULAR);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    debounceRef.current = null;
    if (selectedGenre !== CategoryAllOption.id) {
      setPageTitle(PageTitles.CATEGORY);
    } else {
      setPageTitle(query.trim() ? PageTitles.SEARCH : PageTitles.POPULAR);
    }
    setMoviesPage(1);
  }

  function handleGenreChange(e) {
    const value = e.target.value;
    setSelectedGenre(value);
    setMoviesPage(1);
    setQuery("");
    if (value === CategoryAllOption.id) {
      setPageTitle(PageTitles.POPULAR);
    } else {
      setPageTitle(PageTitles.CATEGORY);
    }
  }

  const moviesTitle =
    pageTitle === PageTitles.CATEGORY
      ? `Categoria: ${genres.find((g) => g.id == selectedGenre)?.name || ""}`
      : pageTitle;

  return (
    <>
      <Navbar
        bg="light"
        variant="light"
        expand="lg"
        sticky="top"
        className="shadow-sm"
      >
        <Container fluid>
          <Navbar.Brand
            href="#"
            onClick={(e) => {
              e.preventDefault();
              loadPopular();
            }}
          >
            <strong>Cine finder</strong>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="navbarScroll" />
          <Navbar.Collapse id="navbarScroll">
            <Nav className="me-auto">
              <Nav.Link
                href="#favorites"
                onClick={(e) => {
                  e.preventDefault();
                  loadFavorites();
                }}
                className="d-flex align-items-center"
              >
                Favoritos <BsStarFill className="ms-1 text-warning" />
              </Nav.Link>
            </Nav>
            <form onSubmit={handleSearchSubmit} className="d-flex">
              <TextField
                size="small"
                placeholder="Buscar filmes…"
                value={query}
                onChange={handleSearchInput}
                variant="outlined"
                sx={{ minWidth: 280 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <select
                className="form-select ms-2"
                style={{ width: 180 }}
                value={selectedGenre}
                onChange={handleGenreChange}
                aria-label="Filtrar por categoria"
              >
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </form>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Movies
        isLoadingMovies={isLoadingPopularMovies}
        movies={popularMovies}
        title={moviesTitle}
        onSelect={openDetails}
      ></Movies>
      <MovieDetailsModal
        show={showDetails}
        movieId={detailsId}
        onHide={() => setShowDetails(false)}
        onPickRecommendation={(id) => setDetailsId(id)}
      />
      {pageTitle !== PageTitles.FAVORITES && (
        <PaginationControls
          currentPage={moviesPage}
          totalPages={moviesTotalPages}
          onPageChange={setMoviesPage}
          isDisabled={isLoadingPopularMovies}
        />
      )}
      <ErrorModal errorMsg={errorMsg} />
      <TMDBAttribution />
    </>
  );
}

export default App;
