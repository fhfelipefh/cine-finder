import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button } from "react-bootstrap";

function ErrorModal({ errorMsg }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof errorMsg === "string" && errorMsg.trim() !== "") {
      setShow(true);
    }
  }, [errorMsg]);

  const handleClose = () => setShow(false);

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Erro</Modal.Title>
      </Modal.Header>
      <Modal.Body>{errorMsg}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Fechar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

ErrorModal.propTypes = {
  errorMsg: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Error)])
};

export default ErrorModal;
