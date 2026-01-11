import { useEffect, useState } from "react";
import { expenseAPI } from "../api";

interface Expense {
  id: string;
  type: "CASH" | "BANK";
  amount: number;
  description: string;
  category: string | null;
  date: string;
}

interface ExpenseSummary {
  cashTotal: number;
  bankTotal: number;
  total: number;
  count: number;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState<string>("");

  // Form state
  const [formType, setFormType] = useState<"CASH" | "BANK">("CASH");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    loadData();
  }, [filterType]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterType) params.type = filterType;

      const [expensesRes, summaryRes] = await Promise.all([
        expenseAPI.getAll(params),
        expenseAPI.getSummary(),
      ]);

      setExpenses(expensesRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error("Failed to load expenses", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formAmount || !formDescription) {
      alert("Please fill amount and description");
      return;
    }

    try {
      await expenseAPI.create({
        type: formType,
        amount: parseFloat(formAmount),
        description: formDescription,
        category: formCategory || undefined,
        date: formDate,
      });

      alert("Expense added successfully");
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      alert("Failed to add expense");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      await expenseAPI.delete(id);
      loadData();
    } catch (err) {
      alert("Failed to delete expense");
    }
  };

  const resetForm = () => {
    setFormType("CASH");
    setFormAmount("");
    setFormDescription("");
    setFormCategory("");
    setFormDate(new Date().toISOString().split("T")[0]);
  };

  const categories = ["EMI", "Fuel", "Salary", "Labor", "Other"];

  return (
    <div style={{ padding: "30px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700" }}>Expenses</h1>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "12px 24px",
            background: "#667eea",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px",
          }}>
          + Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "30px" }}>
          <div style={summaryCardStyle}>
            <div style={{ color: "#6b7280", fontSize: "14px", marginBottom: "8px" }}>Cash Expenses</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#ef4444" }}>
              ₹{summary.cashTotal.toLocaleString()}
            </div>
          </div>
          <div style={summaryCardStyle}>
            <div style={{ color: "#6b7280", fontSize: "14px", marginBottom: "8px" }}>Bank Expenses</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#3b82f6" }}>
              ₹{summary.bankTotal.toLocaleString()}
            </div>
          </div>
          <div style={summaryCardStyle}>
            <div style={{ color: "#6b7280", fontSize: "14px", marginBottom: "8px" }}>Total Expenses</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#111827" }}>
              ₹{summary.total.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: "10px 16px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
            minWidth: "150px",
          }}>
          <option value="">All Types</option>
          <option value="CASH">Cash</option>
          <option value="BANK">Bank</option>
        </select>
      </div>

      {/* Expenses Table */}
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                  Loading...
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                  No expenses found
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={tdStyle}>
                    {new Date(expense.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: expense.type === "CASH" ? "#fef3c7" : "#dbeafe",
                        color: expense.type === "CASH" ? "#92400e" : "#1e40af",
                      }}>
                      {expense.type}
                    </span>
                  </td>
                  <td style={tdStyle}>{expense.category || "-"}</td>
                  <td style={tdStyle}>{expense.description}</td>
                  <td style={{ ...tdStyle, fontWeight: "600", color: "#dc2626" }}>
                    ₹{Number(expense.amount).toLocaleString()}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      style={{
                        padding: "6px 12px",
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "500",
                      }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}>
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "500px",
            }}>
            <h2 style={{ marginBottom: "24px", fontSize: "20px", fontWeight: "700" }}>Add New Expense</h2>

            {/* Expense Type */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Expense Type *</label>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => setFormType("CASH")}
                  style={{
                    flex: 1,
                    padding: "14px",
                    border: formType === "CASH" ? "2px solid #ef4444" : "1px solid #ddd",
                    borderRadius: "8px",
                    background: formType === "CASH" ? "#fef2f2" : "white",
                    cursor: "pointer",
                    fontWeight: "600",
                    color: formType === "CASH" ? "#dc2626" : "#374151",
                  }}>
                  💵 Cash
                </button>
                <button
                  onClick={() => setFormType("BANK")}
                  style={{
                    flex: 1,
                    padding: "14px",
                    border: formType === "BANK" ? "2px solid #3b82f6" : "1px solid #ddd",
                    borderRadius: "8px",
                    background: formType === "BANK" ? "#eff6ff" : "white",
                    cursor: "pointer",
                    fontWeight: "600",
                    color: formType === "BANK" ? "#2563eb" : "#374151",
                  }}>
                  🏦 Bank
                </button>
              </div>
            </div>

            {/* Amount */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Amount (₹) *</label>
              <input
                type="number"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="Enter amount"
                style={inputStyle}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Description *</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What was this expense for?"
                rows={3}
                style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }}
              />
            </div>

            {/* Category */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Category</label>
              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} style={inputStyle}>
                <option value="">Select category (optional)</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>Date</label>
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} style={inputStyle} />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleSubmit}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                }}>
                Add Expense
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "#e5e7eb",
                  color: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const summaryCardStyle: React.CSSProperties = {
  background: "white",
  padding: "24px",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

const thStyle: React.CSSProperties = {
  padding: "14px 16px",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: "600",
  color: "#374151",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const tdStyle: React.CSSProperties = {
  padding: "16px",
  fontSize: "14px",
  color: "#6b7280",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "8px",
  fontWeight: "500",
  color: "#374151",
  fontSize: "14px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  border: "1px solid #ddd",
  borderRadius: "8px",
  fontSize: "14px",
  boxSizing: "border-box",
};

