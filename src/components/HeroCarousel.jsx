import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { getNowPlayingMovies } from "../api/api";
import "./HeroCarousel.css";

const POSTER_BASE = "https://image.tmdb.org/t/p/w300";

export default function HeroCarousel({ visible, onSelect }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const trackRef = useRef(null);
  const itemWidthRef = useRef(0);
  const gapRef = useRef(0);

  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  const progressRef = useRef(0);
  const pausedRef = useRef(false);

  const baseLen = items.length;
  const displayItems = baseLen ? [...items, ...items] : [];

  useEffect(() => {
    if (!visible) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await getNowPlayingMovies(1);
        if (!active) return;
        const sorted = [...(data.results || [])]
          .filter((m) => m.poster_path)
          .sort((a, b) => {
            const da = a.release_date || "0000-00-00";
            const db = b.release_date || "0000-00-00";
            if (da === db) return b.popularity - a.popularity;
            return db.localeCompare(da);
          })
          .slice(0, 18);
        setItems(sorted);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [visible]);

  useEffect(() => {
    const first = trackRef.current?.querySelector(".hc-item");
    if (!first || !trackRef.current) return;
    itemWidthRef.current = first.getBoundingClientRect().width;
    const cs = window.getComputedStyle(trackRef.current);
    gapRef.current = parseFloat(cs.gap || cs.columnGap || "0") || 0;
  }, [items]);

  useEffect(() => {
    if (!visible || !baseLen || !itemWidthRef.current) return;

    const stepSize = () => itemWidthRef.current + gapRef.current;
    const speed = 42;

    const tick = (ts) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      if (!pausedRef.current) {
        const total = stepSize() * baseLen;
        progressRef.current = (progressRef.current + speed * dt) % total;
        const x = -progressRef.current;
        if (trackRef.current) {
          trackRef.current.style.transform = `translate3d(${x}px,0,0)`;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = 0;
    };
  }, [visible, baseLen]);

  if (!visible) return null;
  if (loading)
    return <div className="hero-strip placeholder">Carregando...</div>;
  if (!baseLen) return null;

  return (
    <div
      className="hero-strip"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
    >
      <div className="hero-track-wrapper">
        <div className="hero-track" ref={trackRef}>
          {displayItems.map((m, i) => (
            <button
              key={`${m.id}-${i}`}
              type="button"
              className="hc-item"
              onClick={() => onSelect(m.id)}
              aria-label={m.title}
            >
              <img
                src={POSTER_BASE + m.poster_path}
                alt={m.title}
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

HeroCarousel.propTypes = {
  visible: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
};
