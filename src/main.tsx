import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installToastSounds } from "./lib/sounds";

installToastSounds();
createRoot(document.getElementById("root")!).render(<App />);
