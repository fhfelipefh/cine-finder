import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Row, Col, Badge } from "react-bootstrap";
import { getMovieDetails } from "../api/api";
import { BsStarFill } from "react-icons/bs";

const IMG_BASE = "https://image.tmdb.org/t/p/w500";

export default function MovieDetailsModal({ show, movieId, onHide }) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!show || !movieId) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const data = await getMovieDetails(movieId);
        if (!active) return;
        setDetails(data);
      } catch (e) {
        if (!active) return;
        setErr(e?.message || "Erro ao carregar detalhes.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [show, movieId]);

  const title = details?.title || details?.original_title || "—";
  const year = details?.release_date
    ? ` (${new Date(details.release_date).getFullYear()})`
    : "";
  const poster = details?.poster_path
    ? `${IMG_BASE}${details.poster_path}`
    : "/no-poster.png";
  const rating =
    typeof details?.vote_average === "number"
      ? details.vote_average.toFixed(1)
      : "–";
  const runtime = details?.runtime ? `${details.runtime} min` : "—";
  const genres = (details?.genres || []).map((g) => g.name);
  const director =
    details?.credits?.crew?.find((c) => c.job === "Director")?.name || "—";
  const cast = (details?.credits?.cast || []).slice(0, 5).map((c) => c.name);

  return (
    <Modal show={show} onHide={onHide} centered size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {title}
          {year}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {loading && <p>Carregando…</p>}
        {!loading && err && <p className="text-danger">{err}</p>}

        {!loading && !err && details && (
          <Row className="g-3">
            <Col xs={12} md="auto">
              <img
                alt={`Pôster de ${title}`}
                src={poster}
                style={{
                  width: 220,
                  height: "auto",
                  borderRadius: 8,
                  objectFit: "cover",
                }}
                loading="lazy"
              />
            </Col>
            <Col>
              <div className="d-flex align-items-center gap-2 mb-2 text-muted">
                <BsStarFill size={14} /> <strong>{rating}</strong>
                <span>•</span> <span>{runtime}</span>
              </div>

              {genres.length > 0 && (
                <div className="mb-2">
                  {genres.map((g) => (
                    <Badge key={g} bg="secondary" className="me-1">
                      {g}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="mb-2">
                <small className="text-muted">Direção:</small> {director}
              </div>

              {cast.length > 0 && (
                <div className="mb-3">
                  <small className="text-muted">Elenco:</small>{" "}
                  {cast.join(", ")}
                </div>
              )}

              <p style={{ whiteSpace: "pre-line" }}>
                {details.overview || "Sem sinopse disponível."}
              </p>
            </Col>
          </Row>
        )}
      </Modal.Body>
    </Modal>
  );
}

MovieDetailsModal.propTypes = {
  show: PropTypes.bool.isRequired,
  movieId: PropTypes.number,
  onHide: PropTypes.func.isRequired,
};
