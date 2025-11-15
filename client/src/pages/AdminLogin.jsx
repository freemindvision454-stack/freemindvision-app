import { useState } from "react";
import axios from "axios";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post("https://ton-api.com/admin/login", {
        email,
        password,
      });

      if (res.data.token) {
        localStorage.setItem("adminToken", res.data.token);
        window.location.href = "/admin/dashboard";
      }
    } catch (err) {
      setError("Identifiants incorrects");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Login</h1>

      <form onSubmit={handleLogin} style={{ marginTop: 20 }}>
        <input
          type="email"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        /><br /><br />

        <input
          type="password"
          placeholder="Mot de passe admin"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        /><br /><br />

        <button type="submit">Se connecter</button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
    }
