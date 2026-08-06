import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GlobalTheme } from "@carbon/react";
import "../tokens.css";
import "@xyflow/react/dist/style.css";
import "./styles.scss";
import App from "./Editor";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GlobalTheme theme="g10">
      <App />
    </GlobalTheme>
  </StrictMode>,
);
