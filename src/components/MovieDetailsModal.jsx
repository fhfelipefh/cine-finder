import { useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import {
  Modal,
  Row,
  Col,
  Badge,
  Spinner,
  Button,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import { getMovieDetails, getSimilarMovies } from "../api/api";
import { BsInfoCircle } from "react-icons/bs";

const IMG_POSTER = "https://image.tmdb.org/t/p/w500";
const IMG_SM = "https://image.tmdb.org/t/p/w185";

function getCertification(release_dates, country = "BR") {
  const entry = release_dates?.results?.find((r) => r.iso_3166_1 === country);
  if (!entry) return "";
  const withCert = (entry.release_dates || []).filter((d) => d.certification);
  if (withCert.length === 0) return "";
  withCert.sort((a, b) => {
    const da = a.release_date ? new Date(a.release_date).getTime() : 0;
    const db = b.release_date ? new Date(b.release_date).getTime() : 0;
    return db - da;
  });
  return withCert[0].certification;
}

function getYoutubeKey(videos) {
  const list = videos?.results || [];
  return (
    list.find((v) => v.site === "YouTube" && v.type === "Trailer")?.key ??
    list.find((v) => v.site === "YouTube" && v.type === "Teaser")?.key ??
    null
  );
}

export default function MovieDetailsModal({
  show,
  movieId,
  onHide,
  onPickRecommendation,
}) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState(null);
  const [err, setErr] = useState("");
  const [recs, setRecs] = useState([]);

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

  const meta = useMemo(() => {
    if (!details) return {};
    const title = details.title || details.original_title || "—";
    const year = details.release_date
      ? ` (${new Date(details.release_date).getFullYear()})`
      : "";
    const poster = details.poster_path
      ? `${IMG_POSTER}${details.poster_path}`
      : "/no-poster.png";
    const spoken =
      (details.spoken_languages || []).map((l) => l.english_name).join(", ") ||
      "—";
    const countries =
      (details.production_countries || []).map((c) => c.name).join(", ") || "—";
    const brCert = getCertification(details.release_dates, "BR");
    const ytKey = getYoutubeKey(details.videos);
    return { title, year, poster, spoken, countries, brCert, ytKey };
  }, [details]);

  useEffect(() => {
    if (!details) {
      setRecs([]);
      return;
    }

    const base = details.recommendations?.results ?? [];
    const filtered = base
      .filter((r) => !r.adult && r.poster_path)
      .sort(
        (a, b) => b.vote_count - a.vote_count || b.popularity - a.popularity
      )
      .slice(0, 10);

    if (filtered.length > 0) {
      setRecs(filtered);
      return;
    }

    let alive = true;
    (async () => {
      try {
        const data = await getSimilarMovies(details.id);
        if (!alive) return;
        const fromSimilar = (data.results ?? [])
          .filter((r) => !r.adult && r.poster_path)
          .sort(
            (a, b) => b.vote_count - a.vote_count || b.popularity - a.popularity
          )
          .slice(0, 10);
        setRecs(fromSimilar);
      } catch {
        setRecs([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [details]);

  return (
    <Modal show={show} onHide={onHide} centered size="xl" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {meta.title}
          {meta.year}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {loading && (
          <div className="d-flex justify-content-center my-4">
            <Spinner animation="border" as="output" aria-live="polite" />
          </div>
        )}

        {!loading && err && <p className="text-danger">{err}</p>}

        {!loading && !err && details && (
          <>
            <Row className="g-3">
              <Col xs={12} md="auto">
                <img
                  alt={`Pôster de ${meta.title}`}
                  src={meta.poster}
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
                {meta.brCert && (
                  <div className="mb-2">
                    <small className="text-muted me-1">
                      Classificação (BR):
                    </small>
                    <Badge bg="secondary">{meta.brCert}</Badge>
                  </div>
                )}

                <div className="mb-2 d-flex align-items-center flex-wrap gap-1">
                  <small className="text-muted">Idiomas originais:</small>
                  <span>{meta.spoken}</span>
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip>
                        Esses são os idiomas falados na produção original.
                        Dublagens variam por serviço/região.
                      </Tooltip>
                    }
                  >
                    <span aria-label="informação" className="text-muted">
                      <BsInfoCircle size={12} />
                    </span>
                  </OverlayTrigger>
                </div>

                <div className="mb-3">
                  <small className="text-muted">País(es) de origem:</small>{" "}
                  {meta.countries}
                </div>

                <div className="d-flex gap-2 flex-wrap mb-3">
                  {details.homepage && (
                    <Button
                      size="sm"
                      variant="outline-primary"
                      as="a"
                      href={details.homepage}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Site oficial
                    </Button>
                  )}
                  {details.imdb_id && (
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      as="a"
                      href={`https://www.imdb.com/title/${details.imdb_id}/`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver no IMDb
                    </Button>
                  )}
                </div>

                <p style={{ whiteSpace: "pre-line", textAlign: "justify" }}>
                  {details.overview || "Sem sinopse disponível."}
                </p>
              </Col>
            </Row>

            {meta.ytKey && (
              <div className="mt-3">
                <div className="ratio ratio-16x9">
                  <iframe
                    src={`https://www.youtube.com/embed/${meta.ytKey}`}
                    title="Trailer"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {recs.length > 0 && (
              <>
                <hr className="my-4" />
                <h6 className="mb-3">Recomendações</h6>
                <div className="d-flex gap-3 flex-wrap">
                  {recs.map((r) => {
                    const p = r.poster_path
                      ? `${IMG_SM}${r.poster_path}`
                      : "/no-poster.png";
                    const label = r.title || r.original_title || "—";
                    return (
                      <Button
                        key={r.id}
                        variant="light"
                        className="p-0 border-0"
                        onClick={() => onPickRecommendation?.(r.id)}
                        title={label}
                      >
                        <img
                          src={p}
                          alt={label}
                          loading="lazy"
                          style={{
                            width: 92,
                            height: 138,
                            objectFit: "cover",
                            borderRadius: 6,
                          }}
                        />
                      </Button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}

MovieDetailsModal.propTypes = {
  show: PropTypes.bool.isRequired,
  movieId: PropTypes.number,
  onHide: PropTypes.func.isRequired,
  onPickRecommendation: PropTypes.func,
};
