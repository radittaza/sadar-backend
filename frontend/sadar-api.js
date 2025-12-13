const API_BASE = "http://localhost:8000"; 

function setToken(token) { localStorage.setItem("sadar_token", token); }
function getToken() { return localStorage.getItem("sadar_token"); }

function setUsername(username){ localStorage.setItem("sadar_username", username); }
function getUsername(){ return localStorage.getItem("sadar_username") || "User"; }

function requireAuth() {
  const t = getToken();
  if (!t) window.location.href = "index.html";
}

function logout() {
  localStorage.removeItem("sadar_token");
  localStorage.removeItem("sadar_username");
  localStorage.removeItem("sadar_demografi");
  localStorage.removeItem("sadar_answers");
  localStorage.removeItem("hasil_deteksi");
  localStorage.removeItem("riwayat_detail");
  window.location.href = "index.html";
}

/* ================= AUTH ================= */
async function loginUser(username, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login gagal");
  setToken(data.access_token);
  setUsername(username);
  window.location.href = "dashboard.html";
}

async function registerUser(username, password) {
  const res = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Register gagal");
  return data;
}

/* ================= DETEKSI ================= */
async function submitDeteksi(payload) {
  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getToken()}`
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Gagal deteksi");

  localStorage.setItem("hasil_deteksi", JSON.stringify(data));
  window.location.href = "deteksi-hasil.html";
}

/* ================= RIWAYAT ================= */
async function loadRiwayat() {
  const res = await fetch(`${API_BASE}/history`, {
    headers: { "Authorization": `Bearer ${getToken()}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Gagal load riwayat");
  return data;
}
