import axios from "axios";

/**
 * Centralized Axios instance configured for FastAPI Backend (Local or Render)
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Development-only console check for missing environment variable
if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  console.error(
    "[API Configuration Error] VITE_API_URL is missing or undefined. In local development, configure VITE_API_URL=http://localhost:8000 in your .env file."
  );
}

// Request Interceptor: Automatically attach JWT Bearer token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Standardized error logging without crashing React app
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with non-2xx status (400, 401, 403, 404, 500, etc.)
      const errorDetail =
        error.response.data?.detail ||
        error.response.data?.message ||
        error.response.statusText ||
        "Server Error";
      console.error(
        `[API Error ${error.response.status}] [${error.config?.method?.toUpperCase()} ${error.config?.url}]:`,
        errorDetail
      );
    } else if (error.request) {
      // Backend is offline, asleep (Render cold start), or network failure
      console.error(
        `[API Network Error] Backend unavailable or network request failed [${error.config?.method?.toUpperCase()} ${error.config?.url}]:`,
        error.message
      );
    } else {
      console.error("[API Setup Error]:", error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
