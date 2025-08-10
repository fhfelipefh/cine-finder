import { useEffect, useState } from "react";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Form from "react-bootstrap/Form";
import Navbar from "react-bootstrap/Navbar";
import Movies from "./components/Movies.jsx";
import "./App.css";
import { getPopularMovies } from "./api/api.js";
import ErrorModal from "./components/ErrorModal.jsx";
import PaginationControls from "./components/PaginationControls.jsx";

function App() {
  const [popularMovies, setPopularMovies] = useState([]);
  const [moviesPage, setMoviesPage] = useState(1);
  const [moviesTotalPages, setMoviesTotalPages] = useState(1);
  const [moviesTotalResults, setMoviesTotalResults] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoadingPopularMovies, setIsLoadingPopularMovies] = useState(true);
  const [pageTitle, setPageTitle] = useState("Filmes Populares");

  useEffect(() => {
    async function fetchPopularMovies() {
      try {
        const data = await getPopularMovies(moviesPage);
        setPopularMovies(data.results);
        setMoviesTotalPages(data.total_pages);
        setMoviesTotalResults(data.total_results);
        setIsLoadingPopularMovies(false);
      } catch (error) {
        setErrorMsg(error);
      }
    }

    fetchPopularMovies();
  }, [moviesPage]);

  return (
    <>
      <Navbar expand="xxl" className="bg-body-tertiary">
        <Container fluid>
          <Navbar.Brand href="#">Cine finder</Navbar.Brand>
          <Navbar.Toggle aria-controls="navbarScroll" />
          <Navbar.Collapse id="navbarScroll">
            <Nav
              className="me-auto my-2 my-lg-0"
              style={{ maxHeight: "120px" }}
              navbarScroll
            >
              <Nav.Link href="#action1">Favoritos</Nav.Link>
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
      ></Movies>
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
