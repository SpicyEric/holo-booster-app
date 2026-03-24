import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Apply saved dark mode preference before render to avoid flash
const savedDark = localStorage.getItem('eloyo-dark-mode') === 'true';
if (savedDark) {
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
