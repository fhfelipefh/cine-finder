import PropTypes from "prop-types";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";
import LoadingSkeleton from "./LoadingSkeleton";
import { BsStarFill } from "react-icons/bs";
import { PageTitles } from "../constants";
import FavoriteButton from "../favorites/FavoriteButton.jsx";

const IMG_BASE = "https://image.tmdb.org/t/p/w342";

function Movies({
  isLoadingMovies,
  movies = [],
  title = PageTitles.POPULAR,
  onSelect,
  onEditFavorite,
}) {
  if (isLoadingMovies) return <LoadingSkeleton />;

  if (!Array.isArray(movies) || movies.length === 0) {
    return (
      <Container className="my-2">
        <h4 className="mb-3 border-bottom pb-2">{title}</h4>
        <p className="text-center my-4">Nenhum filme encontrado.</p>
      </Container>
    );
  }

  return (
    <Container className="my-2">
      <h4 className="mb-3 border-bottom pb-2">{title}</h4>

      <Row xs={2} sm={3} md={4} lg={6} xl={8} className="g-3">
        {movies.map((m) => {
          const tmdbId =
            typeof m.id === "number"
              ? m.id
              : typeof m.tmdbId === "number"
              ? m.tmdbId
              : null;
          const poster = m.poster_path
            ? `${IMG_BASE}${m.poster_path}`
            : "/no-poster.png";
          const original =
            m.original_title && m.original_title !== m.title
              ? ` (${m.original_title})`
              : "";
          const cardTitle = m.title || m.original_title || original;
          const year = m.release_date
            ? ` (${new Date(m.release_date).getFullYear()})`
            : "";
          const rating =
            typeof m.vote_average === "number"
              ? m.vote_average.toFixed(1)
              : "-";
          const overview = m.overview || "Sem sinopse disponível.";
          const favNotes =
            typeof m.__favoriteNotes === "string" ? m.__favoriteNotes : "";
          const favImdbId = m.__favoriteImdbId;
          const hasNotes = favNotes.trim().length > 0;

          const movieKey = tmdbId ?? m.__favoriteImdbId ?? cardTitle;

          return (
            <Col key={movieKey}>
              <Card
                className="h-100 movie-card"
                onClick={() => tmdbId && onSelect?.(tmdbId)}
              >
                {tmdbId && <FavoriteButton movieId={tmdbId} />}
                <Card.Img
                  variant="top"
                  src={poster}
                  alt={`Pôster de ${cardTitle}`}
                  loading="lazy"
                />
                <Card.Body>
                  <Card.Title className="title">{cardTitle}</Card.Title>

                  <Card.Subtitle className="text-muted mb-2">
                    {year}
                  </Card.Subtitle>

                  <div className="rating" aria-label={`Avaliação ${rating}`}>
                    <BsStarFill size={14} />
                    <span>{rating}</span>
                  </div>

                  <Card.Text className="overview">{overview}</Card.Text>

                  {hasNotes && (
                    <Card.Text className="text-muted small mt-2">
                      Anotações: {favNotes}
                    </Card.Text>
                  )}

                  {onEditFavorite && favImdbId && (
                    <button
                      className="btn btn-outline-primary btn-sm mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditFavorite({
                          imdbId: favImdbId,
                          title: cardTitle,
                          notes: favNotes || "",
                        });
                      }}
                    >
                      Editar anotação
                    </button>
                  )}

                  <button
                    className="btn btn-secondary mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      tmdbId && onSelect?.(tmdbId);
                    }}
                  >
                    Ver detalhes
                  </button>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Container>
  );
}

Movies.propTypes = {
  isLoadingMovies: PropTypes.bool,
  movies: PropTypes.arrayOf(PropTypes.object),
  title: PropTypes.string,
  onSelect: PropTypes.func,
  onEditFavorite: PropTypes.func,
};

export default Movies;
