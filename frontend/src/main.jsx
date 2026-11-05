import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CityProvider } from "./context/CityContext.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CityProvider>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              style: { background: "#161a2e", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", fontSize: "14px" },
              success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
              error: { iconTheme: { primary: "#f43f5e", secondary: "#fff" } },
            }}
          />
        </CityProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
