import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Dropdown, Button, Form, Spinner, Stack, Badge } from "react-bootstrap";
import { BsListCheck } from "react-icons/bs";
import { useAuth } from "../auth/AuthContext";
import {
  getMyListEntryByImdb,
  upsertMyListEntry,
  deleteMyListEntry,
} from "../api/api";

const statusOptions = [
  { value: "watching", label: "Assistindo" },
  { value: "completed", label: "Concluído" },
  { value: "on-hold", label: "Em pausa" },
  { value: "dropped", label: "Dropado" },
  { value: "plan-to-watch", label: "Planejado" },
  { value: "rewatching", label: "Reassistindo" },
];

const priorityOptions = [
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
];

const defaultForm = {
  status: "plan-to-watch",
  priority: "medium",
  score: "",
};

export default function MyListQuickActions({ imdbId, title }) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entry, setEntry] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!imdbId || !isAuthenticated) {
      setEntry(null);
      setForm(defaultForm);
      return;
    }
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getMyListEntryByImdb(imdbId);
        if (!active) return;
        if (data) {
          setEntry(data);
          setForm({
            status: data.status || defaultForm.status,
            priority: data.priority || defaultForm.priority,
            score:
              data.score === null || data.score === undefined
                ? ""
                : Number(data.score),
          });
        } else {
          setEntry(null);
          setForm(defaultForm);
        }
      } catch (e) {
        if (!active) return;
        setEntry(null);
        setForm(defaultForm);
        setError(e?.message || "Não foi possível carregar sua lista.");
      } finally {
        active && setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [imdbId, isAuthenticated]);

  const statusLabel = useMemo(() => {
    const current = statusOptions.find((o) => o.value === form.status);
    return current ? current.label : "Status";
  }, [form.status]);

  const priorityLabel = useMemo(() => {
    const current = priorityOptions.find((o) => o.value === form.priority);
    return current ? current.label : "Prioridade";
  }, [form.priority]);

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (!imdbId || !isAuthenticated) {
      openAuthModal?.("login");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        imdbId,
        status: form.status,
        priority: form.priority,
      };
      if (form.score !== "" && form.score !== null) {
        payload.score = Number(form.score);
      }
      await upsertMyListEntry(payload);
      const refreshed = await getMyListEntryByImdb(imdbId);
      setEntry(refreshed || payload);
      setSuccess("Lista atualizada!");
    } catch (e) {
      setError(e?.message || "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const entryId = entry?.id || entry?._id;
    if (!entryId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await deleteMyListEntry(entryId);
      setEntry(null);
      setForm(defaultForm);
      setSuccess("Removido da Minha Lista.");
    } catch (e) {
      setError(e?.message || "Não foi possível remover.");
    } finally {
      setSaving(false);
    }
  }

  const disabled = !isAuthenticated || saving;

  return (
    <Dropdown autoClose="outside">
      <Dropdown.Toggle variant="outline-primary" size="sm">
        <BsListCheck className="me-1" />
        Minha Lista
        {entry && (
          <Badge bg="success" className="ms-2">
            {statusLabel}
          </Badge>
        )}
        {entry && (
          <Badge bg="info" className="ms-2">
            {priorityLabel}
          </Badge>
        )}
      </Dropdown.Toggle>
      <Dropdown.Menu className="p-3" align="end" style={{ minWidth: 260 }}>
        {!isAuthenticated ? (
          <div className="text-center">
            <p className="mb-2">
              Entre para atualizar status e prioridade deste filme.
            </p>
            <Button size="sm" onClick={() => openAuthModal?.("login")}>
              Fazer login
            </Button>
          </div>
        ) : loading ? (
          <div className="text-center py-3">
            <Spinner animation="border" size="sm" />
          </div>
        ) : (
          <Form onSubmit={handleSubmit}>
            <Stack gap={2}>
              {title && (
                <div>
                  <small className="text-muted">Filme selecionado</small>
                  <div className="fw-semibold">{title}</div>
                </div>
              )}
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  size="sm"
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                  disabled={disabled}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group>
                <Form.Label>Prioridade</Form.Label>
                <Form.Select
                  size="sm"
                  value={form.priority}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, priority: e.target.value }))
                  }
                  disabled={disabled}
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group>
                <Form.Label>Nota</Form.Label>
                <Form.Control
                  type="number"
                  size="sm"
                  min="0"
                  max="10"
                  step="0.5"
                  value={form.score}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, score: e.target.value }))
                  }
                  disabled={disabled}
                />
              </Form.Group>
              {error && (
                <div className="text-danger small" role="alert">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-success small">{success}</div>
              )}
              <Stack direction="horizontal" gap={2}>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={disabled}
                >
                  {saving ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Salvando...
                    </>
                  ) : (
                    "Aplicar"
                  )}
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setEntry(null);
                    setForm(defaultForm);
                    setSuccess("");
                    setError("");
                  }}
                  disabled={saving}
                >
                  Limpar
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={handleDelete}
                  disabled={saving || !entry?.id}
                >
                  Remover
                </Button>
              </Stack>
            </Stack>
          </Form>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}

MyListQuickActions.propTypes = {
  imdbId: PropTypes.string,
  title: PropTypes.string,
};
