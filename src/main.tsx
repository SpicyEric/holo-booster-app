import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Apply saved dark mode preference ONLY for app routes to avoid flash
// Website (non-app) routes must always stay in light mode
const root = document.documentElement;
const isAppRoute = window.location.pathname.startsWith('/app');
root.setAttribute('data-app-route', isAppRoute ? 'true' : 'false');

if (isAppRoute) {
  const savedDark = localStorage.getItem('eloyo-dark-mode') === 'true';
  root.classList.toggle('dark', savedDark);
  root.classList.toggle('light', !savedDark);
  root.style.colorScheme = savedDark ? 'dark' : 'light';
} else {
  // Force light mode for website
  root.classList.remove('dark');
  root.classList.add('light');
  root.style.colorScheme = 'only light';
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
