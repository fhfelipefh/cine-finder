import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { getRanking, findMovieByImdbId } from "../api/api";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import { BsStarFill } from "react-icons/bs";
import { useAuth } from "../auth/AuthContext";

const IMG_BASE = "https://image.tmdb.org/t/p/w342";

export default function CommunityTop({ limit = 8, onSelect }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const { isAuthenticated, openAuthModal } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const ranking = await getRanking();
        if (!alive) return;
        const top = (ranking || [])
          .filter((r) => r?.imdbId)
          .sort((a, b) => b.average - a.average || b.count - a.count)
          .slice(0, limit);

        const mapped = await Promise.all(
          top.map(async (r) => {
            const tmdb = await findMovieByImdbId(r.imdbId).catch(() => null);
            if (!tmdb) return null;
            return { ...r, tmdb };
          })
        );
        setItems(mapped.filter(Boolean));
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Erro ao carregar ranking");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [limit, isAuthenticated]);

  const content = useMemo(() => {
    if (!isAuthenticated)
      return (
        <p className="text-muted">
          Faça login para ver o top da comunidade.{" "}
          <button
            type="button"
            className="btn btn-link p-0 align-baseline"
            onClick={() => openAuthModal("login")}
          >
            Entrar
          </button>
        </p>
      );
    if (loading) return <p className="text-muted">Carregando ranking.</p>;
    if (error) return <p className="text-danger">{error}</p>;
    if (!items.length) return <p className="text-muted">Sem votos ainda.</p>;
    return (
      <Row xs={2} sm={3} md={4} lg={6} xl={8} className="g-3">
        {items.map((it) => {
          const m = it.tmdb;
          const poster = m?.poster_path
            ? `${IMG_BASE}${m.poster_path}`
            : "/no-poster.png";
          const title = m?.title || m?.original_title || "-";
          const rating = Number(it.average || 0).toFixed(1);
          const year = m?.release_date
            ? new Date(m.release_date).getFullYear()
            : "";
          return (
            <Col key={`${it.imdbId}`}>
              <Card className="h-100" onClick={() => onSelect?.(m?.id)}>
                <Card.Img
                  variant="top"
                  src={poster}
                  alt={`Pôster de ${title}`}
                  loading="lazy"
                />
                <Card.Body>
                  <Card.Title className="title">{title}</Card.Title>
                  <Card.Subtitle className="text-muted mb-2">
                    {year}
                  </Card.Subtitle>
                  <div className="rating" aria-label={`Média ${rating}`}>
                    <BsStarFill size={14} />
                    <span>
                      {rating} ({it.count})
                    </span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  }, [items, loading, error, onSelect, isAuthenticated, openAuthModal]);

  return (
    <Container className="my-4">
      <h4 className="mb-3 border-bottom pb-2">Top da Comunidade</h4>
      {content}
    </Container>
  );
}

CommunityTop.propTypes = {
  limit: PropTypes.number,
  onSelect: PropTypes.func,
};
