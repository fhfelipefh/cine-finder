import { useEffect, useState } from "react";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Form from "react-bootstrap/Form";
import Navbar from "react-bootstrap/Navbar";
import Movies from "./components/Movies.jsx";
import MovieCinemaSVG from "./assets/movie-cinema.svg";
import "./App.css";
import { getPopularMovies } from "./api/api.js";
import ErrorModal from "./components/ErrorModal.jsx";
import PaginationControls from "./components/PaginationControls.jsx";
import { BsStarFill } from "react-icons/bs";
import { PageTitles } from "./constants.js";
import MovieDetailsModal from "./components/MovieDetailsModal.jsx";

function App() {
  const [popularMovies, setPopularMovies] = useState([]);
  const [moviesPage, setMoviesPage] = useState(1);
  const [moviesTotalPages, setMoviesTotalPages] = useState(1);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoadingPopularMovies, setIsLoadingPopularMovies] = useState(true);
  const [pageTitle, setPageTitle] = useState(PageTitles.POPULAR);
  const [detailsId, setDetailsId] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

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

  function loadFavorites() {
    const favs = localStorage.getItem("favs");
    setPageTitle(PageTitles.FAVORITES);
    setMoviesPage(1);
    setMoviesTotalPages(1);
    if (favs) {
      try {
        const favsArray = JSON.parse(favs);
        setPopularMovies(Array.isArray(favsArray) ? favsArray : []);
      } catch (error) {
        setErrorMsg(error?.message || "Erro ao carregar favoritos.");
        setPopularMovies([]);
      }
    } else {
      setPopularMovies([]);
    }
  }

  function loadPopular() {
    setPageTitle(PageTitles.POPULAR);
    setMoviesPage(1);
  }

  function openDetails(id) {
    setDetailsId(id);
    setShowDetails(true);
  }

  return (
    <>
      <Navbar expand="xxl" className="bg-body-tertiary">
        <Container fluid>
          <Navbar.Brand
            href="#"
            onClick={(e) => {
              e.preventDefault();
              loadPopular();
            }}
          >
            Cine finder{" "}
            <img
              src={MovieCinemaSVG}
              alt="Cinema"
              style={{ width: "20px", height: "20px", marginBottom: "3px" }}
            />
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="navbarScroll" />
          <Navbar.Collapse id="navbarScroll">
            <Nav
              className="me-auto my-2 my-lg-0"
              style={{ maxHeight: "120px" }}
              navbarScroll
            >
              <Nav.Link
                href="#favorites"
                onClick={(e) => {
                  e.preventDefault();
                  loadFavorites();
                }}
              >
                Favoritos{" "}
                <BsStarFill
                  style={{
                    color: "#f4c542",
                    marginBottom: "3px",
                    width: "20px",
                    height: "20px",
                  }}
                />
              </Nav.Link>
            </Nav>
            <Form className="d-flex">
              <Form.Control
                type="search"
                placeholder="Digite um título"
                className="me-3"
                aria-label="Search"
              />
              <Button variant="outline-success">Pesquisar</Button>
            </Form>
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
      />
      <PaginationControls
        currentPage={moviesPage}
        totalPages={moviesTotalPages}
        onPageChange={setMoviesPage}
        isDisabled={isLoadingPopularMovies}
      />
      <ErrorModal errorMsg={errorMsg} />
    </>
  );
}

export default App;
