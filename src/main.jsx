import "bootstrap/dist/css/bootstrap.min.css";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { FavoritesProvider } from "./favorites/FavoritesProvider.jsx";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <FavoritesProvider>
    <StrictMode>
      <App />
    </StrictMode>
    ,
  </FavoritesProvider>
);
