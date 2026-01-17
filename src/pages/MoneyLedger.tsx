import { useEffect, useState } from "react";
import { adminAPI, bankAPI } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Bank = { id: string; name: string; label: string; balance: number };

type CashToBankEntry = {
  id: string;
  bankName: string;
  bankId: string;
  amount: number;
  date: string;
  createdAt: string;
  updatedAt: string;
};

type TotalsByBank = { bankName: string; totalAmount: number };

export default function MoneyLedger() {
  const [rows, setRows] = useState<CashToBankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalsByBank, setTotalsByBank] = useState<TotalsByBank[]>([]);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);

  // Date filter (server-side)
  const [filter, setFilter] = useState({ startDate: "", endDate: "" });

  // Add / Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<CashToBankEntry | null>(null);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Bank to Bank transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromBankId, setFromBankId] = useState("");
  const [toBankId, setToBankId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferError, setTransferError] = useState("");
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [totalCash, setTotalCash] = useState(0);

  useEffect(() => {
    loadBanks();
    loadRows(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBanks = async () => {
    try {
      const res = await bankAPI.getAll();
      setBanks(res.data || []);
    } catch (e) {
      console.error("Failed to load banks", e);
    }
  };

  const loadTotalCash = async () => {
    try {
      const res = await adminAPI.getTotalCapital();
      setTotalCash(Number(res.data?.totalCash || 0));
    } catch (e) {
      console.error("Failed to load total cash", e);
    }
  };

  const getBankLabel = (name: string) => banks.find((b) => b.name === name)?.label || "";

  const loadRows = async (nextPage: number) => {
    setLoading(true);
    try {
      const res = await adminAPI.getCashToBank({
        page: nextPage,
        startDate: filter.startDate || undefined,
        endDate: filter.endDate || undefined,
      });
      setRows(res.data?.rows || []);
      setPage(res.data?.page || nextPage);
      setTotalPages(res.data?.totalPages || 1);
      setTotalsByBank(res.data?.totalsByBank || []);
    } catch (e) {
      console.error("Failed to load cash-to-bank entries", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    loadRows(1);
  };

  const clearFilter = () => {
    setFilter({ startDate: "", endDate: "" });
    setTimeout(() => loadRows(1), 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDatePdf = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const downloadPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const first = await adminAPI.getCashToBank({
        page: 1,
        startDate: filter.startDate || undefined,
        endDate: filter.endDate || undefined,
      });

      const tp: number = first.data?.totalPages || 1;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      const headers = ["Bank", "Money Deposited", "Date"];

      for (let p = 1; p <= tp; p++) {
        const res =
          p === 1
            ? first
            : await adminAPI.getCashToBank({
                page: p,
                startDate: filter.startDate || undefined,
                endDate: filter.endDate || undefined,
              });
        const pageRows: CashToBankEntry[] = res.data?.rows || [];

        if (p > 1) doc.addPage();

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Evergreen Foods", pageWidth / 2, 18, { align: "center" });

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Money Ledger (Cash → Bank)", pageWidth / 2, 26, { align: "center" });

        const periodText =
          filter.startDate || filter.endDate ? "Period: " + (filter.startDate || "Start") + " to " + (filter.endDate || "Present") : "Report Generated: " + new Date().toLocaleDateString("en-IN");

        doc.setFontSize(10);
        doc.text(periodText, 14, 36);
        doc.text(`Page ${p} of ${tp}`, pageWidth - 14, 36, { align: "right" });

        const body = pageRows.map((r) => {
          const label = getBankLabel(r.bankName);
          const bankDisplay = label ? `${r.bankName} (${label})` : r.bankName;
          return [bankDisplay, "Rs." + Number(r.amount || 0).toFixed(2), formatDatePdf(r.date)];
        });

        autoTable(doc, {
          head: [headers],
          body,
          startY: 42,
          styles: {
            fontSize: 10,
            cellPadding: 3,
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
            0: { cellWidth: 70 },
            1: { cellWidth: 45 },
            2: { cellWidth: "auto" },
          },
          tableWidth: "auto",
          margin: { left: 14, right: 14 },
        });
      }

      const fileName = "money_ledger_" + new Date().toISOString().split("T")[0] + ".pdf";
      doc.save(fileName);
    } catch (e) {
      console.error("Failed to generate PDF", e);
      alert("Failed to generate PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setSelectedBankId(banks[0]?.id || "");
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setError("");
    loadTotalCash();
    loadBanks();
    setShowModal(true);
  };

  const openEdit = (row: CashToBankEntry) => {
    setMode("edit");
    setEditing(row);
    setSelectedBankId(row.bankId || banks.find((b) => b.name === row.bankName)?.id || "");
    setAmount(String(row.amount ?? ""));
    setDate(new Date(row.date).toISOString().slice(0, 10));
    setError("");
    loadTotalCash();
    loadBanks();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setError("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const selectedBank = banks.find((b) => b.id === selectedBankId);
    if (!selectedBank) {
      setError("Please select a bank");
      return;
    }
    const amt = Number(amount);
    if (!amount || Number.isNaN(amt) || amt <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "create") {
        await adminAPI.createCashToBank({ bankName: selectedBank.name, amount: amt, date, bankId: selectedBank.id });
      } else if (mode === "edit" && editing) {
        await adminAPI.updateCashToBank(editing.id, { bankName: selectedBank.name, amount: amt });
      }
      closeModal();
      loadRows(page);
      await loadBanks();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save entry");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEntry = async (row: CashToBankEntry) => {
    const ok = window.confirm(`Delete entry?\n\n${row.bankName} • Rs.${Number(row.amount).toFixed(2)} • ${formatDate(row.date)}`);
    if (!ok) return;
    try {
      await adminAPI.deleteCashToBank(row.id);
      const nextPage = rows.length === 1 && page > 1 ? page - 1 : page;
      loadRows(nextPage);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete entry");
    }
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>;

  return (
    <div style={{ padding: "30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "700", margin: 0 }}>💳 Money Ledger</h1>
          <div style={{ marginTop: "6px", color: "#6b7280", fontSize: "14px" }}>Cash → Bank deposits</div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={downloadPdf}
            disabled={downloadingPdf || totalPages <= 0}
            style={{
              padding: "12px 16px",
              background: downloadingPdf ? "#e5e7eb" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
              color: downloadingPdf ? "#9ca3af" : "white",
              border: "none",
              borderRadius: "10px",
              cursor: downloadingPdf ? "not-allowed" : "pointer",
              fontWeight: "800",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: downloadingPdf ? "none" : "0 2px 10px rgba(139, 92, 246, 0.3)",
            }}>
            <span style={{ fontSize: "16px" }}>📄</span>
            {downloadingPdf ? "Preparing..." : "Download PDF"}
          </button>

          <button
            onClick={openCreate}
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
            Add Entry
          </button>

          <button
            onClick={() => {
              setFromBankId(banks[0]?.id || "");
              setToBankId(banks[1]?.id || "");
              setTransferAmount("");
              setTransferError("");
              setShowTransferModal(true);
            }}
            style={{
              padding: "12px 18px",
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 10px rgba(59, 130, 246, 0.3)",
            }}>
            🔄 Bank to Bank
          </button>
        </div>
      </div>

      {/* Filters (server-side) */}
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
            <input type="date" value={filter.startDate} onChange={(e) => setFilter({ ...filter, startDate: e.target.value })} style={filterInputStyle} />
          </div>
          <div style={{ flex: "1", minWidth: "160px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "700", fontSize: "13px", color: "#374151" }}>End Date</label>
            <input type="date" value={filter.endDate} onChange={(e) => setFilter({ ...filter, endDate: e.target.value })} style={filterInputStyle} />
          </div>
          <button onClick={handleFilter} style={applyBtnStyle}>
            Apply Filter
          </button>
          <button onClick={clearFilter} style={clearBtnStyle}>
            Clear
          </button>
        </div>
      </div>

      {/* Bank balances */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "16px" }}>
        {banks.map((b) => {
          return (
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
                    background: "#eef2ff",
                    color: "#3730a3",
                    fontSize: "12px",
                    fontWeight: "800",
                  }}>
                  {b.label}
                </span>
              </div>
              <div style={{ marginTop: "6px", fontSize: "22px", fontWeight: "900", color: "#111827" }}>Rs.{Number(b.balance || 0).toFixed(2)}</div>
            </div>
          );
        })}
      </div>

      <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden", border: "1px solid #e5e7eb" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
              <th style={thStyle}>Bank</th>
              <th style={thStyle}>Money Deposited</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                  No entries yet
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ fontWeight: "800", color: "#111827" }}>{row.bankName}</div>
                      {getBankLabel(row.bankName) && (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "999px",
                            background: "#eef2ff",
                            color: "#3730a3",
                            fontSize: "12px",
                            fontWeight: "800",
                          }}>
                          {getBankLabel(row.bankName)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: "800", color: "#059669" }}>Rs.{Number(row.amount).toFixed(2)}</span>
                  </td>
                  <td style={tdStyle}>{formatDate(row.updatedAt)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "8px" }}>
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
                      {/* <button
                        onClick={() => deleteEntry(row)}
                        style={{
                          padding: "6px 12px",
                          background: "#111827",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "700",
                          fontSize: "13px",
                        }}>
                        🗑️ Delete
                      </button> */}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: "13px", color: "#6b7280", fontWeight: "700" }}>
            Page {page} of {totalPages}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => loadRows(page - 1)}
              disabled={page <= 1}
              style={{
                padding: "8px 12px",
                background: page <= 1 ? "#e5e7eb" : "white",
                color: page <= 1 ? "#9ca3af" : "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                cursor: page <= 1 ? "not-allowed" : "pointer",
                fontWeight: "800",
                fontSize: "13px",
              }}>
              ← Prev
            </button>
            <button
              onClick={() => loadRows(page + 1)}
              disabled={page >= totalPages}
              style={{
                padding: "8px 12px",
                background: page >= totalPages ? "#e5e7eb" : "white",
                color: page >= totalPages ? "#9ca3af" : "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                fontWeight: "800",
                fontSize: "13px",
              }}>
              Next →
            </button>
          </div>
        </div>
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
          onClick={closeModal}>
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
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#111827" }}>{mode === "create" ? "Add Entry" : "Edit Entry"}</h2>
                {mode === "edit" && editing && <div style={{ marginTop: "6px", fontSize: "13px", color: "#6b7280" }}>Date: {formatDate(editing.date)}</div>}
              </div>
              <button
                onClick={closeModal}
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

            <form onSubmit={submit}>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Bank Name</label>
                <select value={selectedBankId} onChange={(e) => setSelectedBankId(e.target.value)} style={inputStyle as any}>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.label})
                    </option>
                  ))}
                </select>
                {selectedBankId &&
                  (() => {
                    const selectedBank = banks.find((b) => b.id === selectedBankId);
                    return selectedBank ? (
                      <div style={{ marginTop: "8px", fontSize: "13px", color: "#059669", fontWeight: "600" }}>Bank Balance: ₹{Number(selectedBank.balance || 0).toLocaleString()}</div>
                    ) : null;
                  })()}
              </div>

              {mode === "create" && (
                <div style={{ marginBottom: "16px", padding: "12px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                  <div style={{ fontSize: "13px", color: "#166534", fontWeight: "600" }}>💵 Available Cash: ₹{totalCash.toLocaleString()}</div>
                </div>
              )}

              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Amount (Rs.)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" style={inputStyle} />
              </div>

              <div style={{ marginBottom: "18px" }}>
                <label style={labelStyle}>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={mode === "edit"} style={inputStyle} />
                {mode === "edit" && <div style={{ marginTop: "6px", fontSize: "12px", color: "#9ca3af" }}>Date is not editable</div>}
              </div>

              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 12px", borderRadius: "10px", marginBottom: "14px", fontSize: "14px" }}>{error}</div>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={closeModal}
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
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: submitting ? "#9ca3af" : mode === "create" ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontWeight: "800",
                  }}>
                  {submitting ? "Saving..." : mode === "create" ? "Add" : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bank to Bank Transfer Modal */}
      {showTransferModal && (
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
          onClick={() => setShowTransferModal(false)}>
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
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#111827" }}>🔄 Bank to Bank Transfer</h2>
              <button
                onClick={() => setShowTransferModal(false)}
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

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setTransferError("");

                if (!fromBankId || !toBankId) {
                  setTransferError("Please select both banks");
                  return;
                }
                if (fromBankId === toBankId) {
                  setTransferError("Cannot transfer to the same bank");
                  return;
                }
                const amt = Number(transferAmount);
                if (!transferAmount || Number.isNaN(amt) || amt <= 0) {
                  setTransferError("Please enter a valid amount");
                  return;
                }
                const fromBank = banks.find((b) => b.id === fromBankId);
                if (fromBank && Number(fromBank.balance || 0) < amt) {
                  setTransferError(`Insufficient funds. Available: Rs.${Number(fromBank.balance).toFixed(2)}`);
                  return;
                }

                setTransferSubmitting(true);
                try {
                  await bankAPI.transfer({ fromBankId, toBankId, amount: amt });
                  setShowTransferModal(false);
                  loadBanks();
                  loadRows(page);
                } catch (err: any) {
                  setTransferError(err.response?.data?.error || "Transfer failed");
                } finally {
                  setTransferSubmitting(false);
                }
              }}>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>From Bank</label>
                <select value={fromBankId} onChange={(e) => setFromBankId(e.target.value)} style={inputStyle as any}>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.label}) - Rs.{Number(b.balance || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>To Bank</label>
                <select value={toBankId} onChange={(e) => setToBankId(e.target.value)} style={inputStyle as any}>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.label}) - Rs.{Number(b.balance || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "18px" }}>
                <label style={labelStyle}>Amount (Rs.)</label>
                <input type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="Enter amount" style={inputStyle} />
              </div>

              {transferError && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 12px", borderRadius: "10px", marginBottom: "14px", fontSize: "14px" }}>
                  {transferError}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
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
                  type="submit"
                  disabled={transferSubmitting}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: transferSubmitting ? "#9ca3af" : "linear-gradient(135deg, #3b82f6, #2563eb)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    cursor: transferSubmitting ? "not-allowed" : "pointer",
                    fontWeight: "800",
                  }}>
                  {transferSubmitting ? "Transferring..." : "Transfer"}
                </button>
              </div>
            </form>
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
