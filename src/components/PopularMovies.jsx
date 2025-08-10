import PropTypes from "prop-types";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import LoadingSkeleton from "./LoadingSkeleton";
import { Container } from "react-bootstrap";

const IMG_BASE = "https://image.tmdb.org/t/p/w500";

function PopularMovies({ isLoadingPopularMovies, popularMovies = [] }) {
  if (isLoadingPopularMovies) return <LoadingSkeleton />;

  if (
    !Array.isArray(popularMovies) ||
    (popularMovies.length === 0 && !isLoadingPopularMovies)
  ) {
    return <p className="text-center my-4">Nenhum filme encontrado.</p>;
  }

  return (
    <Container className="my-1">
      <Row xs={2} sm={3} md={4} lg={6} xl={8}>
        {popularMovies.map((m) => {
          const poster = m.poster_path
            ? `${IMG_BASE}${m.poster_path}`
            : "/no-poster.png";
          const title = m.title || m.original_title || "Sem título";
          const original = m.original_title ? ` (${m.original_title})` : "";
          const year = m.release_date
            ? ` • ${new Date(m.release_date).getFullYear()}`
            : "";
          const rating =
            typeof m.vote_average === "number"
              ? m.vote_average.toFixed(1)
              : "–";
          const overview = m.overview || "Sem sinopse disponível.";

          return (
            <Col key={m.id}>
              <Card className="h-90">
                <Card.Img
                  variant="top"
                  src={poster}
                  alt={`Pôster de ${title}`}
                  loading="lazy"
                />
                <Card.Body>
                  <Card.Title className="mb-1">
                    {title}
                    {original}
                    {year}
                  </Card.Title>
                  <Card.Subtitle className="text-muted mb-2">
                    ⭐ {rating}
                  </Card.Subtitle>
                  <Card.Text
                    className="text-truncate"
                    style={{
                      WebkitLineClamp: 3,
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {overview}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Container>
  );
}

PopularMovies.propTypes = {
  isLoadingPopularMovies: PropTypes.bool,
  popularMovies: PropTypes.arrayOf(PropTypes.object),
};

export default PopularMovies;
