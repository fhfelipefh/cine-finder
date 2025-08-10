import tmdbLogo from "../assets/tmdb.svg";

function TMDBAttribution() {
  return (
    <div className={`text-center my-4`}>
      <a
        href="https://www.themoviedb.org/"
        target="_blank"
        rel="noreferrer noopener"
        className="d-inline-flex align-items-center gap-2 text-decoration-none"
        aria-label="The Movie Database (TMDB)"
        title="The Movie Database (TMDB)"
      >
        <img src={tmdbLogo} alt="Logotipo do TMDB" style={{ height: 22 }} />
      </a>
    </div>
  );
}

export default TMDBAttribution;
