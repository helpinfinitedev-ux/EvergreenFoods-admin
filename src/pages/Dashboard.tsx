import { useEffect, useState } from "react";
import { adminAPI, expenseAPI } from "../api";

interface ExpenseSummary {
  cashTotal: number;
  bankTotal: number;
  total: number;
  count: number;
}

interface TotalCapital {
  id: string;
  totalCash: number;
  todayCash: number;
  cashLastUpdatedAt: string | null;
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null);
  const [totalCapital, setTotalCapital] = useState<TotalCapital | null>(null);
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

      const [dashboardRes, expenseRes, capitalRes] = await Promise.all([
        adminAPI.getDashboard(),
        expenseAPI.getSummary({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
        adminAPI.getTotalCapital(),
      ]);

      setStats(dashboardRes.data);
      setExpenseSummary(expenseRes.data);
      setTotalCapital(capitalRes.data);
    } catch (err) {
      console.error("Failed to load stats", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Loading...</div>;
  console.log(stats);
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

      {/* Today's Buy & Sell Cards Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "24px",
          marginBottom: "30px",
        }}>
        {/* Today's Buy Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
            padding: "32px",
            borderRadius: "16px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 6px rgba(59, 130, 246, 0.3)",
          }}>
          <div>
            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>Today's Buy (Purchase)</div>
            <div style={{ fontSize: "36px", fontWeight: "800" }}>₹{(stats?.todayBuyTotalAmount || 0).toLocaleString()}</div>
            <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
              <div style={{ fontSize: "13px", opacity: 0.9 }}>
                <span style={{ opacity: 0.7 }}>Qty:</span> {stats?.todayBuy || 0} KG
              </div>
              <div style={{ fontSize: "13px", opacity: 0.9 }}>
                <span style={{ opacity: 0.7 }}>Avg Rate:</span> ₹{stats?.todayBuyAvgRate || 0}/kg
              </div>
            </div>
          </div>
          <div style={{ fontSize: "56px", opacity: 0.3 }}>📥</div>
        </div>

        {/* Today's Sell Card */}
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
            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>Today's Sell</div>
            <div style={{ fontSize: "36px", fontWeight: "800" }}>₹{(stats?.todaySellTotalAmount || 0).toLocaleString()}</div>
            <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
              <div style={{ fontSize: "13px", opacity: 0.9 }}>
                <span style={{ opacity: 0.7 }}>Qty:</span> {stats?.todaySell || 0} KG
              </div>
              <div style={{ fontSize: "13px", opacity: 0.9 }}>
                <span style={{ opacity: 0.7 }}>Avg Rate:</span> ₹{(stats?.todaySellAvgRate || 0).toFixed(2)}/kg
              </div>
            </div>
          </div>
          <div style={{ fontSize: "56px", opacity: 0.3 }}>📤</div>
        </div>
      </div>

      {/* Today's Profit/Loss Card */}
      <div style={{ marginBottom: "30px" }}>
        <div
          style={{
            background: (stats?.todayProfit || 0) >= 0 ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            padding: "32px",
            borderRadius: "16px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: (stats?.todayProfit || 0) >= 0 ? "0 4px 6px rgba(16, 185, 129, 0.3)" : "0 4px 6px rgba(239, 68, 68, 0.3)",
          }}>
          <div>
            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>Today's {(stats?.todayProfit || 0) >= 0 ? "Profit" : "Loss"}</div>
            <div style={{ fontSize: "42px", fontWeight: "800" }}>
              {(stats?.todayProfit || 0) >= 0 ? "+" : ""}₹{Math.abs(stats?.todayProfit || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "8px" }}>
              Sell (₹{(stats?.todaySellTotalAmount || 0).toLocaleString()}) - Buy (₹{(stats?.todayBuyTotalAmount || 0).toLocaleString()})
            </div>
          </div>
          <div style={{ fontSize: "64px", opacity: 0.3 }}>{(stats?.todayProfit || 0) >= 0 ? "📈" : "📉"}</div>
        </div>
      </div>

      {/* Payment Received & Available Stock Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "24px",
          marginBottom: "30px",
        }}>
        {/* Payment Received Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            padding: "32px",
            borderRadius: "16px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 6px rgba(245, 158, 11, 0.3)",
          }}>
          <div>
            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>Payment Received Today</div>
            <div style={{ fontSize: "36px", fontWeight: "800" }}>₹{Number(totalCapital?.todayCash || 0).toLocaleString()}</div>
            <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "8px" }}>Cash received and tracked today</div>
          </div>
          <div style={{ fontSize: "56px", opacity: 0.3 }}>💰</div>
        </div>

        {/* Total Cash Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
            padding: "32px",
            borderRadius: "16px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 6px rgba(14, 165, 233, 0.3)",
          }}>
          <div>
            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>Total Cash</div>
            <div style={{ fontSize: "36px", fontWeight: "800" }}>₹{Number(totalCapital?.totalCash || 0).toLocaleString()}</div>
            <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "8px" }}>Cash available in hand</div>
          </div>
          <div style={{ fontSize: "56px", opacity: 0.3 }}>💵</div>
        </div>

        {/* Total Available Stock Card */}

        {/* Total Bank Balance Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
            padding: "32px",
            borderRadius: "16px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 6px rgba(59, 130, 246, 0.3)",
          }}>
          <div>
            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>Total Bank Balance</div>
            <div style={{ fontSize: "36px", fontWeight: "800" }}>₹{Number(stats?.totalBankBalance || 0).toLocaleString()}</div>
            <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "8px" }}>Sum of all bank balances</div>
          </div>
          <div style={{ fontSize: "56px", opacity: 0.3 }}>🏦</div>
        </div>

        {/* Total in Market Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
            padding: "32px",
            borderRadius: "16px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 6px rgba(249, 115, 22, 0.3)",
          }}>
          <div>
            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>Total in Market</div>
            <div style={{ fontSize: "36px", fontWeight: "800" }}>₹{Number(stats?.totalInMarket || 0).toLocaleString()}</div>
            <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "8px" }}>Total customer due balance</div>
          </div>
          <div style={{ fontSize: "56px", opacity: 0.3 }}>📌</div>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
            padding: "32px",
            borderRadius: "16px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 6px rgba(139, 92, 246, 0.3)",
          }}>
          <div>
            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>Total Available Stock</div>
            <div style={{ fontSize: "36px", fontWeight: "800" }}>{(stats?.totalAvailableStock || 0).toFixed(2)} KG</div>
            <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "8px" }}>Combined stock from all drivers today</div>
          </div>
          <div style={{ fontSize: "56px", opacity: 0.3 }}>📦</div>
        </div>
      </div>

      {/* Individual Bank Balances */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "30px" }}>
        {(stats?.banks || []).map((b: any) => (
          <div
            key={b.id}
            style={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ fontSize: "13px", color: "#6b7280", fontWeight: "700" }}>{b.name}</div>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontSize: "12px",
                  fontWeight: "800",
                }}>
                {b.label}
              </span>
            </div>
            <div style={{ marginTop: "6px", fontSize: "20px", fontWeight: "900", color: "#111827" }}>₹{Number(b.balance || 0).toFixed(2)}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "24px",
          marginBottom: "30px",
        }}>
        <StatCard title="Weight Loss" value={`${stats?.todayWeightLoss || 0} KG`} color="#ef4444" icon="📉" />
        <div
          style={{
            background: "white",
            padding: "28px",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            borderLeft: "5px solid #dc2626",
            minHeight: "120px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500" }}>Weight Loss %</div>
            <span style={{ fontSize: "24px" }}>📊</span>
          </div>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "#111827" }}>{(stats?.totalWeightLossPercentage || 0).toFixed(2)}%</div>
          <div style={{ fontSize: "12px", color: "#9ca3af" }}>Against {stats?.todayBuy || 0} KG bought</div>
        </div>
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
