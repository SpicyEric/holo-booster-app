import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Apply saved dark mode preference ONLY for app routes to avoid flash
// Website (non-app) routes must always stay in light mode
const isAppRoute = window.location.pathname.startsWith('/app');
if (isAppRoute) {
  const savedDark = localStorage.getItem('eloyo-dark-mode') === 'true';
  if (savedDark) {
    document.documentElement.classList.add('dark');
  }
} else {
  // Force light mode for website
  document.documentElement.classList.remove('dark');
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
