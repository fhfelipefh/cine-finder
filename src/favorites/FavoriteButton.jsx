import PropTypes from "prop-types";
import { Button } from "react-bootstrap";
import { BsStar, BsStarFill } from "react-icons/bs";
import { useFavorites } from "../favorites/FavoritesProvider";

function FavoriteButton({ movieId, size = 18 }) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(movieId);

  return (
    <Button
      variant={fav ? "warning" : "light"}
      onClick={(e) => { 
        e.stopPropagation();
        toggle(movieId);
      }}
      className="fav-btn"
      aria-pressed={fav}
      aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      title={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
    >
      {fav ? <BsStarFill size={size} /> : <BsStar size={size} />}
    </Button>
  );
}

FavoriteButton.propTypes = {
  movieId: PropTypes.number.isRequired,
  size: PropTypes.number,
};

export default FavoriteButton;