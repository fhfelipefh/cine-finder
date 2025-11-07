import { useState } from "react";
import PropTypes from "prop-types";
import { Button, Spinner } from "react-bootstrap";
import { BsStar, BsStarFill } from "react-icons/bs";
import { useFavorites } from "../favorites/FavoritesContext";
import { useAuth } from "../auth/AuthContext";

function FavoriteButton({ movieId, size = 18 }) {
  const { isFavorite, toggle } = useFavorites();
  const { requireAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const fav = isFavorite(movieId);

  async function handleClick(e) {
    e.stopPropagation();
    if (!requireAuth()) return;
    try {
      setLoading(true);
      await toggle(movieId);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Não foi possível atualizar favoritos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={fav ? "warning" : "light"}
      onClick={handleClick}
      className="fav-btn"
      aria-pressed={fav}
      aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      title={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      disabled={loading}
    >
      {loading ? (
        <Spinner animation="border" size="sm" />
      ) : fav ? (
        <BsStarFill size={size} />
      ) : (
        <BsStar size={size} />
      )}
    </Button>
  );
}

FavoriteButton.propTypes = {
  movieId: PropTypes.number.isRequired,
  size: PropTypes.number,
};

export default FavoriteButton;
