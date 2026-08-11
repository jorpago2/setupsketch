import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ScientificUiProvider } from "@jorpago2/scientific-ui";
import "../tokens.css";
import "@xyflow/react/dist/style.css";
import "./styles.scss";
import "./workspace.css";
import "@jorpago2/scientific-ui/styles.css";
import App from "./app/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ScientificUiProvider>
      <App />
    </ScientificUiProvider>
  </StrictMode>,
);
