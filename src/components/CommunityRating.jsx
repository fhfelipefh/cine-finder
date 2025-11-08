import { useEffect, useMemo, useState, Fragment } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Rating,
  Chip,
  LinearProgress,
  Tooltip,
  IconButton,
  Button as MButton,
} from "@mui/material";
import { MdDelete } from "react-icons/md";
import {
  getMovieStats,
  createOrUpdateVote,
  getMyVotes,
  deleteVote,
} from "../api/api";
import { useAuth } from "../auth/AuthContext";

function formatAvg(n) {
  if (!n && n !== 0) return "–";
  return Number(n).toFixed(1);
}

export default function CommunityRating({ imdbId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [myVotes, setMyVotes] = useState([]);
  const [sending, setSending] = useState(false);
  const { isAuthenticated, openAuthModal } = useAuth();
  const myVote = useMemo(
    () => myVotes.find((v) => v.imdbId === imdbId) || null,
    [myVotes, imdbId]
  );

  async function refresh() {
    if (!imdbId || !isAuthenticated) {
      setStats(null);
      setMyVotes([]);
      return;
    }
    setLoading(true);
    try {
      const [s, mine] = await Promise.all([
        getMovieStats(imdbId).catch(() => null),
        getMyVotes().catch(() => []),
      ]);
      setStats(s);
      setMyVotes(Array.isArray(mine) ? mine : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [imdbId, isAuthenticated]);

  async function onChangeVote(_, value) {
    if (!value) return;
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    try {
      setSending(true);
      await createOrUpdateVote({ imdbId, rating: value });
      await refresh();
    } catch (e) {
      console.error(e);
      alert(e?.message || "Erro ao enviar voto");
    } finally {
      setSending(false);
    }
  }

  async function onRemoveVote() {
    if (!myVote) return;
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    try {
      setSending(true);
      await deleteVote(myVote.id);
      await refresh();
    } catch (e) {
      console.error(e);
      alert(e?.message || "Erro ao remover voto");
    } finally {
      setSending(false);
    }
  }

  const avg = stats?.average ?? 0;
  const count = stats?.count ?? 0;
  const hist = stats?.histogram || stats?.breakdown || {};

  const bars = useMemo(() => {
    const arr = [];
    for (let i = 10; i >= 1; i--) {
      const c = Number(hist[i]) || 0;
      arr.push({ score: i, count: c });
    }
    const max = Math.max(1, ...arr.map((b) => b.count));
    return arr.map((b) => ({ ...b, pct: Math.round((b.count / max) * 100) }));
  }, [hist]);

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          p: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.paper",
          textAlign: "center",
        }}
      >
        <p className="mb-2">Faça login para participar da avaliação.</p>
        <MButton variant="contained" size="small" onClick={() => openAuthModal("login")}>
          Entrar
        </MButton>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Chip color="primary" label={`Média da comunidade: ${formatAvg(avg)}`} />
          <Chip variant="outlined" label={`${count} voto${count === 1 ? "" : "s"}`} />
        </Box>
        {myVote && (
          <Tooltip title="Remover meu voto">
            <span>
              <IconButton size="small" color="error" onClick={onRemoveVote} disabled={sending}>
                <MdDelete />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <span>Minha nota:</span>
        <Rating value={myVote?.rating || 0} onChange={onChangeVote} disabled={sending || loading} />
        {myVote && <Chip size="small" label={`(${myVote.rating})`} />}
      </Box>

      {loading && <LinearProgress />}

      {bars.some((b) => b.count > 0) && (
        <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 0.5 }}>
          {bars.map((b) => (
            <Fragment key={b.score}>
              <Box sx={{ textAlign: "right", pr: 1 }}>{b.score}</Box>
              <Box sx={{ alignSelf: "center" }}>
                <Box sx={{ height: 8, borderRadius: 4, bgcolor: "divider", position: "relative" }}>
                  <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${b.pct}%`, bgcolor: "primary.main", borderRadius: 4 }} />
                </Box>
              </Box>
              <Box sx={{ pl: 1, color: "text.secondary" }}>{b.count}</Box>
            </Fragment>
          ))}
        </Box>
      )}
    </Box>
  );
}

CommunityRating.propTypes = {
  imdbId: PropTypes.string.isRequired,
};
