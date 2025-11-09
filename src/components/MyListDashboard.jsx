import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  listMyListEntries,
  getMyListStats,
  upsertMyListEntry,
  updateMyListEntry,
  deleteMyListEntry,
  findMovieByImdbId,
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
  Drawer,
  Fab,
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
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import FilterListIcon from "@mui/icons-material/FilterList";

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

const priorityLabels = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const TMDB_POSTER_BASE = "https://image.tmdb.org/t/p/w300";

function formatPosterUrl(path) {
  if (!path) return null;
  if (typeof path !== "string") return path;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return `${TMDB_POSTER_BASE}${path}`;
  return path;
}

function deriveEntryMedia(entry) {
  const imdb = String(entry?.imdbId || "").toUpperCase();
  return {
    imdb,
    title:
      entry?.title ||
      entry?.movie?.title ||
      entry?.movie?.name ||
      imdb ||
      "Título desconhecido",
    posterUrl: formatPosterUrl(
      entry?.movie?.posterUrl ||
        entry?.movie?.poster_path ||
        entry?.posterUrl ||
        entry?.poster_path
    ),
    tmdbId:
      entry?.movie?.tmdbId ||
      entry?.movie?.tmdbID ||
      (typeof entry?.movie?.id === "number" ? entry.movie.id : null) ||
      entry?.tmdbId ||
      entry?.tmdbID ||
      null,
  };
}

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
  const [resolvingDetailsId, setResolvingDetailsId] = useState(null);
  const [newEntry, setNewEntry] = useState({
    imdbId: "",
    status: "watching",
    priority: "medium",
    score: "",
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const hasSelection = selectedIds.length > 0;
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    entryId: null,
    label: "",
  });
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [detailsMap, setDetailsMap] = useState({});
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  useEffect(() => {
    if (!entries.length) return;
    const pending = [];
    const seen = new Set();
    entries.forEach((entry) => {
      const imdb = String(entry.imdbId || "").toUpperCase();
      if (!imdb || seen.has(imdb) || detailsMap[imdb]) return;
      seen.add(imdb);
      pending.push({ imdb, entry });
    });
    if (!pending.length) return;
    let cancelled = false;
    (async () => {
      const updates = {};
      for (const { imdb, entry } of pending) {
        let resolved = deriveEntryMedia(entry);
        try {
          const remote = await findMovieByImdbId(imdb);
          if (remote) {
            resolved = {
              ...resolved,
              title: remote.title || resolved.title,
              posterUrl:
                formatPosterUrl(remote.poster_path) || resolved.posterUrl,
              tmdbId: remote.tmdbId || resolved.tmdbId,
              year: remote.release_date || resolved.year,
            };
          }
        } catch {
          /* ignore TMDB failures */
        }
        updates[imdb] = resolved;
      }
      if (!cancelled) {
        setDetailsMap((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entries, detailsMap]);

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
      setSelectedIds([]);
      const totalPages = Math.max(
        1,
        Math.ceil((data.total || data.items?.length || 1) / data.pageSize)
      );
      setPageInfo({ page: data.page || 1, totalPages });
    } catch (e) {
      setEntries([]);
      setSelectedIds([]);
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
          String(item.id || item._id || "") === String(entryId)
            ? { ...item, ...updated, ...payload }
            : item
        )
      );
      setSuccess(message || "Entrada atualizada.");
      loadStats();
    } catch (e) {
      setError(e?.message || "Não foi possível atualizar a entrada.");
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
      setEntries((prev) =>
        prev.filter(
          (item) => String(item.id || item._id || "") !== String(entryId)
        )
      );
      setSelectedIds((prev) => prev.filter((id) => id !== String(entryId)));
      setSuccess("Entrada removida.");
      loadStats();
    } catch (e) {
      setError(e?.message || "Não foi possível remover a entrada.");
    } finally {
      setUpdatingId(null);
      closeDeleteDialog();
    }
  }

  function toggleSelection(entryId) {
    const clean = String(entryId || "");
    if (!clean) return;
    setSelectedIds((prev) =>
      prev.includes(clean)
        ? prev.filter((id) => id !== clean)
        : [...prev, clean]
    );
  }

  function openDeleteDialog(entryId, label) {
    if (!entryId) return;
    setDeleteDialog({
      open: true,
      entryId,
      label: label || "este filme",
    });
  }

  function closeDeleteDialog() {
    setDeleteDialog({ open: false, entryId: null, label: "" });
  }

  async function executeBulkDelete() {
    if (!hasSelection) return;
    setBulkDeleting(true);
    setError("");
    try {
      for (const id of selectedIds) {
        await deleteMyListEntry(id);
      }
      setEntries((prev) =>
        prev.filter(
          (item) => !selectedIds.includes(String(item.id || item._id || ""))
        )
      );
      setSelectedIds([]);
      setSuccess("Itens removidos da sua lista.");
      loadStats();
    } catch (e) {
      setError(e?.message || "Não foi possível remover os itens selecionados.");
    } finally {
      setBulkDeleting(false);
      setBulkDialogOpen(false);
    }
  }

  async function handleOpenDetails(entry, cachedTmdbId) {
    if (!entry || !onSelectMovie) return;
    const detailKey = String(entry.id || entry._id || entry.imdbId || "");
    const imdbKey = String(entry.imdbId || "").toUpperCase();
    setResolvingDetailsId(detailKey);
    try {
      let tmdbId = cachedTmdbId;
      if (!tmdbId) {
        const cached = detailsMap[imdbKey];
        tmdbId = cached?.tmdbId;
      }
      if (!tmdbId && entry.imdbId) {
        const fromTmdb = await findMovieByImdbId(entry.imdbId).catch(() => null);
        if (fromTmdb) {
          tmdbId = fromTmdb.tmdbId;
          setDetailsMap((prev) => ({
            ...prev,
            [imdbKey]: {
              ...(prev[imdbKey] || deriveEntryMedia(entry)),
              title: fromTmdb.title,
              posterUrl: formatPosterUrl(fromTmdb.poster_path),
              tmdbId: fromTmdb.tmdbId,
              year: fromTmdb.release_date,
            },
          }));
        }
      }
      if (!tmdbId) {
        setError("Não foi possível encontrar detalhes deste filme.");
        return;
      }
      onSelectMovie(tmdbId);
    } finally {
      setResolvingDetailsId(null);
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

  const filtersView = (
    <Box sx={{ width: { xs: 280, sm: 340 }, p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Filtros
      </Typography>
      <Stack spacing={2}>
        <ToggleStatusGroup
          value={filters.status}
          onChange={(status) => handleFilterChange({ status })}
        />
        <FormControl size="small" fullWidth>
          <InputLabel>Prioridade</InputLabel>
          <Select
            label="Prioridade"
            value={filters.priority}
            onChange={(e) => handleFilterChange({ priority: e.target.value })}
          >
            {priorityOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel>Ordenar por</InputLabel>
          <Select
            label="Ordenar por"
            value={filters.sortBy}
            onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
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
        <Stack direction="row" spacing={1}>
          <Button
            variant="text"
            size="small"
            onClick={() => setFilters(defaultFilters)}
          >
            Limpar
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={() => setFiltersOpen(false)}
          >
            Aplicar
          </Button>
        </Stack>
      </Stack>
    </Box>
  );

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
        justifyContent={{ xs: "flex-start", md: "flex-end" }}
        spacing={2}
        sx={{ mb: 2, flexWrap: "wrap" }}
      >
        <StatusSummaryCompact
          summary={statusSummary}
          loading={loadingStats}
        />
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {hasSelection && (
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              Selecionados: {selectedIds.length}
            </Typography>
          )}
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            size="small"
            onClick={() => {
              loadEntries();
              loadStats();
            }}
          >
            Atualizar
          </Button>
          <Button
            variant="contained"
            color="error"
            size="small"
            disabled={!hasSelection || bulkDeleting}
            onClick={() => setBulkDialogOpen(true)}
          >
            {bulkDeleting ? "Removendo..." : "Remover selecionados"}
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={1} sx={{ mb: 1.5 }}>
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

      <Card
        sx={{
          mb: 3,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "none",
        }}
      >
        <CardContent component="form" onSubmit={handleCreateEntry} sx={{ py: 1.5 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", md: "flex-end" }}
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
            <FormControl sx={{ minWidth: 150 }} size="small">
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
            <FormControl sx={{ minWidth: 130 }} size="small">
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
            {entries.map((entry) => {
              const entryKey = entry.id || entry._id || null;
              const selectionKey = entryKey ? String(entryKey) : "";
              const imdbKey = String(entry.imdbId || "").toUpperCase();
              const detailInfo =
                detailsMap[imdbKey] || deriveEntryMedia(entry);
              const detailsKey = selectionKey || imdbKey || String(entry.imdbId || "");
              const isSelected = selectionKey
                ? selectedIds.includes(selectionKey)
                : false;
              return (
                <Grid item xs={12} sm={6} xl={4} key={detailsKey || entry.imdbId}>
                  <EntryCard
                    entry={entry}
                    selected={isSelected}
                    onToggleSelect={
                      selectionKey ? () => toggleSelection(selectionKey) : undefined
                    }
                    displayTitle={detailInfo.title}
                    displayPoster={detailInfo.posterUrl}
                    displayImdb={imdbKey || entry.imdbId}
                    onStatusChange={(value) =>
                      handleQuickUpdate(entryKey, { status: value })
                    }
                    onPriorityChange={(value) =>
                      handleQuickUpdate(entryKey, {
                        priority: value,
                      })
                    }
                    onScoreChange={(value) =>
                      handleQuickUpdate(
                        entryKey,
                        { score: value },
                        "Nota atualizada."
                      )
                    }
                    onDeleteRequest={() =>
                      selectionKey &&
                      openDeleteDialog(selectionKey, detailInfo.title)
                    }
                    onOpenDetails={() =>
                      handleOpenDetails(entry, detailInfo.tmdbId)
                    }
                    loading={Boolean(entryKey && updatingId === entryKey)}
                    detailsLoading={Boolean(
                      detailsKey && resolvingDetailsId === detailsKey
                    )}
                  />
                </Grid>
              );
            })}
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

      <Fab
        color="primary"
        size="medium"
        onClick={() => setFiltersOpen(true)}
        sx={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 1300,
        }}
        aria-label="Abrir filtros"
      >
        <FilterListIcon />
      </Fab>

      <Drawer
        anchor="right"
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
      >
        {filtersView}
      </Drawer>

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

      <Dialog open={deleteDialog.open} onClose={closeDeleteDialog}>
        <DialogTitle>Remover da Minha Lista</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja remover{" "}
            <strong>{deleteDialog.label || "este filme"}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} size="small">
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            size="small"
            disabled={
              Boolean(deleteDialog.entryId) &&
              updatingId === deleteDialog.entryId
            }
            onClick={() =>
              deleteDialog.entryId && handleDeleteEntry(deleteDialog.entryId)
            }
          >
            Remover
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={bulkDialogOpen}
        onClose={() => (!bulkDeleting ? setBulkDialogOpen(false) : null)}
      >
        <DialogTitle>Remover selecionados</DialogTitle>
        <DialogContent>
          <Typography>
            Remover {selectedIds.length} item(s) da sua lista? Esta ação não
            pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setBulkDialogOpen(false)}
            size="small"
            disabled={bulkDeleting}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            size="small"
            disabled={bulkDeleting}
            onClick={executeBulkDelete}
          >
            {bulkDeleting ? "Removendo..." : "Remover"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function StatCard({ title, value, helper, icon, loading }) {
  const IconComponent = icon;
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ py: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
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

function StatusSummaryCompact({ summary, loading }) {
  if (loading) {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <CircularProgress size={16} />
      </Stack>
    );
  }
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
      {(summary || []).map(({ label, value, icon: IconComp }) => (
        <Tooltip key={label} title={`${label}: ${value}`}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1,
              py: 0.5,
              borderRadius: 2,
              bgcolor: "grey.100",
            }}
          >
            {IconComp ? <IconComp fontSize="small" /> : null}
            <Typography variant="caption" fontWeight={600}>
              {value}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Stack>
  );
}

StatusSummaryCompact.propTypes = {
  summary: PropTypes.arrayOf(PropTypes.object).isRequired,
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
  displayTitle,
  displayPoster,
  displayImdb,
  onStatusChange,
  onPriorityChange,
  onScoreChange,
  onDeleteRequest,
  onOpenDetails,
  onToggleSelect,
  selected,
  loading,
  detailsLoading,
}) {
  const status = entry.status || "plan-to-watch";
  const priority = entry.priority || "medium";
  const score = entry.score ?? 0;
  const movieTitle =
    displayTitle ||
    entry.title ||
    entry.movie?.title ||
    entry.movie?.name ||
    entry.imdbId;
  const imdbLabel =
    displayImdb ||
    entry.imdbId ||
    entry.movie?.imdbId ||
    entry.movie?.imdbID ||
    "";
  const rawPoster =
    entry.movie?.posterUrl ||
    entry.movie?.poster_path ||
    entry.movie?.poster ||
    entry.movie?.posterURL ||
    entry.movie?.posterPath ||
    entry.posterUrl ||
    entry.poster_path ||
    entry.poster ||
    entry.posterPath ||
    entry.image ||
    entry.movie?.image ||
    null;
  const poster = displayPoster || formatPosterUrl(rawPoster);
  const priorityLabel = priorityLabels[priority] || "Indefinida";

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        borderRadius: 2,
      }}
      variant="outlined"
    >
      <CardContent
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          py: 1.5,
          px: 1.5,
          gap: 1,
        }}
      >
        <Checkbox
          size="small"
          checked={selected}
          onChange={onToggleSelect}
          disabled={!onToggleSelect}
          sx={{ position: "absolute", top: 8, right: 8 }}
        />
        <Stack direction="row" spacing={1.25}>
          <Box
            sx={{
              width: 60,
              height: 90,
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
            <Typography variant="subtitle1" noWrap title={movieTitle}>
              {movieTitle || "Título desconhecido"}
            </Typography>
            {imdbLabel && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {imdbLabel}
              </Typography>
            )}
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
              <Chip
                size="small"
                label={statusLabels[status] || "Status indefinido"}
                color={statusColors[status] || "default"}
              />
              <Chip
                size="small"
                label={`Prioridade: ${priorityLabel}`}
                color={priorityColors[priority] || "default"}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Atualizado em{" "}
              {new Date(entry.updatedAt || entry.createdAt || Date.now()).toLocaleDateString(
                undefined,
                { day: "2-digit", month: "short", year: "numeric" }
              )}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 1.5 }} />
        <Stack spacing={0.75}>
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
        <Divider sx={{ my: 1.5 }} />
        <Stack direction="row" spacing={1} justifyContent="space-between">
          <Tooltip title="Ver detalhes do filme">
            <span>
              <Button
                variant="outlined"
                size="small"
                startIcon={<OpenInNewIcon />}
                onClick={onOpenDetails}
                disabled={detailsLoading}
              >
                {detailsLoading ? (
                  <CircularProgress size={14} />
                ) : (
                  "Detalhes"
                )}
              </Button>
            </span>
          </Tooltip>
          <IconButton
            color="error"
            onClick={onDeleteRequest}
            disabled={loading || !onDeleteRequest}
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
  displayTitle: PropTypes.string,
  displayPoster: PropTypes.string,
  displayImdb: PropTypes.string,
  onStatusChange: PropTypes.func.isRequired,
  onPriorityChange: PropTypes.func.isRequired,
  onScoreChange: PropTypes.func.isRequired,
  onDeleteRequest: PropTypes.func,
  onOpenDetails: PropTypes.func,
  onToggleSelect: PropTypes.func,
  selected: PropTypes.bool,
  loading: PropTypes.bool,
  detailsLoading: PropTypes.bool,
};

MyListDashboard.propTypes = {
  onSelectMovie: PropTypes.func,
};
