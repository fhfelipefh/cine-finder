import Placeholder from "react-bootstrap/Placeholder";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { Container } from "react-bootstrap";

function LoadingSkeleton() {
  return (
    <Container className="my-1">
      <Row xs={2} sm={3} md={4} lg={6} xl={8} className="g-4 my-3">
        {Array.from({ length: 20 }).map((_, i) => (
          <Col key={i}>
            <Card className="h-100">
              <div style={{ aspectRatio: "2/3", background: "#eee" }} />
              <Card.Body>
                <Placeholder as={Card.Title} animation="glow">
                  <Placeholder xs={8} /> <Placeholder xs={3} />
                </Placeholder>
                <Placeholder as={Card.Text} animation="glow">
                  <Placeholder xs={12} /> <Placeholder xs={10} />{" "}
                  <Placeholder xs={6} />
                </Placeholder>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

export default LoadingSkeleton;
