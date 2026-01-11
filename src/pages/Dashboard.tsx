import { useEffect, useState } from "react";
import { adminAPI, expenseAPI } from "../api";

interface ExpenseSummary {
  cashTotal: number;
  bankTotal: number;
  total: number;
  count: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get last 7 days date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const [dashboardRes, expenseRes] = await Promise.all([
        adminAPI.getDashboard(),
        expenseAPI.getSummary({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      ]);

      setStats(dashboardRes.data);
      setExpenseSummary(expenseRes.data);
    } catch (err) {
      console.error("Failed to load stats", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Loading...</div>;

  return (
    <div style={{ padding: "30px" }}>
      <h1 style={{ marginBottom: "30px", fontSize: "28px", fontWeight: "700" }}>Dashboard</h1>

      {/* Main Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "24px",
          marginBottom: "30px",
        }}>
        <StatCard title="Today Buy" value={`${stats?.todayBuy || 0} KG`} color="#10b981" icon="📥" />
        <StatCard title="Today Sell" value={`${stats?.todaySell || 0} KG`} color="#3b82f6" icon="📤" />
        <StatCard title="Today Shop Buy" value={`${stats?.todayShopBuy || 0} KG`} color="#8b5cf6" icon="🛒" />
      </div>

      {/* Payment Received Card - Highlighted */}
      <div
        style={{
          marginBottom: "30px",
        }}>
        <div
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            padding: "32px",
            borderRadius: "16px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 6px rgba(16, 185, 129, 0.3)",
          }}>
          <div>
            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>Payment Received Today</div>
            <div style={{ fontSize: "42px", fontWeight: "800" }}>₹{(stats?.todayPaymentReceived || 0).toLocaleString()}</div>
            <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "8px" }}>From {stats?.todaySell || 0} KG sold today (Cash + UPI)</div>
          </div>
          <div style={{ fontSize: "64px", opacity: 0.3 }}>💰</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "24px",
          marginBottom: "30px",
        }}>
        <StatCard title="Weight Loss" value={`${stats?.todayWeightLoss || 0} KG`} color="#ef4444" icon="📉" />
        <StatCard title="Fuel Entries" value={stats?.todayFuel || 0} color="#f59e0b" icon="⛽" />
        <StatCard title="Active Drivers" value={stats?.activeDrivers || 0} color="#06b6d4" icon="🚛" />
      </div>

      {/* Expense Summary Section */}
      <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px", color: "#374151" }}>Last 7 Days Expenses</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "24px",
        }}>
        <ExpenseCard title="Cash Expenses" value={expenseSummary?.cashTotal || 0} color="#ef4444" bgColor="#fef2f2" icon="💵" />
        <ExpenseCard title="Bank Expenses" value={expenseSummary?.bankTotal || 0} color="#3b82f6" bgColor="#eff6ff" icon="🏦" />
        <ExpenseCard title="Total Expenses" value={expenseSummary?.total || 0} color="#7c3aed" bgColor="#f5f3ff" icon="💸" />
      </div>
    </div>
  );
}

function StatCard({ title, value, color, icon }: { title: string; value: string | number; color: string; icon: string }) {
  return (
    <div
      style={{
        background: "white",
        padding: "28px",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        borderLeft: `5px solid ${color}`,
        minHeight: "120px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500" }}>{title}</div>
        <span style={{ fontSize: "24px" }}>{icon}</span>
      </div>
      <div style={{ fontSize: "32px", fontWeight: "700", color: "#111827" }}>{value}</div>
    </div>
  );
}

function ExpenseCard({ title, value, color, bgColor, icon }: { title: string; value: number; color: string; bgColor: string; icon: string }) {
  return (
    <div
      style={{
        background: bgColor,
        padding: "28px",
        borderRadius: "12px",
        border: `1px solid ${color}20`,
        minHeight: "120px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500" }}>{title}</div>
        <span style={{ fontSize: "24px" }}>{icon}</span>
      </div>
      <div style={{ fontSize: "32px", fontWeight: "700", color }}>₹{value.toLocaleString()}</div>
    </div>
  );
}
