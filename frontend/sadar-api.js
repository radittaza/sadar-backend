/* ================= CONFIG ================= */
const API_BASE = "https://sadar-backend-production.up.railway.app";

/* ================= STORAGE KEYS ================= */
const KEY_TOKEN = "sadar_token";
const KEY_USERNAME = "sadar_username";
const KEY_DEMOGRAFI = "sadar_demografi";
const KEY_ANSWERS = "sadar_answers";
const KEY_HASIL = "hasil_deteksi";
const KEY_RIWAYAT_DETAIL = "riwayat_detail";

/* ================= TOKEN / USER ================= */
function setToken(token) {
  localStorage.setItem(KEY_TOKEN, token);
}

function getToken() {
  return localStorage.getItem(KEY_TOKEN);
}

function clearAuthStorage() {
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_USERNAME);
}

function setUsername(username) {
  if (username) localStorage.setItem(KEY_USERNAME, username);
}

function getUsername() {
  // 1) coba dari JWT (paling akurat)
  const t = getToken();
  if (t) {
    const p = decodeJwtPayload(t);
    const u = p?.sub || p?.username || p?.user || null;
    if (u) return u;
  }

  // 2) fallback dari localStorage
  return localStorage.getItem(KEY_USERNAME) || "-";
}

function requireAuth() {
  const t = getToken();
  if (!t) window.location.href = "index.html";
}

/* ================= JWT DECODE ================= */
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/* ================= LOGOUT ================= */
function logout() {
  clearAuthStorage();
  localStorage.removeItem(KEY_DEMOGRAFI);
  localStorage.removeItem(KEY_ANSWERS);
  localStorage.removeItem(KEY_HASIL);
  localStorage.removeItem(KEY_RIWAYAT_DETAIL);
  window.location.href = "index.html";
}

/* ================= HELPER FETCH (AUTO AUTH + ERROR HANDLING) ================= */
async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {}),
  };

  // set JSON header default kalau body-nya object/string
  if (!headers["Content-Type"] && options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  // auth
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, {
    ...options,
    headers,
  });

  // ambil response dengan aman (kadang text/plain)
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

  if (!res.ok) {
    const msg =
      (payload && payload.detail) ||
      (typeof payload === "string" && payload) ||
      res.statusText ||
      "Request gagal";
    throw new Error(msg);
  }

  return payload;
}

/* ================= AUTH ================= */
async function loginUser(username, password) {
  const data = await apiFetch("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  // backend biasanya balikin access_token
  if (!data?.access_token) throw new Error("Token tidak ditemukan dari server");

  setToken(data.access_token);

  // simpan username juga (fallback), tapi utamanya tetap JWT
  setUsername(username);

  window.location.href = "dashboard.html";
}

async function registerUser(payloadOrUsername, passwordMaybe) {
  // support 2 cara:
  // 1) registerUser({email, username, password, name, address})
  // 2) registerUser(username, password)

  let body;
  if (typeof payloadOrUsername === "string") {
    body = { username: payloadOrUsername, password: passwordMaybe };
  } else {
    body = payloadOrUsername || {};
  }

  return await apiFetch("/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* ================= DETEKSI ================= */
async function submitDeteksi(payload) {
  const data = await apiFetch("/predict", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  localStorage.setItem(KEY_HASIL, JSON.stringify(data));
  window.location.href = "deteksi-hasil.html";
}

/* ================= RIWAYAT ================= */
async function loadRiwayat() {
  // asumsi backend sudah otomatis filter berdasarkan user dari token
  const data = await apiFetch("/history", { method: "GET" });

  // normalisasi bentuk data (kalau backend balikin {items:[]})
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

/* ================= DETAIL RIWAYAT (optional helper) ================= */
function saveRiwayatDetail(obj) {
  localStorage.setItem(KEY_RIWAYAT_DETAIL, JSON.stringify(obj));
}

function getRiwayatDetail() {
  try {
    return JSON.parse(localStorage.getItem(KEY_RIWAYAT_DETAIL) || "null");
  } catch {
    return null;
  }
}

/* ================= UI HELPER (optional) ================= */
function applyUserUI(opts = {}) {
  const username = getUsername();
  const nameEls = document.querySelectorAll(opts.nameSelector || "#userName, #greetingName");
  nameEls.forEach((el) => (el.textContent = username || "-"));

  const avatar = document.querySelector(opts.avatarSelector || "#userAvatar");
  if (avatar) {
    avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(username || "User")}&background=ec4899&color=fff`;
  }
}
