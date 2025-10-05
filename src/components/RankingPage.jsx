import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import Form from "react-bootstrap/Form";
import { BsStarFill, BsPencilSquare, BsTrash } from "react-icons/bs";
import { getRanking, findMovieByImdbId, getMyVotes, updateVote, deleteVote } from "../api/api";

const IMG_BASE = "https://image.tmdb.org/t/p/w342";

function TopList({ onSelect }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const ranking = await getRanking();
        if (!alive) return;
        const mapped = await Promise.all(
          (ranking || [])
            .filter((r) => r?.imdbId)
            .sort((a, b) => b.average - a.average || b.count - a.count)
            .map(async (r) => {
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
  }, []);

  if (loading) return <p className="text-muted">Carregando ranking…</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!items.length) return <p className="text-muted">Sem votos ainda.</p>;

  return (
    <Row xs={2} sm={3} md={4} lg={5} xl={6} className="g-3">
      {items.map((it) => {
        const m = it.tmdb;
        const poster = m?.poster_path ? `${IMG_BASE}${m.poster_path}` : "/no-poster.png";
        const title = m?.title || m?.original_title || "–";
        const rating = Number(it.average || 0).toFixed(1);
        const year = m?.release_date ? new Date(m.release_date).getFullYear() : "";
        return (
          <Col key={`${it.imdbId}`}>
            <Card className="h-100" onClick={() => onSelect?.(m?.id)}>
              <Card.Img variant="top" src={poster} alt={`Pôster de ${title}`} loading="lazy" />
              <Card.Body>
                <Card.Title className="title">{title}</Card.Title>
                <Card.Subtitle className="text-muted mb-2">{year}</Card.Subtitle>
                <div className="rating" aria-label={`Média ${rating}`}>
                  <BsStarFill size={14} />
                  <span>{rating} ({it.count})</span>
                </div>
              </Card.Body>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}

TopList.propTypes = { onSelect: PropTypes.func };

function MyVotes({ onSelect }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [newRating, setNewRating] = useState(0);
  const [details, setDetails] = useState({});

  async function refresh() {
    setLoading(true);
    try {
      const mine = await getMyVotes();
      setItems(Array.isArray(mine) ? mine : []);
    } catch (e) {
      setError(e?.message || "Erro ao carregar meus votos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ids = Array.from(new Set(items.map((i) => i.imdbId).filter(Boolean)));
        if (ids.length === 0) {
          if (alive) setDetails({});
          return;
        }
        const results = await Promise.all(
          ids.map(async (id) => {
            const tmdb = await findMovieByImdbId(id).catch(() => null);
            return [id, tmdb];
          })
        );
        if (!alive) return;
        const map = Object.fromEntries(results.filter(Boolean));
        setDetails(map);
      } catch {
        return 0;
      }
    })();
    return () => {
      alive = false;
    };
  }, [items]);

  async function onSave(it) {
    try {
      await updateVote(it.id, { rating: Number(newRating) });
      setEditing(null);
      setNewRating(0);
      await refresh();
    } catch (e) {
      setError(e?.message || "Erro ao atualizar voto");
    }
  }

  async function onDelete(it) {
    try {
      await deleteVote(it.id);
      await refresh();
    } catch (e) {
      setError(e?.message || "Erro ao remover voto");
    }
  }

  if (loading) return <p className="text-muted">Carregando…</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!items.length) return <p className="text-muted">Você ainda não votou em nenhum filme.</p>;

  return (
    <div className="d-flex flex-column gap-2">
      {items.map((it) => {
        const tmdb = details[it.imdbId];
        const poster = tmdb?.poster_path ? `${IMG_BASE}${tmdb.poster_path}` : "/no-poster.png";
        const title = tmdb?.title || tmdb?.original_title || it.imdbId;
        const year = tmdb?.release_date ? new Date(tmdb.release_date).getFullYear() : "";
        return (
          <Card key={it.id}>
            <Card.Body className="d-flex align-items-center gap-3 flex-wrap">
              <img
                src={poster}
                alt={`Pôster de ${title}`}
                loading="lazy"
                style={{ width: 60, height: 90, objectFit: "cover", borderRadius: 6, cursor: tmdb ? "pointer" : "default" }}
                onClick={() => tmdb?.id && onSelect?.(tmdb.id)}
              />
              <div className="flex-grow-1" style={{ minWidth: 220 }}>
                <div><strong>{title}</strong> {year && <span className="text-muted">({year})</span>}</div>
                <div className="text-muted small">IMDb: {it.imdbId} • Seu voto: {it.rating}</div>
              </div>
              {editing?.id === it.id ? (
                <div className="d-flex align-items-center gap-2 ms-auto">
                  <Form.Select
                    value={newRating}
                    onChange={(e) => setNewRating(e.target.value)}
                    style={{ width: 80 }}
                  >
                    {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </Form.Select>
                  <Button variant="success" size="sm" onClick={() => onSave(it)}>Salvar</Button>
                  <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
                </div>
              ) : (
                <div className="d-flex align-items-center gap-2 ms-auto">
                  <Button variant="outline-primary" size="sm" onClick={() => { setEditing(it); setNewRating(it.rating); }}>
                    <BsPencilSquare /> Editar
                  </Button>
                  <Button variant="outline-danger" size="sm" onClick={() => onDelete(it)}>
                    <BsTrash /> Remover
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        );
      })}
    </div>
  );
}

export default function RankingPage({ onSelectMovie }) {
  const [key, setKey] = useState("top");
  return (
    <Container className="my-3">
      <h4 className="mb-3 border-bottom pb-2">Ranking</h4>
      <Tabs activeKey={key} onSelect={(k) => setKey(k || "top")} className="mb-3">
        <Tab eventKey="top" title="Top da Comunidade">
          <TopList onSelect={onSelectMovie} />
        </Tab>
        <Tab eventKey="mine" title="Meus Votos">
          <MyVotes onSelect={onSelectMovie} />
        </Tab>
      </Tabs>
    </Container>
  );
}

RankingPage.propTypes = {
  onSelectMovie: PropTypes.func,
};
