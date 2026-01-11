import { useEffect, useState } from "react";
import { adminAPI } from "../api";

export default function Bought() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    startDate: "",
    endDate: "",
  });

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [editRate, setEditRate] = useState("");
  const [editTotalAmount, setEditTotalAmount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const params: any = { type: "BUY" };
      if (filter.startDate) params.startDate = filter.startDate;
      if (filter.endDate) params.endDate = filter.endDate;

      const response = await adminAPI.getTransactions(params);
      setTransactions(response.data);
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setLoading(true);
    loadTransactions();
  };

  const clearFilter = () => {
    setFilter({ startDate: "", endDate: "" });
    setLoading(true);
    setTimeout(() => loadTransactions(), 0);
  };

  // Edit modal handlers
  const openEditModal = (tx: any) => {
    setEditingTransaction(tx);
    setEditRate(tx.rate?.toString() || "");
    setEditTotalAmount(tx.totalAmount?.toString() || "");
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingTransaction(null);
    setEditRate("");
    setEditTotalAmount("");
  };

  const handleRateChange = (newRate: string) => {
    setEditRate(newRate);
    if (editingTransaction && newRate) {
      const calculatedTotal = Number(newRate) * Number(editingTransaction.amount);
      setEditTotalAmount(calculatedTotal.toFixed(2));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;

    setSaving(true);
    try {
      const response = await adminAPI.updateTransaction(editingTransaction.id, {
        rate: editRate ? Number(editRate) : undefined,
        totalAmount: editTotalAmount ? Number(editTotalAmount) : undefined,
      });

      // Update local state
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === editingTransaction.id ? response.data.transaction : tx))
      );

      closeEditModal();
    } catch (err) {
      console.error("Failed to update transaction", err);
      alert("Failed to update transaction");
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const totalAmount = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const totalValue = transactions.reduce((sum, tx) => sum + Number(tx.totalAmount || 0), 0);

  if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>;

  return (
    <div style={{ padding: "30px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "30px", gap: "15px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", margin: 0 }}>🛒 Bought (Purchase) Transactions</h1>
        <span
          style={{
            padding: "6px 14px",
            background: "#dbeafe",
            borderRadius: "20px",
            fontSize: "14px",
            fontWeight: "600",
            color: "#1e40af",
          }}>
          {transactions.length} records
        </span>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "25px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
            color: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
          }}>
          <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "5px" }}>Total Quantity</div>
          <div style={{ fontSize: "26px", fontWeight: "700" }}>{totalAmount.toFixed(2)}</div>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
            color: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
          }}>
          <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "5px" }}>Total Value</div>
          <div style={{ fontSize: "26px", fontWeight: "700" }}>₹{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          marginBottom: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid #e5e7eb",
        }}>
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "end" }}>
          <div style={{ flex: "1", minWidth: "150px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", fontSize: "14px", color: "#374151" }}>Start Date</label>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
            />
          </div>

          <div style={{ flex: "1", minWidth: "150px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", fontSize: "14px", color: "#374151" }}>End Date</label>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
            />
          </div>

          <button
            onClick={handleFilter}
            style={{
              padding: "10px 24px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "14px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#2563eb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#3b82f6")}>
            Apply Filter
          </button>

          <button
            onClick={clearFilter}
            style={{
              padding: "10px 24px",
              background: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "14px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f3f4f6")}>
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Driver</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Quantity</th>
              <th style={thStyle}>Unit</th>
              <th style={thStyle}>Rate</th>
              <th style={thStyle}>Total Amount</th>
              <th style={thStyle}>Image</th>
              <th style={thStyle}>Details</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: "50px", textAlign: "center", color: "#9ca3af" }}>
                  <div style={{ fontSize: "48px", marginBottom: "10px" }}>📭</div>
                  No purchase transactions found
                </td>
              </tr>
            ) : (
              transactions.map((tx, index) => (
                <tr
                  key={tx.id}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: index % 2 === 0 ? "white" : "#fafbfc",
                  }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: "500", color: "#1f2937" }}>
                      {new Date(tx.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                      {new Date(tx.date).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: "500", color: "#374151" }}>{tx.driver?.name || "-"}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: "500", color: "#374151" }}>{tx.customer?.name || "-"}</div>
                    {tx.customer?.phone && <div style={{ fontSize: "12px", color: "#9ca3af" }}>{tx.customer.phone}</div>}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: "600", color: "#1f2937" }}>{Number(tx.amount).toFixed(2)}</span>
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: "3px 8px",
                        background: "#f1f5f9",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "500",
                        color: "#64748b",
                      }}>
                      {tx.unit}
                    </span>
                  </td>
                  <td style={tdStyle}>{tx.rate ? <span style={{ color: "#374151" }}>₹{Number(tx.rate).toFixed(2)}</span> : "-"}</td>
                  <td style={tdStyle}>
                    {tx.totalAmount ? (
                      <span
                        style={{
                          fontWeight: "600",
                          color: "#059669",
                          fontSize: "15px",
                        }}>
                        ₹{Number(tx.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={tdStyle}>
                    {tx.imageUrl ? (
                      <a href={tx.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={tx.imageUrl}
                          alt="Slip"
                          style={{
                            width: "60px",
                            height: "60px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                            cursor: "pointer",
                            transition: "transform 0.2s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        />
                      </a>
                    ) : (
                      <span style={{ color: "#9ca3af", fontSize: "12px" }}>No image</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: "#6b7280", fontSize: "13px" }}>{tx.details || "-"}</span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => openEditModal(tx)}
                      style={{
                        padding: "6px 14px",
                        background: "#f59e0b",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "500",
                        fontSize: "13px",
                        transition: "background 0.2s",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#d97706")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#f59e0b")}>
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editModalOpen && editingTransaction && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={closeEditModal}>
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "30px",
              width: "100%",
              maxWidth: "450px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              animation: "fadeIn 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "25px" }}>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#1f2937" }}>✏️ Edit Transaction</h2>
              <button
                onClick={closeEditModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#9ca3af",
                  padding: "5px",
                  lineHeight: 1,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#374151")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}>
                ×
              </button>
            </div>

            {/* Transaction Info */}
            <div
              style={{
                background: "#f8fafc",
                padding: "15px",
                borderRadius: "10px",
                marginBottom: "20px",
                border: "1px solid #e5e7eb",
              }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "14px" }}>
                <div>
                  <span style={{ color: "#6b7280" }}>Customer:</span>
                  <div style={{ fontWeight: "600", color: "#374151" }}>{editingTransaction.customer?.name || "-"}</div>
                </div>
                <div>
                  <span style={{ color: "#6b7280" }}>Quantity:</span>
                  <div style={{ fontWeight: "600", color: "#374151" }}>
                    {Number(editingTransaction.amount).toFixed(2)} {editingTransaction.unit}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#6b7280" }}>Date:</span>
                  <div style={{ fontWeight: "600", color: "#374151" }}>
                    {new Date(editingTransaction.date).toLocaleDateString("en-IN")}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#6b7280" }}>Driver:</span>
                  <div style={{ fontWeight: "600", color: "#374151" }}>{editingTransaction.driver?.name || "-"}</div>
                </div>
              </div>
            </div>

            {/* Rate Input */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#374151",
                }}>
                Rate (₹ per unit)
              </label>
              <input
                type="number"
                value={editRate}
                onChange={(e) => handleRateChange(e.target.value)}
                placeholder="Enter rate"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "10px",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            {/* Total Amount Input */}
            <div style={{ marginBottom: "25px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#374151",
                }}>
                Total Amount (₹)
              </label>
              <input
                type="number"
                value={editTotalAmount}
                onChange={(e) => setEditTotalAmount(e.target.value)}
                placeholder="Enter total amount"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "10px",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                  background: "#f8fafc",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
              <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#6b7280" }}>
                Auto-calculated: Rate × Quantity = ₹{editRate ? (Number(editRate) * Number(editingTransaction.amount)).toFixed(2) : "0.00"}
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={closeEditModal}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "15px",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#f3f4f6")}>
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  background: saving ? "#9ca3af" : "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: "15px",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => !saving && (e.currentTarget.style.background = "#059669")}
                onMouseLeave={(e) => !saving && (e.currentTarget.style.background = "#10b981")}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "14px 16px",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: "600",
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const tdStyle: React.CSSProperties = {
  padding: "16px",
  fontSize: "14px",
  color: "#6b7280",
};
