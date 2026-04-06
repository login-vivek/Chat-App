import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./context/AuthContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* AuthProvider wraps everything so any component can access user data */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);