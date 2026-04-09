import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const API = "https://chat-app-server-d22c.onrender.com";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
        return;
      }

      login(data);
      navigate("/chat");
    } catch {
      setError("Server error");
    }

    setLoading(false);
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "16px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box"
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      fontFamily: "sans-serif"
    }}>
      <div style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "20px",
        padding: "clamp(24px, 5vw, 40px)",
        width: "100%",
        maxWidth: "400px"
      }}>

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #2AABEE, #229ED9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: "28px"
          }}>
            💬
          </div>

          <h1 style={{
            color: "#fff",
            fontSize: "clamp(20px, 5vw, 24px)",
            fontWeight: "700",
            margin: "0 0 6px"
          }}>
            Create account
          </h1>

          <p style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: "14px",
            margin: 0
          }}>
            Join ChatApp today
          </p>
        </div>

        {error && (
          <div style={{
            background: "rgba(231,76,60,0.2)",
            border: "1px solid rgba(231,76,60,0.4)",
            color: "#ff6b6b",
            borderRadius: "10px",
            padding: "12px",
            marginBottom: "16px",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", display: "block", marginBottom: "6px" }}>
              Username
            </label>

            <input
              type="text"
              value={username}
              onChange={(e)=>setUsername(e.target.value)}
              required
              placeholder="yourname"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", display: "block", marginBottom: "6px" }}>
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", display: "block", marginBottom: "6px" }}>
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "600",
              background: "linear-gradient(135deg, #2AABEE, #229ED9)",
              color: "#fff",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

        </form>

        <p style={{
          textAlign: "center",
          color: "rgba(255,255,255,0.4)",
          fontSize: "14px",
          marginTop: "24px"
        }}>
          Already have an account?{" "}
          <Link to="/login" style={{
            color: "#2AABEE",
            textDecoration: "none",
            fontWeight: "600"
          }}>
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
}