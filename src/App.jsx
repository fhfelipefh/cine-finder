import { useEffect, useRef, useState } from "react";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import Movies from "./components/Movies.jsx";
import MovieCinemaSVG from "./assets/movie-cinema.svg";
import "./App.css";
import { getPopularMovies, searchMovies, getMovieDetails } from "./api/api.js";
import ErrorModal from "./components/ErrorModal.jsx";
import PaginationControls from "./components/PaginationControls.jsx";
import { BsStarFill } from "react-icons/bs";
import { PageTitles } from "./constants.js";
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
  const debounceRef = useRef(null);
  const { ids: favoriteIds } = useFavorites();

  useEffect(() => {
    if (pageTitle !== PageTitles.POPULAR) return;
    let active = true;
    (async () => {
      try {
        setIsLoadingPopularMovies(true);
        setErrorMsg("");
        const data = await getPopularMovies(moviesPage);
        if (!active) return;
        setPopularMovies(data.results);
        setMoviesTotalPages(data.total_pages);
      } catch (error) {
        if (!active) return;
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
    if (pageTitle !== PageTitles.SEARCH) return;
    let active = true;

    const delay = debounceRef.current ? 600 : 0;

    const run = async () => {
      try {
        setIsLoadingPopularMovies(true);
        setErrorMsg("");
        const data = await searchMovies(query, moviesPage);
        if (!active) return;
        setPopularMovies(data.results);
        setMoviesTotalPages(data.total_pages || 1);
      } catch (error) {
        if (!active) return;
        setErrorMsg(error?.message || String(error));
      } finally {
        if (active) setIsLoadingPopularMovies(false);
      }
    };

    const id = setTimeout(run, delay);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [query, moviesPage, pageTitle]);

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
  }

  function openDetails(id) {
    setDetailsId(id);
    setShowDetails(true);
  }

  function handleSearchInput(e) {
    const value = e.target.value;
    setQuery(value);
    setMoviesPage(1);
    if (value && value.trim().length > 0) {
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
    setPageTitle(query.trim() ? PageTitles.SEARCH : PageTitles.POPULAR);
    setMoviesPage(1);
  }

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
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </form>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Movies
        isLoadingMovies={isLoadingPopularMovies}
        movies={popularMovies}
        title={pageTitle}
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
