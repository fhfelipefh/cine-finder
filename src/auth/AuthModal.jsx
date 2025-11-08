import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button, Form, Alert, Tabs, Tab, InputGroup } from "react-bootstrap";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

function AuthModal({ show, mode = "login", onHide, onLogin, onRegister }) {
  const [active, setActive] = useState(mode);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState({
    login: false,
    register: false,
  });

  useEffect(() => {
    setActive(mode);
  }, [mode]);

  useEffect(() => {
    if (!show) {
      setLoginForm({ email: "", password: "" });
      setRegisterForm({ name: "", email: "", password: "" });
      setShowPassword({ login: false, register: false });
      setError("");
      setSubmitting(false);
    }
  }, [show]);

  function togglePasswordVisibility(field) {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (submitting) return;
    setError("");
    try {
      setSubmitting(true);
      if (active === "login") {
        await onLogin(loginForm);
      } else {
        await onRegister(registerForm);
      }
      onHide();
    } catch (err) {
      setError(err?.message || "Não foi possível concluir a operação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {active === "login" ? "Entrar" : "Criar conta"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tabs
          activeKey={active}
          onSelect={(key) => key && setActive(key)}
          className="mb-3"
        >
          <Tab eventKey="login" title="Entrar" />
          <Tab eventKey="register" title="Cadastro" />
        </Tabs>
        {error && <Alert variant="danger">{error}</Alert>}
        {active === "login" ? (
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="loginEmail">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={loginForm.email}
                onChange={(e) =>
                  setLoginForm((prev) => ({ ...prev, email: e.target.value }))
                }
                required
                autoComplete="email"
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="loginPassword">
              <Form.Label>Senha</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword.login ? "text" : "password"}
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  required
                  autoComplete="current-password"
                />
                <Button
                  variant="outline-secondary"
                  type="button"
                  onClick={() => togglePasswordVisibility("login")}
                  aria-pressed={showPassword.login}
                  aria-label={showPassword.login ? "Ocultar senha" : "Mostrar senha"}
                  className="d-flex align-items-center"
                >
                  {showPassword.login ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </Button>
              </InputGroup>
            </Form.Group>
          </Form>
        ) : (
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="registerName">
              <Form.Label>Nome</Form.Label>
              <Form.Control
                type="text"
                value={registerForm.name}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
                autoComplete="name"
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="registerEmail">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={registerForm.email}
                onChange={(e) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                required
                autoComplete="email"
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="registerPassword">
              <Form.Label>Senha</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword.register ? "text" : "password"}
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  required
                  autoComplete="new-password"
                />
                <Button
                  variant="outline-secondary"
                  type="button"
                  onClick={() => togglePasswordVisibility("register")}
                  aria-pressed={showPassword.register}
                  aria-label={showPassword.register ? "Ocultar senha" : "Mostrar senha"}
                  className="d-flex align-items-center"
                >
                  {showPassword.register ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </Button>
              </InputGroup>
            </Form.Group>
          </Form>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? "Enviando..."
            : active === "login"
            ? "Entrar"
            : "Criar conta"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

AuthModal.propTypes = {
  show: PropTypes.bool.isRequired,
  mode: PropTypes.oneOf(["login", "register"]),
  onHide: PropTypes.func.isRequired,
  onLogin: PropTypes.func.isRequired,
  onRegister: PropTypes.func.isRequired,
};

export default AuthModal;
