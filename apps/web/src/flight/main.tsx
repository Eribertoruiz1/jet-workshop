import "@fontsource/b612/400.css";
import "@fontsource/b612/700.css";
// Only its colour and type variables are used here (brief 006, Amendment 1, point 3).
import "../styles.css";
import "./flight.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FlightApp } from "./FlightApp.tsx";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <FlightApp />
    </StrictMode>,
  );
}
