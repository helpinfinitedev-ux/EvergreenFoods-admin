import { useEffect, useMemo, useState } from "react";
import { adminAPI } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type BorrowedInfo = {
  id: string;
  borrowedMoney: number;
  borrowedFrom: string | null;
  borrowedOn: string | null;
};

export default function MyUdhaar() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [rows, setRows] = useState<BorrowedInfo[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterDates, setFilterDates] = useState({ startDate: "", endDate: "" });
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [borrowedMoney, setBorrowedMoney] = useState("");
  const [borrowedFrom, setBorrowedFrom] = useState("");
  const [borrowedOn, setBorrowedOn] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadBorrowedInfo();
  }, []);

  const loadBorrowedInfo = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getBorrowedInfo();
      setRows(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load udhaar");
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setBorrowedMoney("");
    setBorrowedFrom("");
    setBorrowedOn("");
    setError("");
    setShowModal(true);
  };

  const openEdit = (row: BorrowedInfo) => {
    setEditingId(row.id);
    setBorrowedMoney(row.borrowedMoney !== null && row.borrowedMoney !== undefined ? String(row.borrowedMoney) : "");
    setBorrowedFrom(row.borrowedFrom || "");
    setBorrowedOn(row.borrowedOn ? new Date(row.borrowedOn).toISOString().slice(0, 10) : "");
    setError("");
    setShowModal(true);
  };

  const submit = async () => {
    setError("");
    const amount = borrowedMoney === "" ? undefined : Number(borrowedMoney);
    if (amount !== undefined && (Number.isNaN(amount) || amount < 0)) {
      setError("Please enter a valid borrowed amount");
      return;
    }

    const payload = {
      borrowedMoney: amount,
      borrowedFrom: borrowedFrom || undefined,
      borrowedOn: borrowedOn || undefined,
    };

    try {
      setSaving(true);
      if (editingId) {
        await adminAPI.updateBorrowedInfo(editingId, payload);
      } else {
        await adminAPI.addBorrowedInfo(payload);
      }
      await loadBorrowedInfo();
      setShowModal(false);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save udhaar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this checkout?")) return;
    try {
      await adminAPI.deleteBorrowedInfo(id);
      loadBorrowedInfo();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete");
    }
  };

  const filteredRows = useMemo(() => {
    if (!filterDates.startDate && !filterDates.endDate) return rows;
    const start = filterDates.startDate ? new Date(filterDates.startDate + "T00:00:00.000") : null;
    const end = filterDates.endDate ? new Date(filterDates.endDate + "T23:59:59.999") : null;
    return rows.filter((row) => {
      if (!row.borrowedOn) return false;
      const d = new Date(row.borrowedOn);
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [rows, filterDates]);

  const handleFilter = () => {
    // filtering is client-side via filteredRows
  };

  const clearFilter = () => {
    setFilterDates({ startDate: "", endDate: "" });
  };

  const formatDatePdf = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatMoneyPdf = (value: any) => {
    const n = Number(value || 0);
    return "Rs." + n.toFixed(2);
  };

  const downloadPdf = () => {
    if (downloadingPdf || filteredRows.length === 0) return;
    setDownloadingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Evergreen Foods", pageWidth / 2, 18, { align: "center" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("My Udhaar", pageWidth / 2, 26, { align: "center" });

      const periodText =
        filterDates.startDate || filterDates.endDate
          ? "Period: " + (filterDates.startDate || "Start") + " to " + (filterDates.endDate || "Present")
          : "Report Generated: " + new Date().toLocaleDateString("en-IN");

      doc.setFontSize(10);
      doc.text(periodText, 14, 36);

      const headers = ["Borrowed Amount", "Borrowed From", "Borrowed On"];
      const rowsPdf = filteredRows.map((row) => [formatMoneyPdf(row.borrowedMoney), row.borrowedFrom || "-", formatDatePdf(row.borrowedOn)]);

      autoTable(doc, {
        head: [headers],
        body: rowsPdf,
        startY: 42,
        styles: {
          fontSize: 8.5,
          cellPadding: 2.5,
          overflow: "linebreak",
          valign: "top",
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: "auto" },
          2: { cellWidth: 24 },
        },
        tableWidth: "auto",
        margin: { left: 14, right: 14 },
      });

      const fileName = "my_udhaar_" + new Date().toISOString().split("T")[0] + ".pdf";
      doc.save(fileName);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Failed to generate PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Loading...</div>;

  return (
    <div style={{ padding: "30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700" }}>My Udhaar</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={downloadPdf}
            disabled={downloadingPdf || filteredRows.length === 0}
            style={{
              padding: "12px 16px",
              background: downloadingPdf || filteredRows.length === 0 ? "#e5e7eb" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
              color: downloadingPdf || filteredRows.length === 0 ? "#9ca3af" : "white",
              border: "none",
              borderRadius: "10px",
              cursor: downloadingPdf || filteredRows.length === 0 ? "not-allowed" : "pointer",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: downloadingPdf || filteredRows.length === 0 ? "none" : "0 2px 10px rgba(139, 92, 246, 0.3)",
            }}>
            <span style={{ fontSize: "16px" }}>📄</span>
            {downloadingPdf ? "Preparing..." : "Download PDF"}
          </button>
          <button
            onClick={openAdd}
            style={{
              padding: "12px 18px",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 10px rgba(16, 185, 129, 0.3)",
            }}>
            <span style={{ fontSize: "18px" }}>+</span>
            Add Udhaar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          background: "white",
          padding: "16px",
          borderRadius: "12px",
          marginBottom: "16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid #e5e7eb",
        }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "end" }}>
          <div style={{ flex: "1", minWidth: "160px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "700", fontSize: "13px", color: "#374151" }}>Start Date</label>
            <input type="date" value={filterDates.startDate} onChange={(e) => setFilterDates({ ...filterDates, startDate: e.target.value })} style={filterInputStyle} />
          </div>
          <div style={{ flex: "1", minWidth: "160px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "700", fontSize: "13px", color: "#374151" }}>End Date</label>
            <input type="date" value={filterDates.endDate} onChange={(e) => setFilterDates({ ...filterDates, endDate: e.target.value })} style={filterInputStyle} />
          </div>
          <button onClick={handleFilter} style={applyBtnStyle}>
            Apply Filter
          </button>
          <button onClick={clearFilter} style={clearBtnStyle}>
            Clear
          </button>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden", border: "1px solid #e5e7eb" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
              <th style={thStyle}>Borrowed Amount</th>
              <th style={thStyle}>Borrowed From</th>
              <th style={thStyle}>Borrowed On</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                  No udhaar yet
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={tdStyle}>₹{Number(row.borrowedMoney || 0).toFixed(2)}</td>
                  <td style={tdStyle}>{row.borrowedFrom || "-"}</td>
                  <td style={tdStyle}>{row.borrowedOn ? new Date(row.borrowedOn).toLocaleDateString("en-IN") : "-"}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => openEdit(row)}
                      style={{
                        padding: "6px 12px",
                        background: "#f59e0b",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "700",
                        fontSize: "13px",
                      }}>
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      style={{
                        padding: "6px 12px",
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "700",
                        fontSize: "13px",
                        marginLeft: "8px",
                      }}>
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
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
          onClick={() => setShowModal(false)}>
          <div
            style={{
              background: "white",
              borderRadius: "14px",
              padding: "28px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#111827" }}>{editingId ? "Update Udhaar" : "Add Udhaar"}</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#9ca3af",
                  padding: "4px",
                  lineHeight: 1,
                }}>
                ×
              </button>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Borrowed Amount (₹)</label>
              <input type="number" value={borrowedMoney} onChange={(e) => setBorrowedMoney(e.target.value)} placeholder="Enter amount" style={inputStyle} />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Borrowed From</label>
              <input type="text" value={borrowedFrom} onChange={(e) => setBorrowedFrom(e.target.value)} placeholder="Name / Source" style={inputStyle} />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label style={labelStyle}>Borrowed On</label>
              <input type="date" value={borrowedOn} onChange={(e) => setBorrowedOn(e.target.value)} style={inputStyle} />
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 12px", borderRadius: "10px", marginBottom: "14px", fontSize: "14px" }}>{error}</div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "700",
                }}>
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: saving ? "#9ca3af" : editingId ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #10b981, #059669)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: "800",
                }}>
                {saving ? "Saving..." : editingId ? "Update" : "Add"}
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
  fontWeight: "700",
  color: "#475569",
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
  fontWeight: "700",
  fontSize: "14px",
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const filterInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const applyBtnStyle: React.CSSProperties = {
  padding: "10px 18px",
  background: "#3b82f6",
  color: "white",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "800",
  fontSize: "14px",
};

const clearBtnStyle: React.CSSProperties = {
  padding: "10px 18px",
  background: "#f3f4f6",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "800",
  fontSize: "14px",
};
