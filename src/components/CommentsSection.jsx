import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  listComments,
  createComment,
  updateComment,
  deleteComment,
} from "../api/api";
import {
  Box,
  Rating,
  TextField,
  Button as MButton,
  Snackbar,
  Alert,
  Avatar,
  Pagination,
  Chip,
  Divider,
  CircularProgress,
  Tooltip,
  IconButton,
} from "@mui/material";
import { Button, Modal } from "react-bootstrap";
import { MdDelete, MdEdit } from "react-icons/md";

function initials(name = "?") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

function humanDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function getAuthorName(item) {
  if (!item) return "";
  const a = item.author;
  if (typeof a === "string") return a;
  return a?.name || "";
}

export default function CommentsSection({ imdbId }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  useEffect(() => {
    if (!imdbId) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await listComments(imdbId, page, pageSize);
        if (!active) return;
        setItems(res.items || []);
        setTotal(res.total || 0);
      } catch (e) {
        if (!active) return;
        setError(e?.message || "Erro ao carregar comentários");
      } finally {
        active && setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [imdbId, page, pageSize]);

  function resetForm() {
    setAuthor("");
    setRating(0);
    setComment("");
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (!imdbId) return;
    if (!author.trim() || !comment.trim() || rating <= 0) {
      setError("Preencha nome, nota e comentário.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      if (editing) {
        const updated = await updateComment(editing.id, {
          author: author.trim(),
          rating,
          comment: comment.trim(),
        });
        setItems((prev) =>
          prev.map((it) => (it.id === updated.id ? updated : it))
        );
        setEditing(null);
      } else {
        const created = await createComment({
          imdbId,
          author: author.trim(),
          rating,
          comment: comment.trim(),
        });
        setItems((prev) => [created, ...prev]);
        setTotal((t) => t + 1);
      }
      resetForm();
    } catch (e) {
      const msg = e?.message || "Erro ao enviar comentário";
      if (e?.status === 400) {
        setError(msg + " — revise o texto e os campos.");
      } else if (e?.status === 403) {
        setError(
          msg +
            " — você só pode editar/apagar do mesmo IP e até 10 minutos após criar."
        );
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function onEdit(it) {
    setEditing(it);
    setAuthor(getAuthorName(it) || "");
    setRating(it.rating || 0);
    setComment(it.comment || "");
  }

  async function onConfirmDelete() {
    if (!confirmDel) return;
    try {
      await deleteComment(confirmDel.id);
      setItems((prev) => prev.filter((it) => it.id !== confirmDel.id));
      setTotal((t) => Math.max(0, t - 1));
      setConfirmDel(null);
    } catch (e) {
      const msg = e?.message || "Erro ao deletar comentário";
      if (e?.status === 403) {
        setError(
          msg +
            " — ação permitida apenas do mesmo IP e até 10 minutos após a criação."
        );
      } else {
        setError(msg);
      }
      setConfirmDel(null);
    }
  }

  const avgRating = useMemo(() => {
    if (!items.length) return 0;
    const sum = items.reduce((acc, it) => acc + (Number(it.rating) || 0), 0);
    return Math.round((sum / items.length) * 10) / 10;
  }, [items]);

  let listContent;
  if (loading) {
    listContent = (
      <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
        <CircularProgress />
      </Box>
    );
  } else if (items.length === 0) {
    listContent = (
      <Box sx={{ textAlign: "center", color: "text.secondary", my: 2 }}>
        Nenhum comentário ainda. Seja o primeiro!
      </Box>
    );
  } else {
    listContent = (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it) => (
          <Box
            key={it.id}
            sx={{
              display: "flex",
              gap: 2,
              p: 2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Avatar sx={{ bgcolor: "primary.main" }}>
              {initials(getAuthorName(it))}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <strong>{getAuthorName(it)}</strong>
                  <Rating
                    readOnly
                    value={Number(it.rating) || 0}
                    size="small"
                  />
                  <Chip
                    label={humanDate(it.updatedAt || it.createdAt)}
                    size="small"
                  />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Tooltip title="Editar">
                    <span>
                      <IconButton size="small" onClick={() => onEdit(it)}>
                        <MdEdit />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Remover">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setConfirmDel(it)}
                      >
                        <MdDelete />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
              <Box sx={{ whiteSpace: "pre-wrap", mt: 1 }}>{it.comment}</Box>
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Chip label={`Comentários (${total})`} color="primary" />
        <Box
          sx={{ display: "flex", alignItems: "center" }}
          aria-label="avaliação média"
        >
          <Rating value={avgRating} precision={0.5} readOnly />
        </Box>
      </Box>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          mb: 2,
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <TextField
            label="Seu nome"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 180 }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span>Nota</span>
            <Rating value={rating} onChange={(_, v) => setRating(v || 0)} />
          </Box>
        </Box>
        <TextField
          label="Escreva um comentário"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          multiline
          minRows={2}
          sx={{ mt: 2, width: "100%" }}
        />
        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
          <MButton type="submit" variant="contained" disabled={submitting}>
            {editing ? "Salvar alterações" : "Publicar"}
          </MButton>
          {editing && (
            <MButton
              variant="text"
              color="inherit"
              disabled={submitting}
              onClick={() => {
                setEditing(null);
                resetForm();
              }}
            >
              Cancelar
            </MButton>
          )}
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {listContent}

      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
          />
        </Box>
      )}

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={5000}
        onClose={() => setError("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" variant="filled" sx={{ width: "100%" }}>
          {error}
        </Alert>
      </Snackbar>

      <Modal
        show={Boolean(confirmDel)}
        onHide={() => setConfirmDel(null)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Remover comentário</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Tem certeza que deseja remover este comentário? Essa ação só é
          permitida para o mesmo IP do autor e dentro de 10 minutos após a
          criação.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmDel(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirmDelete}>
            Remover
          </Button>
        </Modal.Footer>
      </Modal>
    </Box>
  );
}

CommentsSection.propTypes = {
  imdbId: PropTypes.string.isRequired,
};
