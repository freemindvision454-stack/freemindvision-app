import React, { useEffect, useState } from "react";
import axios from "../utils/axios"; // Ton axios configuré avec token

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    loadUsers();
    loadReports();
    loadVideos();
  }, []);

  // --- CHARGER USERS ---
  async function loadUsers() {
    const res = await axios.get("/admin/users");
    setUsers(res.data);
  }

  // --- BANNIR USER ---
  async function banUser(id) {
    await axios.post(`/admin/ban/${id}`);
    loadUsers();
  }

  // --- SUPPRIMER USER ---
  async function deleteUser(id) {
    await axios.delete(`/admin/delete/${id}`);
    loadUsers();
  }

  // --- BOOSTER VIDEO ---
  async function boostVideo(id) {
    await axios.post(`/admin/boost/${id}`);
    loadVideos();
  }

  // --- CHARGER SIGNALEMENTS ---
  async function loadReports() {
    const res = await axios.get("/admin/reports");
    setReports(res.data);
  }

  // --- CHARGER VIDEOS ---
  async function loadVideos() {
    const res = await axios.get("/admin/videos");
    setVideos(res.data);
  }

  return (
    <div className="admin-container">
      <h1>Dashboard Admin</h1>

      {/* UTILISATEURS */}
      <section>
        <h2>Utilisateurs</h2>
        {users.map((u) => (
          <div key={u.id}>
            <p>{u.email} — {u.status}</p>
            <button onClick={() => banUser(u.id)}>Ban</button>
            <button onClick={() => deleteUser(u.id)}>Supprimer</button>
          </div>
        ))}
      </section>

      {/* VIDEOS */}
      <section>
        <h2>Vidéos</h2>
        {videos.map((v) => (
          <div key={v.id}>
            <p>{v.title}</p>
            <button onClick={() => boostVideo(v.id)}>Booster</button>
          </div>
        ))}
      </section>

      {/* SIGNALEMENTS */}
      <section>
        <h2>Signalements</h2>
        {reports.map((r) => (
          <div key={r.id}>
            <p>{r.reason}</p>
          </div>
        ))}
      </section>
    </div>
  );
            }
// client/src/pages/Admin.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth"; // d'après ton projet
import axios from "../utils/axios"; // d'après ton projet (axios avec token)

export default function Admin() {
  const { user } = useAuth(); // vérifie si connecté et si user.isAdmin existe
  const [users, setUsers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Bloquer l'accès si pas admin
  if (!user?.isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Accès interdit</h1>
        <p>Vous n'avez pas les permissions administratives pour accéder à cette page.</p>
      </div>
    );
  }

  useEffect(() => {
    // charger tous les éléments au montage
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setError(null);
    setLoading(true);
    try {
      await Promise.all([loadUsers(), loadVideos(), loadReports()]);
    } catch (err) {
      console.error(err);
      setError("Erreur de chargement des données.");
    } finally {
      setLoading(false);
    }
  }

  // --- USERS ---
  async function loadUsers() {
    try {
      const res = await axios.get("/admin/users");
      setUsers(res.data || []);
    } catch (err) {
      console.error("loadUsers:", err);
      setError("Impossible de charger les utilisateurs.");
    }
  }

  async function banUser(id) {
    if (!window.confirm("Confirmer bannissement de cet utilisateur ?")) return;
    try {
      await axios.post(`/admin/ban/${id}`);
      await loadUsers();
    } catch (err) {
      console.error("banUser:", err);
      setError("Impossible de bannir l'utilisateur.");
    }
  }

  async function deleteUser(id) {
    if (!window.confirm("Confirmer suppression définitive de cet utilisateur ?")) return;
    try {
      await axios.delete(`/admin/delete/${id}`);
      await loadUsers();
    } catch (err) {
      console.error("deleteUser:", err);
      setError("Impossible de supprimer l'utilisateur.");
    }
  }

  // --- VIDEOS ---
  async function loadVideos() {
    try {
      const res = await axios.get("/admin/videos");
      setVideos(res.data || []);
    } catch (err) {
      console.error("loadVideos:", err);
      setError("Impossible de charger les vidéos.");
    }
  }

  async function boostVideo(id) {
    if (!window.confirm("Booster cette vidéo (mettre en avant) ?")) return;
    try {
      await axios.post(`/admin/boost/${id}`);
      await loadVideos();
    } catch (err) {
      console.error("boostVideo:", err);
      setError("Impossible de booster la vidéo.");
    }
  }

  // --- REPORTS / SIGNALMENTS ---
  async function loadReports() {
    try {
      const res = await axios.get("/admin/reports");
      setReports(res.data || []);
    } catch (err) {
      console.error("loadReports:", err);
      setError("Impossible de charger les signalements.");
    }
  }

  // simple UI
  return (
    <div className="admin-container" style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>Dashboard Admin</h1>

      {loading && <p>Chargement...</p>}
      {error && (
        <div style={{ color: "red", marginBottom: 12 }}>
          <strong>Erreur:</strong> {error}
        </div>
      )}

      <section style={{ marginBottom: 24 }}>
        <h2>Utilisateurs ({users.length})</h2>
        {users.length === 0 ? (
          <p>Aucun utilisateur trouvé.</p>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              style={{
                border: "1px solid #eee",
                padding: 10,
                marginBottom: 8,
                borderRadius: 6,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p style={{ margin: 0 }}>
                  <strong>{u.email}</strong> — <small>{u.status || u.role || "—"}</small>
                </p>
                {u.display_name && <small>{u.display_name}</small>}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => banUser(u.id)}
                  style={{ padding: "6px 10px", cursor: "pointer" }}
                >
                  {u.banned ? "Débannir" : "Bannir"}
                </button>

                <button
                  onClick={() => deleteUser(u.id)}
                  style={{ padding: "6px 10px", cursor: "pointer", background: "#fdd" }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Vidéos ({videos.length})</h2>
        {videos.length === 0 ? (
          <p>Aucune vidéo trouvée.</p>
        ) : (
          videos.map((v) => (
            <div
              key={v.id}
              style={{
                border: "1px solid #eee",
                padding: 10,
                marginBottom: 8,
                borderRadius: 6,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p style={{ margin: 0 }}>
                  <strong>{v.title || "Sans titre"}</strong>
                </p>
                <small>{v.uploader_email || v.uploader_name}</small>
              </div>

              <div>
                <button onClick={() => boostVideo(v.id)} style={{ padding: "6px 10px" }}>
                  Booster
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Signalements ({reports.length})</h2>
        {reports.length === 0 ? (
          <p>Aucun signalement.</p>
        ) : (
          reports.map((r) => (
            <div
              key={r.id}
              style={{
                border: "1px solid #eee",
                padding: 10,
                marginBottom: 8,
                borderRadius: 6,
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>Raison :</strong> {r.reason || "—"}
              </p>
              <small>Par : {r.reporter_email || r.reporter_id}</small>
            </div>
          ))
        )}
      </section>

      <div style={{ marginTop: 20 }}>
        <button onClick={loadAll} style={{ padding: "8px 12px" }}>
          Recharger
        </button>
      </div>
    </div>
  );
        }
