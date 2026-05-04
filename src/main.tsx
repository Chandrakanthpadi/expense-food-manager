import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSyncQueue } from "./lib/syncQueue";

initSyncQueue();

createRoot(document.getElementById("root")!).render(<App />);
