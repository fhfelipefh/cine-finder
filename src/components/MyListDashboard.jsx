import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  listMyListEntries,
  getMyListStats,
  upsertMyListEntry,
  updateMyListEntry,
  deleteMyListEntry,
} from "../api/api";
import { useAuth } from "../auth/AuthContext";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Rating,
  Select,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ListAltIcon from "@mui/icons-material/ListAlt";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ReplayCircleFilledIcon from "@mui/icons-material/ReplayCircleFilled";
import StarRateIcon from "@mui/icons-material/StarRate";
import LocalMoviesIcon from "@mui/icons-material/LocalMovies";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

const statusOptions = [
  { value: "all", label: "Todos", icon: ListAltIcon },
  { value: "watching", label: "Assistindo", icon: PlayCircleOutlineIcon },
  { value: "completed", label: "Concluídos", icon: CheckCircleOutlineIcon },
  { value: "on-hold", label: "Em pausa", icon: PauseCircleOutlineIcon },
  { value: "dropped", label: "Dropados", icon: HighlightOffIcon },
  { value: "plan-to-watch", label: "Planejado", icon: ScheduleIcon },
  { value: "rewatching", label: "Reassistindo", icon: ReplayCircleFilledIcon },
];

const priorityOptions = [
  { value: "all", label: "Todas" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
];

const sortOptions = [
  { value: "updatedAt", label: "Atualizados recentemente" },
  { value: "createdAt", label: "Adicionados recentemente" },
  { value: "score", label: "Maior nota" },
  { value: "progress", label: "Maior progresso" },
];

const statusLabels = statusOptions.reduce((acc, cur) => {
  if (cur.value !== "all") acc[cur.value] = cur.label;
  return acc;
}, {});

const statusColors = {
  watching: "primary",
  completed: "success",
  "on-hold": "warning",
  dropped: "error",
  "plan-to-watch": "default",
  rewatching: "info",
};

const priorityColors = {
  high: "error",
  medium: "warning",
  low: "info",
};

const defaultFilters = Object.freeze({
  status: "all",
  priority: "all",
  search: "",
  sortBy: "updatedAt",
  sortDirection: "desc",
  page: 1,
  pageSize: 8,
});

export default function MyListDashboard({ onSelectMovie }) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [filters, setFilters] = useState(defaultFilters);
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [pageInfo, setPageInfo] = useState({ page: 1, totalPages: 1 });
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [newEntry, setNewEntry] = useState({
    imdbId: "",
    status: "watching",
    priority: "medium",
    score: "",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setEntries([]);
      setStats(null);
      return;
    }
    loadStats();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAuthenticated,
    filters.status,
    filters.priority,
    filters.search,
    filters.sortBy,
    filters.sortDirection,
    filters.page,
    filters.pageSize,
  ]);

  async function loadEntries() {
    setLoadingEntries(true);
    setError("");
    try {
      const data = await listMyListEntries({
        status: filters.status,
        priority: filters.priority,
        search: filters.search.trim(),
        sortBy: filters.sortBy,
        sortDirection: filters.sortDirection,
        page: filters.page,
        pageSize: filters.pageSize,
      });
      setEntries(data.items || []);
      const totalPages = Math.max(
        1,
        Math.ceil((data.total || data.items?.length || 1) / data.pageSize)
      );
      setPageInfo({ page: data.page || 1, totalPages });
    } catch (e) {
      setEntries([]);
      setError(e?.message || "Erro ao carregar sua lista.");
    } finally {
      setLoadingEntries(false);
    }
  }

  async function loadStats() {
    setLoadingStats(true);
    setError("");
    try {
      const data = await getMyListStats();
      setStats(data || null);
    } catch (e) {
      setStats(null);
      setError(e?.message || "Erro ao carregar estat�sticas da lista.");
    } finally {
      setLoadingStats(false);
    }
  }

  function handleFilterChange(partial) {
    setFilters((prev) => {
      const next = { ...prev, ...partial };
      if (
        partial.status !== undefined ||
        partial.priority !== undefined ||
        partial.search !== undefined ||
        partial.sortBy !== undefined ||
        partial.sortDirection !== undefined ||
        partial.pageSize !== undefined
      ) {
        next.page = partial.page ?? 1;
      }
      if (partial.page !== undefined) {
        next.page = partial.page;
      }
      return next;
    });
  }

  async function handleQuickUpdate(entryId, payload, message) {
    if (!entryId) return;
    setUpdatingId(entryId);
    setError("");
    try {
      const updated = await updateMyListEntry(entryId, payload);
      setEntries((prev) =>
        prev.map((item) =>
          String(item.id) === String(entryId)
            ? { ...item, ...updated, ...payload }
            : item
        )
      );
      setSuccess(message || "Entrada atualizada.");
      loadStats();
    } catch (e) {
      setError(e?.message || "N�o foi poss�vel atualizar a entrada.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCreateEntry(e) {
    e.preventDefault();
    if (!newEntry.imdbId.trim()) {
      setError("Informe um IMDb ID para adicionar um filme.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await upsertMyListEntry({
        imdbId: newEntry.imdbId,
        status: newEntry.status,
        priority: newEntry.priority,
        score:
          newEntry.score === "" || newEntry.score === null
            ? undefined
            : Number(newEntry.score),
      });
      setNewEntry({
        imdbId: "",
        status: "watching",
        priority: "medium",
        score: "",
      });
      setSuccess("Filme atualizado na sua lista.");
      await Promise.all([loadEntries(), loadStats()]);
    } catch (e) {
      setError(e?.message || "N�o foi poss�vel adicionar o filme.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteEntry(entryId) {
    if (!entryId) return;
    setUpdatingId(entryId);
    setError("");
    try {
      await deleteMyListEntry(entryId);
      setEntries((prev) => prev.filter((item) => String(item.id) !== String(entryId)));
      setSuccess("Entrada removida.");
      loadStats();
    } catch (e) {
      setError(e?.message || "N�o foi poss�vel remover a entrada.");
    } finally {
      setUpdatingId(null);
    }
  }

  const statusSummary = useMemo(() => {
    const counts = stats?.counts || stats?.statusCounts || {};
    return statusOptions
      .filter((option) => option.value !== "all")
      .map((option) => ({
        label: option.label,
        value: counts?.[option.value] ?? 0,
        icon: option.icon,
      }));
  }, [stats]);

  const derivedStats = useMemo(() => {
    const totalEntries =
      stats?.totalEntries ??
      stats?.total ??
      stats?.counts?.total ??
      stats?.statusCounts?.total ??
      entries.length;
    const avgScore = Number(
      stats?.averageScore ?? stats?.avgScore ?? stats?.meanScore ?? 0
    ).toFixed(1);
    const totalRewatches =
      stats?.rewatchCount ?? stats?.rewatches ?? stats?.totalRewatches ?? 0;
    const totalProgress =
      stats?.totalProgress ??
      stats?.minutesWatched ??
      stats?.hoursWatched ??
      0;
    return {
      totalEntries,
      avgScore,
      totalRewatches,
      totalProgress,
    };
  }, [stats, entries.length]);

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          maxWidth: 680,
          mx: "auto",
          my: 6,
          p: 4,
          borderRadius: 3,
          bgcolor: "background.paper",
          textAlign: "center",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="h5" gutterBottom>
          Minha Lista personalizada
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Guarde o status de cada filme, notas, progresso e prioridades em um
          painel inspirado no MyAnimeList. Entre para sincronizar seus dados.
        </Typography>
        <Button variant="contained" onClick={() => openAuthModal("login")}>
          Entrar para continuar
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 } }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Minha Lista
          </Typography>
          <Typography color="text.secondary">
            Controle completo de status, notas e prioridades dos seus filmes.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={() => {
              loadEntries();
              loadStats();
            }}
          >
            Atualizar
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Total de títulos"
            value={derivedStats.totalEntries}
            icon={LocalMoviesIcon}
            loading={loadingStats}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Nota média"
            value={isNaN(Number(derivedStats.avgScore)) ? "-" : derivedStats.avgScore}
            icon={StarRateIcon}
            loading={loadingStats}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Rewatches"
            value={derivedStats.totalRewatches}
            icon={ReplayCircleFilledIcon}
            loading={loadingStats}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Progresso total"
            value={`${derivedStats.totalProgress || 0}`}
            helper="minutos"
            icon={AccessTimeIcon}
            loading={loadingStats}
          />
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Status gerais
          </Typography>
          <Stack
            direction="row"
            flexWrap="wrap"
            spacing={1}
            rowGap={1}
            alignItems="center"
          >
            {statusSummary.map(({ label, value, icon }) => {
              const StatusIcon = icon;
              return (
                <Chip
                  key={label}
                  label={`${label}: ${value}`}
                  icon={
                    StatusIcon ? <StatusIcon fontSize="small" /> : undefined
                  }
                  color="default"
                  sx={{ textTransform: "capitalize" }}
                />
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            justifyContent="space-between"
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              flexWrap="wrap"
            >
              <ToggleStatusGroup
                value={filters.status}
                onChange={(status) => handleFilterChange({ status })}
              />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Prioridade</InputLabel>
                <Select
                  label="Prioridade"
                  value={filters.priority}
                  onChange={(e) =>
                    handleFilterChange({ priority: e.target.value })
                  }
                >
                  {priorityOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Ordenar por</InputLabel>
                <Select
                  label="Ordenar por"
                  value={filters.sortBy}
                  onChange={(e) =>
                    handleFilterChange({ sortBy: e.target.value })
                  }
                >
                  {sortOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small"
                label="Buscar"
                value={filters.search}
                onChange={(e) => handleFilterChange({ search: e.target.value })}
              />
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="text"
                onClick={() => setFilters(defaultFilters)}
              >
                Limpar
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardContent component="form" onSubmit={handleCreateEntry}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ md: "flex-end" }}
          >
            <TextField
              label="IMDb ID (ex: tt1234567)"
              value={newEntry.imdbId}
              onChange={(e) =>
                setNewEntry((prev) => ({ ...prev, imdbId: e.target.value }))
              }
              required
              InputProps={{ sx: { textTransform: "uppercase" } }}
            />
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={newEntry.status}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                {statusOptions
                  .filter((option) => option.value !== "all")
                  .map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 140 }}>
              <InputLabel>Prioridade</InputLabel>
              <Select
                label="Prioridade"
                value={newEntry.priority}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, priority: e.target.value }))
                }
              >
                {priorityOptions
                  .filter((option) => option.value !== "all")
                  .map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <TextField
              label="Nota (0-10)"
              type="number"
              inputProps={{ min: 0, max: 10, step: 0.5 }}
              value={newEntry.score}
              onChange={(e) =>
                setNewEntry((prev) => ({ ...prev, score: e.target.value }))
              }
            />
            <Button
              type="submit"
              variant="contained"
              startIcon={<AddCircleIcon />}
              disabled={submitting}
            >
              Salvar
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Box>
        {loadingEntries ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Carregando sua lista...</Typography>
          </Box>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h6" gutterBottom>
                Nenhum item por aqui
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Adicione um IMDb ID acima para começar sua coleção ou ajuste os
                filtros selecionados.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setFilters(defaultFilters)}
              >
                Limpar filtros
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {entries.map((entry) => (
              <Grid item xs={12} sm={6} xl={4} key={entry.id || entry._id}>
                <EntryCard
                  entry={entry}
                  onStatusChange={(value) =>
                    handleQuickUpdate(entry.id || entry._id, { status: value })
                  }
                  onPriorityChange={(value) =>
                    handleQuickUpdate(entry.id || entry._id, {
                      priority: value,
                    })
                  }
                  onScoreChange={(value) =>
                    handleQuickUpdate(
                      entry.id || entry._id,
                      { score: value },
                      "Nota atualizada."
                    )
                  }
                  onDelete={() => handleDeleteEntry(entry.id || entry._id)}
                  onOpenDetails={() =>
                    onSelectMovie?.(
                      entry.movie?.tmdbId ||
                        entry.movie?.id ||
                        entry.tmdbId ||
                        null
                    )
                  }
                  loading={updatingId === (entry.id || entry._id)}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {entries.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Pagination
            count={pageInfo.totalPages}
            page={filters.page}
            onChange={(_, page) => handleFilterChange({ page })}
            color="primary"
          />
        </Box>
      )}

      <Snackbar
        open={Boolean(error)}
        onClose={() => setError("")}
        autoHideDuration={5000}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" variant="filled" sx={{ width: "100%" }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(success)}
        onClose={() => setSuccess("")}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" sx={{ width: "100%" }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function StatCard({ title, value, helper, icon, loading }) {
  const IconComponent = icon;
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              bgcolor: "primary.light",
              color: "primary.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {IconComponent ? <IconComponent /> : null}
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              {title}
            </Typography>
            {loading ? (
              <CircularProgress size={18} />
            ) : (
              <Typography variant="h5" fontWeight={600}>
                {value}
                {helper && (
                  <Typography component="span" color="text.secondary" sx={{ ml: 0.5 }}>
                    {helper}
                  </Typography>
                )}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  helper: PropTypes.string,
  icon: PropTypes.elementType.isRequired,
  loading: PropTypes.bool,
};

function ToggleStatusGroup({ value, onChange }) {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {statusOptions.map((option) => {
        const IconComp = option.icon;
        const isActive = value === option.value;
        return (
          <Chip
            key={option.value}
            icon={<IconComp fontSize="small" />}
            label={option.label}
            color={isActive ? "primary" : "default"}
            variant={isActive ? "filled" : "outlined"}
            onClick={() => onChange(option.value)}
            sx={{ textTransform: "capitalize" }}
          />
        );
      })}
    </Stack>
  );
}

ToggleStatusGroup.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

function EntryCard({
  entry,
  onStatusChange,
  onPriorityChange,
  onScoreChange,
  onDelete,
  onOpenDetails,
  loading,
}) {
  const status = entry.status || "plan-to-watch";
  const priority = entry.priority || "medium";
  const score = entry.score ?? 0;
  const movieTitle = entry.title || entry.movie?.title || entry.movie?.name;
  const poster =
    entry.movie?.posterUrl ||
    entry.movie?.poster_path ||
    entry.movie?.poster ||
    entry.posterUrl ||
    entry.poster_path ||
    null;

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Stack direction="row" spacing={2}>
          <Box
            sx={{
              width: 80,
              height: 120,
              borderRadius: 2,
              overflow: "hidden",
              flexShrink: 0,
              bgcolor: "grey.100",
            }}
          >
            {poster ? (
              <img
                src={poster}
                alt={movieTitle}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Box
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "text.disabled",
                }}
              >
                <LocalMoviesIcon />
              </Box>
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap title={movieTitle}>
              {movieTitle || "Título desconhecido"}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip
                size="small"
                label={statusLabels[status] || "Status indefinido"}
                color={statusColors[status] || "default"}
              />
              <Chip
                size="small"
                label={`Prioridade: ${priority}`}
                color={priorityColors[priority] || "default"}
              />
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              Atualizado em{" "}
              {new Date(entry.updatedAt || entry.createdAt || Date.now()).toLocaleDateString(
                undefined,
                { day: "2-digit", month: "short", year: "numeric" }
              )}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />
        <Stack spacing={1}>
          <FormControl size="small" fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              label="Status"
              onChange={(e) => onStatusChange(e.target.value)}
              disabled={loading}
            >
              {statusOptions
                .filter((option) => option.value !== "all")
                .map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Prioridade</InputLabel>
            <Select
              value={priority}
              label="Prioridade"
              onChange={(e) => onPriorityChange(e.target.value)}
              disabled={loading}
            >
              {priorityOptions
                .filter((option) => option.value !== "all")
                .map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Nota:
            </Typography>
            <Rating
              value={Number(score) || 0}
              precision={0.5}
              max={10}
              onChange={(_, value) => onScoreChange(value || 0)}
              disabled={loading}
            />
          </Stack>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={1} justifyContent="space-between">
          <Tooltip title="Ver detalhes do filme">
            <span>
              <Button
                variant="outlined"
                size="small"
                startIcon={<OpenInNewIcon />}
                onClick={onOpenDetails}
                disabled={!onOpenDetails}
              >
                Detalhes
              </Button>
            </span>
          </Tooltip>
          <IconButton
            color="error"
            onClick={onDelete}
            disabled={loading}
            aria-label="Remover da lista"
          >
            <DeleteOutlineIcon />
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  );
}

EntryCard.propTypes = {
  entry: PropTypes.object.isRequired,
  onStatusChange: PropTypes.func.isRequired,
  onPriorityChange: PropTypes.func.isRequired,
  onScoreChange: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onOpenDetails: PropTypes.func,
  loading: PropTypes.bool,
};

MyListDashboard.propTypes = {
  onSelectMovie: PropTypes.func,
};
