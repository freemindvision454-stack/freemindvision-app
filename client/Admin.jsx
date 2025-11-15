
import React, { useEffect, useState } from "react";
import axios from "../utils/axios"; // ton axios configuré avec token admin

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    loadUsers();
    loadReports();
    loadVideos();
  }, []);

  async function loadUsers() {
    const res = await axios.get("/admin/users");
    setUsers(res.data);
  }

  async function banUser(id) {
    await axios.post(`/admin/ban/${id}`);
    loadUsers();
  }

  async function deleteUser(id) {
    await axios.delete(`/admin/delete/${id}`);
    loadUsers();
  }

  async function boostVideo(id) {
    await axios.post(`/admin/boost/${id}`);
    loadVideos();
  }

  async function loadReports() {
    const res = await axios.get("/admin/reports");
    setReports(res.data);
  }

  async function loadVideos() {
    const res = await axios.get("/admin/videos");
    setVideos(res.data);
  }

  return (
    <div className="admin-container">
      <h1>Dashboard Admin</h1>

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

      <section>
        <h2>Vidéos</h2>
        {videos.map((v) => (
          <div key={v.id}>
            <p>{v.title}</p>
            <button onClick={() => boostVideo(v.id)}>Booster</button>
          </div>
        ))}
      </section>

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
