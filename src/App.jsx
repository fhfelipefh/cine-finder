import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import popCornLogo from "/popcorn-movie-cinema.svg";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Form from "react-bootstrap/Form";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";
import PopularMovies from "./components/PopularMovies.jsx";
import "./App.css";
import { getPopularMovies } from "./api/api.js";
import ErrorModal from "./components/ErrorModal.jsx";

function App() {
  const [popularMovies, setPopularMovies] = useState([]);
  const [popularMoviesPage, setPopularMoviesPage] = useState(1)
  const [enablePopularMoviesPagination, setEnablePopularMoviesPagination] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoadingPopularMovies, setIsLoadingPopularMovies] = useState(true);

  useEffect(() => {
    async function fetchPopularMovies() {
      try {
        const data = await getPopularMovies(popularMoviesPage);
        setPopularMovies(data.results);
        setEnablePopularMoviesPagination(true);
        setIsLoadingPopularMovies(false);
      } catch (error) {
        setErrorMsg(error);
      }
    }

    fetchPopularMovies();
  }, [popularMoviesPage]);

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
      <PopularMovies isLoadingPopularMovies={isLoadingPopularMovies} popularMovies={popularMovies}></PopularMovies>
      <ErrorModal errorMsg={errorMsg} />
    </>
  );
}

export default App;
