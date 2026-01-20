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
  verifyOtp: (mobile: string, otp: string) => api.post("/auth/verify-otp", { mobile, otp }),
};

export const adminAPI = {
  getDashboard: (params?: { date?: number }) => {
    console.log(params);
    return api.get("/admin/dashboard", { params });
  },
  getDrivers: () => api.get("/admin/drivers"),
  createDriver: (data: { name: string; mobile: string; password: string; baseSalary?: number }) => api.post("/admin/drivers", data),
  updateDriver: (id: string, data: { password?: string; baseSalary?: number }) => api.put(`/admin/drivers/${id}`, data),
  deleteDriver: (id: string) => api.delete(`/admin/drivers/${id}`),
  updateDriverStatus: (id: string, status: string) => api.put(`/admin/drivers/${id}/status`, { status }),
  getDueCustomers: (params?: { startDate?: string; endDate?: string }) => api.get("/admin/customers/due", { params }),
  receiveCustomerPayment: (id: string, data: { amount: number; method: "CASH" | "BANK"; bankId?: string }) => api.post(`/admin/customers/${id}/receive-payment`, data),
  getBorrowedInfo: () => api.get("/admin/borrowed-money"),
  addBorrowedInfo: (data: { borrowedMoney?: number; borrowedFrom?: string; borrowedOn?: string }) => api.post("/admin/borrowed-money", data),
  updateBorrowedInfo: (id: string, data: { borrowedMoney?: number; borrowedFrom?: string; borrowedOn?: string }) => api.put(`/admin/borrowed-money/${id}`, data),
  deleteBorrowedInfo: (id: string) => api.delete(`/admin/borrowed-money/${id}`),
  getCashToBank: (params?: { page?: number; startDate?: string; endDate?: string }) => api.get("/admin/cash-to-bank", { params }),
  createCashToBank: (data: { bankName: string; amount: number; date: string; bankId: string }) => api.post("/admin/cash-to-bank", data),
  updateCashToBank: (id: string, data: { bankName?: string; amount?: number }) => api.put(`/admin/cash-to-bank/${id}`, data),
  deleteCashToBank: (id: string) => api.delete(`/admin/cash-to-bank/${id}`),
  getTransactions: (params?: any) => api.get("/admin/transactions", { params }),
  getDriverHistory: (driverId: string, params?: { type?: string; startDate?: string; endDate?: string }) => api.get("/admin/transactions", { params: { driverId, ...params } }),
  updateTransaction: (id: string, data: { amount?: number; rate?: number; totalAmount?: number; details?: string | null; companyId?: string }) => api.put(`/admin/transactions/${id}`, data),
  deleteTransaction: (id: string) => api.delete(`/admin/transactions/${id}`),
  createFinancialNote: (data: any) => api.post("/admin/financial/note", data),
  getTotalCapital: () => api.get("/admin/total-capital"),
};

export const bankAPI = {
  getAll: () => api.get("/admin/banks"),
  getDetails: () => api.get("/admin/banks/details"),
  update: (id: string, data: { name?: string; label?: string; balance?: number }) => api.put(`/admin/banks/${id}`, data),
  transfer: (data: { fromBankId: string; toBankId: string; amount: number }) => api.post("/admin/banks/transfer", data),
};

export const vehicleAPI = {
  getAll: () => api.get("/admin/vehicles"),
  getById: (id: string) => api.get(`/admin/vehicles/${id}`),
  create: (data: { registration: string; currentKm?: number; status?: string }) => api.post("/admin/vehicles", data),
  update: (id: string, data: { registration: string; currentKm?: number; status?: string }) => api.put(`/admin/vehicles/${id}`, data),
  delete: (id: string) => api.delete(`/admin/vehicles/${id}`),
};

export const customerAPI = {
  getAll: () => api.get("/api/customers"),
  getHistory: (id: string) => api.get(`/api/customers/${id}/history`),
  create: (data: { name: string; mobile: string; address?: string; balance?: number }) => api.post("/api/customers", data),
  update: (id: string, data: { name?: string; mobile?: string; address?: string; balance?: number }) => api.patch(`/api/customers/${id}`, data),
};

export const companyAPI = {
  getAll: (params?: { page?: number; name?: string; mobile?: string; address?: string }) => api.get("/admin/companies", { params }),
  create: (data: { name: string; mobile?: string; address?: string; amountDue?: number }) => api.post("/admin/companies", data),
  update: (id: string, data: { name?: string; mobile?: string | null; address?: string | null; amountDue?: number }) => api.patch(`/admin/companies/${id}`, data),
  delete: (id: string) => api.delete(`/admin/companies/${id}`),
};

export const notificationAPI = {
  create: (message: string) => api.post("/api/notifications", { message }),
  getAll: () => api.get("/api/notifications"),
  markAsRead: (id: string) => api.patch(`/api/notifications/${id}`, { isRead: true }),
  markAllAsRead: () => api.patch("/api/notifications/read-all"),
};

export const expenseAPI = {
  getAll: (params?: { type?: string; startDate?: string; endDate?: string; category?: string }) => api.get("/admin/expenses", { params }),
    getSummary: (params?: { startDate?: string; endDate?: string }) => api.get("/admin/expenses/summary", { params }),
  create: (data: { type: "CASH" | "BANK"; amount: number; description: string; category?: string; date?: string; bankId?: string }) => api.post("/admin/expenses", data),
  update: (id: string, data: { type?: string; amount?: number; description?: string; category?: string; date?: string }) => api.put(`/admin/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/admin/expenses/${id}`),
};

export const paymentAPI = {
  getAll: (params?: { page?: number; startDate?: string; endDate?: string; bankId?: string }) => api.get("/admin/payments", { params }),
  create: (data: { amount: number; companyName?: string; description?: string; date?: string; bankId?: string; companyId?: string }) => api.post("/admin/payments", data),
  update: (id: string, data: { amount?: number; companyName?: string; description?: string; date?: string; bankId?: string | null; companyId?: string | null }) =>
    api.patch(`/admin/payments/${id}`, data),
  delete: (id: string) => api.delete(`/admin/payments/${id}`),
};

export default api;
