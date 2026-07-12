import axios from "axios";

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export const apiClient = axios.create({
  baseURL: BACKEND_URL,
});

export const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("drive_app_token");
};

export const getSavedUser = () => {
  if (typeof window === "undefined") return null;

  const savedUser = localStorage.getItem("drive_app_user");

  if (!savedUser) return null;

  try {
    return JSON.parse(savedUser);
  } catch {
    return null;
  }
};

export const saveAuth = ({ token, user }) => {
  localStorage.setItem("drive_app_token", token);
  localStorage.setItem("drive_app_user", JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem("drive_app_token");
  localStorage.removeItem("drive_app_user");
};

export const authHeaders = () => {
  const token = getToken();

  return {
    Authorization: `Bearer ${token}`,
  };
};

export const handleAuthError = (error) => {
  const code = error.response?.data?.code;

  if (
    code === "TOKEN_REVOKED" ||
    code === "GOOGLE_LOGIN_REQUIRED" ||
    error.response?.status === 401
  ) {
    clearAuth();
    window.location.href = "/login";
    return true;
  }

  return false;
};

export const formatBytes = (bytes) => {
  const value = Number(bytes || 0);

  if (!value) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(value) / Math.log(1024));

  return `${(value / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
};