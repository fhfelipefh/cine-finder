import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { getNowPlayingMovies } from "../api/api";
import "./HeroCarousel.css";

const POSTER_BASE = "https://image.tmdb.org/t/p/w300";

export default function HeroCarousel({ visible, onSelect }) {
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const progressRef = useRef(0);
  const lastTimeRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const itemWidthRef = useRef(0);
  const trackRef = useRef(null);
  const wrapperRef = useRef(null);
  const wrapperWidthRef = useRef(0);
  const gapRef = useRef(0);
  const padLeftRef = useRef(0);
  const baseLen = items.length;
  const displayItems = baseLen ? [...items, ...items] : [];

  useEffect(() => {
    if (!visible || baseLen === 0 || !itemWidthRef.current) return;
    const stepSize = () => itemWidthRef.current + gapRef.current;
    const speed = 42;
    const loop = (ts) => {
      if (!lastTimeRef.current) lastTimeRef.current = ts;
      const dt = (ts - lastTimeRef.current) / 1000;
      lastTimeRef.current = ts;
      progressRef.current += speed * dt;
      const totalSpan = stepSize() * baseLen;
      if (progressRef.current >= totalSpan) progressRef.current -= totalSpan;
      const newIndex = Math.round(progressRef.current / stepSize());
      if (newIndex !== index) setIndex(newIndex);
      if (visible) requestAnimationFrame(loop);
    };
    const id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [visible, baseLen, index]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
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
    if (first && trackRef.current) {
      itemWidthRef.current = first.getBoundingClientRect().width;
      const cs = window.getComputedStyle(trackRef.current);
      const gap = parseFloat(cs.gap || cs.columnGap || "0");
      const padLeft = parseFloat(cs.paddingLeft || "0");
      gapRef.current = isNaN(gap) ? 0 : gap;
      padLeftRef.current = isNaN(padLeft) ? 0 : padLeft;
    }
    const updateWrapper = () => {
      if (wrapperRef.current)
        wrapperWidthRef.current =
          wrapperRef.current.getBoundingClientRect().width;
    };
    updateWrapper();
    window.addEventListener("resize", updateWrapper);
    return () => window.removeEventListener("resize", updateWrapper);
  }, [items]);

  if (!visible) return null;
  if (loading)
    return <div className="hero-strip placeholder">Carregando...</div>;
  if (items.length === 0) return null;

  const progress = progressRef.current;
  const offset = itemWidthRef.current
    ? -progress +
      (wrapperWidthRef.current / 2 - itemWidthRef.current / 2) -
      padLeftRef.current
    : 0;

  return (
    <div className="hero-strip">
      <div className="hero-track-wrapper" ref={wrapperRef}>
        <div
          className="hero-track"
          ref={trackRef}
          style={{
            transform: `translateX(${offset}px)`,
            transition: "none",
          }}
        >
          {displayItems.map((m, i) => (
            <button
              key={m.id + "-" + i}
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
