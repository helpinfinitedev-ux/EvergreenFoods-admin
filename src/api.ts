import axios from "axios";
import { API_BASE_URL } from "./config";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (mobile: string, password: string) => api.post("/auth/login", { mobile, password }),
};

export const adminAPI = {
  getDashboard: () => api.get("/admin/dashboard"),
  getDrivers: () => api.get("/admin/drivers"),
  createDriver: (data: { name: string; mobile: string; password: string; baseSalary?: number }) => api.post("/admin/drivers", data),
  updateDriverStatus: (id: string, status: string) => api.put(`/admin/drivers/${id}/status`, { status }),
  getTransactions: (params?: any) => api.get("/admin/transactions", { params }),
  createFinancialNote: (data: any) => api.post("/admin/financial/note", data),
};

export const vehicleAPI = {
  getAll: () => api.get("/admin/vehicles"),
  getById: (id: string) => api.get(`/admin/vehicles/${id}`),
  create: (data: { registration: string; currentKm?: number; status?: string }) => api.post("/admin/vehicles", data),
  delete: (id: string) => api.delete(`/admin/vehicles/${id}`),
};

export const customerAPI = {
  getAll: () => api.get("/api/customers"),
  getHistory: (id: string) => api.get(`/api/customers/${id}/history`),
};

export const notificationAPI = {
  create: (message: string) => api.post("/api/notifications", { message }),
  getAll: () => api.get("/api/notifications"),
  markAsRead: (id: string) => api.patch(`/api/notifications/${id}`, { isRead: true }),
  markAllAsRead: () => api.patch("/api/notifications/read-all"),
};

export const expenseAPI = {
  getAll: (params?: { type?: string; startDate?: string; endDate?: string; category?: string }) =>
    api.get("/admin/expenses", { params }),
  getSummary: (params?: { startDate?: string; endDate?: string }) =>
    api.get("/admin/expenses/summary", { params }),
  create: (data: { type: "CASH" | "BANK"; amount: number; description: string; category?: string; date?: string }) =>
    api.post("/admin/expenses", data),
  update: (id: string, data: { type?: string; amount?: number; description?: string; category?: string; date?: string }) =>
    api.put(`/admin/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/admin/expenses/${id}`),
};

export default api;
