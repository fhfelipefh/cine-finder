import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  listComments,
  createComment,
  updateComment,
  deleteComment,
} from "../api/api";
import { useAuth } from "../auth/AuthContext";
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
  if (typeof item.authorName === "string" && item.authorName.trim()) {
    return item.authorName.trim();
  }
  const a = item.author;
  if (typeof a === "string") return a;
  return a?.name || "";
}

function normalizeComment(entry) {
  if (!entry) return null;
  const id =
    entry.id ||
    entry._id ||
    entry.commentId ||
    entry.comment_id ||
    entry.commentID ||
    null;
  return {
    ...entry,
    id: id ? String(id) : null,
    rating: Number(entry.rating ?? 0),
    authorName:
      entry.authorName ||
      (typeof entry.author === "string"
        ? entry.author
        : entry.author?.name || ""),
  };
}

export default function CommentsSection({ imdbId }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const { isAuthenticated, user, openAuthModal } = useAuth();

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  useEffect(() => {
    if (!imdbId || !isAuthenticated) {
      setItems([]);
      setTotal(0);
      return;
    }
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await listComments(imdbId, page, pageSize);
        if (!active) return;
        const normalized =
          (res.items || [])
            .map((entry) => normalizeComment(entry))
            .filter(Boolean) || [];
        setItems(normalized);
        setTotal(res.total ?? normalized.length);
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
  }, [imdbId, page, pageSize, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setEditing(null);
      resetForm();
    }
  }, [isAuthenticated]);

  function resetForm() {
    setRating(0);
    setComment("");
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (!imdbId) return;
    if (!comment.trim() || rating <= 0) {
      setError("Preencha nota e comentário.");
      return;
    }
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      setSuccessMsg("");
      if (editing) {
        const editingId = editing.id || editing._id;
        if (!editingId) {
          throw new Error("Comentário selecionado não possui ID.");
        }
        const cleanId = String(editingId);
        const payload = {
          rating,
          comment: comment.trim(),
        };
        const response = await updateComment(cleanId, payload);
        const fallbackUpdated = normalizeComment({
          ...editing,
          ...payload,
          id: cleanId,
          updatedAt: new Date().toISOString(),
        });
        const updated = normalizeComment(response) || fallbackUpdated;
        setItems((prev) =>
          prev.map((it) =>
            String(it.id || "") === cleanId ? updated || it : it
          )
        );
        const successMessage = (response && response.message) || "Comentário atualizado.";
        setSuccessMsg(successMessage);
        setEditing(null);
      } else {
        const created = await createComment({
          imdbId,
          rating,
          comment: comment.trim(),
        });
        const normalizedCreated = normalizeComment(created);
        if (normalizedCreated) {
          setItems((prev) => [normalizedCreated, ...prev]);
          setTotal((t) => t + 1);
        }
        setSuccessMsg((created && created.message) || "Comentário publicado.");
      }
      resetForm();
    } catch (e) {
      const msg = e?.message || "Erro ao enviar comentário";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function onEdit(it) {
    setEditing(it);
    setRating(Number(it.rating) || 0);
    setComment(it.comment || "");
  }

  async function onConfirmDelete() {
    if (!confirmDel) return;
    const targetId = confirmDel.id || confirmDel._id;
    if (!targetId) {
      setError("Comentário selecionado não possui ID.");
      setConfirmDel(null);
      return;
    }
    const cleanId = String(targetId);
    try {
      const response = await deleteComment(cleanId);
      setItems((prev) => prev.filter((it) => String(it.id || "") !== cleanId));
      setTotal((t) => Math.max(0, t - 1));
      setConfirmDel(null);
  const successMessage = (response && response.message) || "Comentário removido.";
      setSuccessMsg(successMessage);
    } catch (e) {
      const msg = e?.message || "Erro ao deletar comentário";
      if (e?.status === 403) {
        setError(
          msg +
            " A ação é permitida apenas do mesmo IP e até 10 minutos após a criação."
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
  if (!isAuthenticated) {
    listContent = (
      <Box
        sx={{
          p: 2,
          border: "1px dashed",
          borderColor: "divider",
          borderRadius: 2,
          textAlign: "center",
        }}
      >
        <p className="mb-2">Faça login para ver os comentários.</p>
        <MButton variant="outlined" size="small" onClick={() => openAuthModal("login")}>
          Entrar
        </MButton>
      </Box>
    );
  } else if (loading) {
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
        {items.map((it) => {
          const commentUserId = String(
            it.userId ||
              it.user?._id ||
              it.user?.id ||
              it.author?._id ||
              it.author?.id ||
              ""
          );
          const currentUserId = String(user?.id || user?._id || "");
          const isOwner = commentUserId && currentUserId && commentUserId === currentUserId;
          const isAdmin = user?.role === "admin";
          const canEdit = isAdmin || isOwner;
          const canDelete = isAdmin;
          return (
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
                    {canEdit && (
                      <Tooltip title="Editar">
                        <span>
                          <IconButton size="small" onClick={() => onEdit(it)}>
                            <MdEdit />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {canDelete && (
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
                    )}
                  </Box>
                </Box>
                <Box sx={{ whiteSpace: "pre-wrap", mt: 1 }}>{it.comment}</Box>
              </Box>
            </Box>
          );
        })}
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
      {isAuthenticated ? (
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
      ) : (
        <Box
          sx={{
            p: 2,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            mb: 2,
            bgcolor: "background.paper",
            textAlign: "center",
          }}
        >
          <p className="mb-2">Faça login para comentar.</p>
          <MButton variant="contained" size="small" onClick={() => openAuthModal("login")}>
            Entrar
          </MButton>
        </Box>
      )}

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

      <Snackbar
        open={Boolean(successMsg)}
        autoHideDuration={4000}
        onClose={() => setSuccessMsg("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" sx={{ width: "100%" }}>
          {successMsg}
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
          Tem certeza que deseja remover este comentário? Apenas administradores podem
          executar esta ação.

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









