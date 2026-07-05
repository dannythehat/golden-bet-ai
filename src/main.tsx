import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// First-party visit beacon — once per browser session, production host only.
try {
  if (!/^(localhost|127\.|192\.168\.)/.test(location.hostname) && !sessionStorage.getItem("fo_hit")) {
    sessionStorage.setItem("fo_hit", "1");
    if (!navigator.sendBeacon?.("/api/hit")) void fetch("/api/hit", { method: "POST", keepalive: true }).catch(() => {});
  }
} catch { /* counting must never break the site */ }

createRoot(document.getElementById("root")!).render(<App />);
