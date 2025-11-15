import { useEffect, useState } from "react";
import axios from "axios";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("https://ton-api.com/admin/stats")
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Dashboard</h1>

      <div style={{ marginTop: 20 }}>
        <h3>👤 Users: {stats.users}</h3>
        <h3>🎬 Videos: {stats.videos}</h3>
        <h3>💰 Revenue: ${stats.revenue}</h3>
      </div>
    </div>
  );
}
