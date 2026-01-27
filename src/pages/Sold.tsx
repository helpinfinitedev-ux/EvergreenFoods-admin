import { useEffect, useState } from "react";
import { adminAPI } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Sold() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    loadTransactions(1, false);
  }, []);

  const loadTransactions = async (nextPage: number, append: boolean) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      const params: any = { type: "SELL" };
      if (filter.startDate) params.startDate = filter.startDate;
      if (filter.endDate) params.endDate = filter.endDate;
      params.page = nextPage;

      const response = await adminAPI.getTransactions(params);
      const data = response.data || {};
      const rows = data.rows || [];
      setTransactions((prev) => (append ? [...prev, ...rows] : rows));
      setPage(data.page || nextPage);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleFilter = () => {
    setPage(1);
    loadTransactions(1, false);
  };

  const clearFilter = () => {
    setFilter({ startDate: "", endDate: "" });
    setPage(1);
    setTimeout(() => loadTransactions(1, false), 0);
  };

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    loadTransactions(page + 1, true);
  };

  const handleDelete = async (tx: any) => {
    const ok = window.confirm("Delete this sold transaction? This will also update cash totals.");
    if (!ok) return;
    setDeletingId(tx.id);
    try {
      await adminAPI.deleteTransaction(tx.id);
      setTransactions((prev) => prev.filter((row) => row.id !== tx.id));
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete transaction");
    } finally {
      setDeletingId(null);
    }
  };

  // Calculate totals
  const totalAmount = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const totalValue = transactions.reduce((sum, tx) => sum + Number(tx.totalAmount || 0), 0);

  const formatIndianNumber = (num: number): string => {
    const numStr = Math.round(num).toString();
    if (numStr.length <= 3) return numStr;

    const lastThree = numStr.slice(-3);
    const remaining = numStr.slice(0, -3);
    return remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  };

  const formatMoneyPdf = (value: any) => {
    const n = Number(value || 0);
    const fixed = n.toFixed(2);
    const [intPart, decPart] = fixed.split(".");
    return "Rs." + formatIndianNumber(Number(intPart)) + "." + decPart;
  };

  const formatDatePdf = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const downloadPdf = () => {
    if (transactions.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Evergreen Foods", pageWidth / 2, 18, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Sold (Sales) Transactions", pageWidth / 2, 26, { align: "center" });

    const periodText =
      filter.startDate || filter.endDate ? "Period: " + (filter.startDate || "Start") + " to " + (filter.endDate || "Present") : "Report Generated: " + new Date().toLocaleDateString("en-IN");

    doc.setFontSize(10);
    doc.text(periodText, 14, 36);

    const headers = ["Date", "Driver", "Customer", "Qty", "Unit", "Rate", "Total", "Details"];
    const rows = transactions.map((tx) => [
      formatDatePdf(tx.date),
      tx.driver?.name || "-",
      tx.customer?.name || "-",
      Number(tx.amount || 0).toFixed(2),
      tx.unit || "-",
      tx.rate ? formatMoneyPdf(tx.rate) : "-",
      tx.totalAmount ? formatMoneyPdf(tx.totalAmount) : "-",
      (tx.details ? String(tx.details).replaceAll("₹", "Rs.") : "-") as string,
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 42,
      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
        overflow: "linebreak",
        valign: "top",
      },
      headStyles: {
        fillColor: [16, 185, 129], // green theme for Sold
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { cellWidth: 22 }, // Date
        1: { cellWidth: 22 }, // Driver
        2: { cellWidth: 22 }, // Customer
        3: { cellWidth: 12 }, // Qty
        4: { cellWidth: 12 }, // Unit
        5: { cellWidth: 18 }, // Rate
        6: { cellWidth: 20 }, // Total
        7: { cellWidth: "auto" }, // Details (wrap)
      },
      tableWidth: "auto",
      margin: { left: 14, right: 14 },
    });

    const fileName = "sold_transactions_" + new Date().toISOString().split("T")[0] + ".pdf";
    doc.save(fileName);
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>;

  return (
    <div style={{ padding: "30px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "30px", gap: "15px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", margin: 0 }}>💰 Sold (Sales) Transactions</h1>
        <span
          style={{
            padding: "6px 14px",
            background: "#d1fae5",
            borderRadius: "20px",
            fontSize: "14px",
            fontWeight: "600",
            color: "#065f46",
          }}>
          {transactions.length} records
        </span>
        <button
          onClick={downloadPdf}
          disabled={transactions.length === 0}
          style={{
            marginLeft: "auto",
            padding: "10px 16px",
            background: transactions.length === 0 ? "#e5e7eb" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
            color: transactions.length === 0 ? "#9ca3af" : "white",
            border: "none",
            borderRadius: "10px",
            cursor: transactions.length === 0 ? "not-allowed" : "pointer",
            fontWeight: "700",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: transactions.length === 0 ? "none" : "0 2px 10px rgba(139, 92, 246, 0.3)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            if (transactions.length > 0) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(139, 92, 246, 0.4)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = transactions.length === 0 ? "none" : "0 2px 10px rgba(139, 92, 246, 0.3)";
          }}>
          <span style={{ fontSize: "16px" }}>📄</span>
          Download PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "25px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
            color: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
          }}>
          <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "5px" }}>Total Quantity Sold</div>
          <div style={{ fontSize: "26px", fontWeight: "700" }}>{totalAmount.toFixed(2)}</div>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
            color: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
          }}>
          <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "5px" }}>Total Revenue</div>
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
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "14px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#059669")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#10b981")}>
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
              <th style={thStyle}>Details</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: "50px", textAlign: "center", color: "#9ca3af" }}>
                  <div style={{ fontSize: "48px", marginBottom: "10px" }}>📭</div>
                  No sales transactions found
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
                    <div style={{ fontWeight: "500", color: "#374151" }}>{tx?.companyName || tx?.company?.name || tx?.customer?.name || tx?.driver?.name || "-"}</div>
                    {tx.customer?.phone && <div style={{ fontSize: "12px", color: "#9ca3af" }}>{tx.customer?.phone || tx.company?.phone || tx.driver?.phone || "-"}</div>}
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
                    <span style={{ color: "#6b7280", fontSize: "13px" }}>{tx.details || "-"}</span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleDelete(tx)}
                      disabled={deletingId === tx.id}
                      style={{
                        padding: "6px 10px",
                        background: deletingId === tx.id ? "#e5e7eb" : "#fee2e2",
                        color: deletingId === tx.id ? "#9ca3af" : "#b91c1c",
                        border: "1px solid #fecaca",
                        borderRadius: "6px",
                        cursor: deletingId === tx.id ? "not-allowed" : "pointer",
                        fontWeight: "600",
                        fontSize: "12px",
                      }}>
                      {deletingId === tx.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
        <button
          onClick={handleLoadMore}
          disabled={loadingMore || page >= totalPages}
          style={{
            padding: "10px 18px",
            background: loadingMore || page >= totalPages ? "#e5e7eb" : "#f3f4f6",
            color: loadingMore || page >= totalPages ? "#9ca3af" : "#374151",
            border: "1px solid #d1d5db",
            borderRadius: "10px",
            cursor: loadingMore || page >= totalPages ? "not-allowed" : "pointer",
            fontWeight: "700",
            fontSize: "13px",
          }}>
          {loadingMore ? "Loading..." : page >= totalPages ? "No More Transactions" : "Load More"}
        </button>
      </div>
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
