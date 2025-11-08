import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button, Form, Alert, Tabs, Tab, InputGroup } from "react-bootstrap";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useAuth } from "./AuthContext";

function AccountModal({ show, onHide }) {
  const { user, updateProfile, updatePassword, deleteAccount } = useAuth();
  const [tab, setTab] = useState("profile");
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [pwdForm, setPwdForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    next: false,
  });

  useEffect(() => {
    if (show) {
      setProfileForm({
        name: user?.name || "",
        email: user?.email || "",
      });
      setPwdForm({ currentPassword: "", newPassword: "" });
      setShowPassword({ current: false, next: false });
      setTab("profile");
      setError("");
      setSuccess("");
    }
  }, [show, user]);

  function togglePasswordVisibility(field) {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  async function handleProfileSubmit(e) {
    e?.preventDefault();
    setError("");
    setSuccess("");
    try {
      setLoading(true);
      await updateProfile(profileForm);
      setSuccess("Perfil atualizado.");
    } catch (err) {
      setError(err?.message || "Não foi possível atualizar o perfil.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e?.preventDefault();
    setError("");
    setSuccess("");
    try {
      setLoading(true);
      await updatePassword(pwdForm);
      setSuccess("Senha alterada.");
      setPwdForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      setError(err?.message || "Não foi possível alterar a senha.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Deseja realmente excluir sua conta?")) return;
    setError("");
    setSuccess("");
    try {
      setLoading(true);
      await deleteAccount();
      onHide();
    } catch (err) {
      setError(err?.message || "Falha ao excluir a conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Minha conta</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tabs activeKey={tab} onSelect={(key) => key && setTab(key)}>
          <Tab eventKey="profile" title="Perfil">
            <Form onSubmit={handleProfileSubmit} className="mt-3">
              <Form.Group className="mb-3" controlId="profileName">
                <Form.Label>Nome</Form.Label>
                <Form.Control
                  type="text"
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="profileEmail">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={profileForm.email}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  required
                />
              </Form.Group>
              <Button type="submit" variant="primary" disabled={loading}>
                Salvar alterações
              </Button>
            </Form>
          </Tab>
          <Tab eventKey="password" title="Senha">
            <Form onSubmit={handlePasswordSubmit} className="mt-3">
              <Form.Group className="mb-3" controlId="pwdCurrent">
                <Form.Label>Senha atual</Form.Label>
                <InputGroup>
                  <Form.Control
                    type={showPassword.current ? "text" : "password"}
                    value={pwdForm.currentPassword}
                    onChange={(e) =>
                      setPwdForm((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                    required
                    autoComplete="current-password"
                  />
                  <Button
                    variant="outline-secondary"
                    type="button"
                    onClick={() => togglePasswordVisibility("current")}
                    aria-pressed={showPassword.current}
                    aria-label={
                      showPassword.current ? "Ocultar senha atual" : "Mostrar senha atual"
                    }
                    className="d-flex align-items-center"
                  >
                    {showPassword.current ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </Button>
                </InputGroup>
              </Form.Group>
              <Form.Group className="mb-3" controlId="pwdNew">
                <Form.Label>Nova senha</Form.Label>
                <InputGroup>
                  <Form.Control
                    type={showPassword.next ? "text" : "password"}
                    value={pwdForm.newPassword}
                    onChange={(e) =>
                      setPwdForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    required
                    autoComplete="new-password"
                  />
                  <Button
                    variant="outline-secondary"
                    type="button"
                    onClick={() => togglePasswordVisibility("next")}
                    aria-pressed={showPassword.next}
                    aria-label={showPassword.next ? "Ocultar nova senha" : "Mostrar nova senha"}
                    className="d-flex align-items-center"
                  >
                    {showPassword.next ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </Button>
                </InputGroup>
              </Form.Group>
              <Button type="submit" variant="primary" disabled={loading}>
                Alterar senha
              </Button>
            </Form>
          </Tab>
          <Tab eventKey="danger" title="Privacidade">
            <div className="mt-3">
              <p>
                Excluir sua conta removerá comentários, votos e favoritos
                relacionados. Esta ação é irreversível.
              </p>
              <Button variant="danger" onClick={handleDelete} disabled={loading}>
                Excluir minha conta
              </Button>
            </div>
          </Tab>
        </Tabs>
        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
        {success && <Alert variant="success" className="mt-3">{success}</Alert>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Fechar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

AccountModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
};

export default AccountModal;
