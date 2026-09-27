import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { getClinicTimezone } from "./api/clinicInfo.api.js";
import { setClinicTimezone } from "./utils/format.js";
import { App } from "./App.js";
import "./index.css";

async function bootstrap() {
  try {
    const { timezone } = await getClinicTimezone();
    setClinicTimezone(timezone);
  } catch {
    // fall back to the default timezone already set in utils/format.ts
  }

  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element not found");

  createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}

void bootstrap();
