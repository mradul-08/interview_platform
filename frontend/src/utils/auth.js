import api from "../api/api";

export async function logoutEverywhere() {
  try {
    await api.post("/api/auth/logout-all");
  } catch {
    // ignore, local cleanup still runs
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }
}

export async function logoutCurrentDevice() {
  try {
    await api.post("/api/auth/logout");
  } catch {
    // ignore, local cleanup still runs
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }
}
