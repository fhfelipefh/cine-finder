import PropTypes from "prop-types";
import Pagination from "react-bootstrap/Pagination";

function PaginationControls({
  currentPage,
  totalPages = 1,
  onPageChange,
  disabled = false,
}) {
  const go = (p) => {
    if (disabled) return;
    if (p < 1 || p > totalPages || p === currentPage) return;
    onPageChange(p);
  };

  const prevPage = Math.max(1, currentPage - 1);
  const nextPage = Math.min(totalPages, currentPage + 1);
  const pages = [];
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, currentPage + 1);

  for (let p = start; p <= end; p++) {
    pages.push(
      <Pagination.Item
        key={p}
        active={p === currentPage}
        onClick={() => go(p)}
        aria-current={p === currentPage ? "page" : undefined}
      >
        {p}
      </Pagination.Item>
    );
  }

  return (
    <div className="d-flex justify-content-center my-4">
      <Pagination size="sm" aria-label="Paginação">
        <Pagination.First
          onClick={() => go(1)}
          disabled={disabled || currentPage === 1}
        />
        <Pagination.Prev
          onClick={() => go(prevPage)}
          disabled={disabled || currentPage === 1}
        />
        {start > 1 && (
          <>
            <Pagination.Item onClick={() => go(1)}>1</Pagination.Item>
            {start > 2 && <Pagination.Ellipsis disabled />}
          </>
        )}

        {pages}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <Pagination.Ellipsis disabled />}
            <Pagination.Item onClick={() => go(totalPages)}>
              {totalPages}
            </Pagination.Item>
          </>
        )}

        <Pagination.Next
          onClick={() => go(nextPage)}
          disabled={disabled || currentPage >= totalPages}
        />
        <Pagination.Last
          onClick={() => go(totalPages)}
          disabled={disabled || currentPage >= totalPages}
        />
      </Pagination>
    </div>
  );
}

PaginationControls.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number,
  onPageChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default PaginationControls;
