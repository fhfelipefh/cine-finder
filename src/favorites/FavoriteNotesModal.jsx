import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button, Form, Alert } from "react-bootstrap";

function FavoriteNotesModal({ show, title, notes, onSave, onHide }) {
  const [value, setValue] = useState(notes || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      setValue(notes || "");
      setError("");
    }
  }, [show, notes]);

  async function handleSubmit(e) {
    e?.preventDefault();
    try {
      setLoading(true);
      setError("");
      await onSave(value);
      onHide();
    } catch (err) {
      setError(err?.message || "Não foi possível salvar a anotação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Anotações</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted mb-2">{title}</p>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="favoriteNotesTextarea">
            <Form.Label>Escreva sua anotação</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading}>
          Salvar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

FavoriteNotesModal.propTypes = {
  show: PropTypes.bool.isRequired,
  title: PropTypes.string,
  notes: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onHide: PropTypes.func.isRequired,
};

export default FavoriteNotesModal;
