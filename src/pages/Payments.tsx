import { useEffect, useState } from "react";
import { bankAPI, paymentAPI, companyAPI } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Payment {
  id: string;
  amount: number;
  companyName?: string | null;
  description?: string | null;
  date: string;
  bankId?: string | null;
  companyId?: string | null;
  company?: {
    id: string;
    name: string;
    amountDue: number;
  };
}

interface Company {
  id: string;
  name: string;
  amountDue: number;
}

interface Bank {
  id: string;
  name: string;
  label: string;
  balance: number;
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [filterDates, setFilterDates] = useState({ startDate: "", endDate: "" });
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Form state
  const [formMethod, setFormMethod] = useState<"CASH" | "BANK">("CASH");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formBankId, setFormBankId] = useState("");
  const [formCompanyId, setFormCompanyId] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  useEffect(() => {
    loadBanks();
    loadCompanies();
  }, []);

  useEffect(() => {
    loadPayments(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (formMethod === "BANK" && !formBankId) {
      setFormBankId(banks[0]?.id || "");
    }
    if (formMethod === "CASH" && formBankId) {
      setFormBankId("");
    }
  }, [formMethod, banks, formBankId]);

  const loadBanks = async () => {
    try {
      const res = await bankAPI.getAll();
      setBanks(res.data || []);
    } catch (err) {
      console.error("Failed to load banks", err);
    }
  };

  const loadCompanies = async () => {
    try {
      // Fetch all companies (or first page, ideally all for dropdown)
      // Assuming getAll returns { companies: [...] } or just array based on existing CompanyAPI
      const res = await companyAPI.getAll({});
      // If the API supports pagination returning 'companies' array:
      setCompanies(res.data?.companies || []);
    } catch (err) {
      console.error("Failed to load companies", err);
    }
  };

  const loadPayments = async (nextPage: number) => {
    try {
      setLoading(true);
      const res = await paymentAPI.getAll({
        page: nextPage,
        startDate: filterDates.startDate || undefined,
        endDate: filterDates.endDate || undefined,
      });
      setPayments(res.data?.rows || []);
      setPage(res.data?.page || nextPage);
      setTotalPages(res.data?.totalPages || 1);
    } catch (err) {
      console.error("Failed to load payments", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormMethod("CASH");
    setFormAmount("");
    setFormDescription("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormBankId("");
    setFormCompanyId("");
    setCompanySearch("");
  };

  const handleSubmit = async () => {
    if (!formAmount) {
      alert("Please enter amount");
      return;
    }
    const amt = Number(formAmount);
    if (Number.isNaN(amt) || amt <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    if (formMethod === "BANK" && !formBankId) {
      alert("Please select a bank");
      return;
    }

    try {
      await paymentAPI.create({
        amount: amt,
        companyName: companySearch || undefined,
        description: formDescription || undefined,
        date: formDate,
        bankId: formMethod === "BANK" ? formBankId : undefined,
        companyId: formCompanyId || undefined,
      });
      setShowModal(false);
      resetForm();
      loadPayments(page);
    } catch (err) {
      alert("Failed to add payment");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment? This will revert the amount to the company's due balance.")) return;
    try {
      await paymentAPI.delete(id);
      loadPayments(page);
    } catch (err) {
      alert("Failed to delete payment");
    }
  };

  const getBankLabel = (bankId?: string | null) => {
    if (!bankId) return "Cash";
    const bank = banks.find((b) => b.id === bankId);
    return bank ? `${bank.name} (${bank.label})` : "Bank";
  };

  const handleFilter = () => {
    loadPayments(1);
  };

  const clearFilter = () => {
    setFilterDates({ startDate: "", endDate: "" });
    setTimeout(() => loadPayments(1), 0);
  };

  const formatDatePdf = (dateString: string) => {
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
    if (downloadingPdf || payments.length === 0) return;
    setDownloadingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Evergreen Foods", pageWidth / 2, 18, { align: "center" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Payments To Companies", pageWidth / 2, 26, { align: "center" });

      const periodText =
        filterDates.startDate || filterDates.endDate
          ? "Period: " + (filterDates.startDate || "Start") + " to " + (filterDates.endDate || "Present")
          : "Report Generated: " + new Date().toLocaleDateString("en-IN");

      doc.setFontSize(10);
      doc.text(periodText, 14, 36);

      const headers = ["Date", "Method", "Company", "Description", "Amount"];
      const rows = payments.map((p) => [
        formatDatePdf(p.date),
        getBankLabel(p.bankId),
        p.company ? `${p.company.name} (Due: ${p.company.amountDue})` : p.companyName || "-",
        p.description || "-",
        formatMoneyPdf(p.amount),
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
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 22 },
          2: { cellWidth: 26 },
          3: { cellWidth: "auto" },
          4: { cellWidth: 22 },
        },
        tableWidth: "auto",
        margin: { left: 14, right: 14 },
      });

      const fileName = "payments_to_companies_" + new Date().toISOString().split("T")[0] + ".pdf";
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700" }}>Payments To Companies</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={downloadPdf}
            disabled={downloadingPdf || payments.length === 0}
            style={{
              padding: "12px 16px",
              background: downloadingPdf || payments.length === 0 ? "#e5e7eb" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
              color: downloadingPdf || payments.length === 0 ? "#9ca3af" : "white",
              border: "none",
              borderRadius: "10px",
              cursor: downloadingPdf || payments.length === 0 ? "not-allowed" : "pointer",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: downloadingPdf || payments.length === 0 ? "none" : "0 2px 10px rgba(139, 92, 246, 0.3)",
            }}>
            <span style={{ fontSize: "16px" }}>📄</span>
            {downloadingPdf ? "Preparing..." : "Download PDF"}
          </button>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: "12px 24px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
            }}>
            + Add Payment
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

      <div style={{ background: "white", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Method</th>
              <th style={thStyle}>Company</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                  No payments found
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={tdStyle}>
                    {new Date(payment.date).toLocaleDateString("en-IN", {
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
                        background: payment.bankId ? "#dbeafe" : "#fef3c7",
                        color: payment.bankId ? "#1e40af" : "#92400e",
                      }}>
                      {getBankLabel(payment.bankId)}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {payment.company ? (
                      <div>
                        <div style={{ fontWeight: "600", color: "#111827" }}>{payment.company.name}</div>
                        <div style={{ fontSize: "12px", color: "#ef4444" }}>Due: ₹{Number(payment.company.amountDue).toLocaleString()}</div>
                      </div>
                    ) : (
                      payment.companyName || "-"
                    )}
                  </td>
                  <td style={tdStyle}>{payment.description || "-"}</td>
                  <td style={{ ...tdStyle, fontWeight: "600", color: "#059669" }}>₹{Number(payment.amount).toLocaleString()}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleDelete(payment.id)}
                      style={{
                        padding: "6px 12px",
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}>
                      🗑️ Delete
                    </button>
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
              onClick={() => loadPayments(page - 1)}
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
              onClick={() => loadPayments(page + 1)}
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

      {/* Add Payment Modal */}
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
              maxWidth: "520px",
            }}>
            <h2 style={{ marginBottom: "24px", fontSize: "20px", fontWeight: "700" }}>Add Payment</h2>

            {/* Method */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Payment Method *</label>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => setFormMethod("CASH")}
                  style={{
                    flex: 1,
                    padding: "14px",
                    border: formMethod === "CASH" ? "2px solid #f59e0b" : "1px solid #ddd",
                    borderRadius: "8px",
                    background: formMethod === "CASH" ? "#fef3c7" : "white",
                    cursor: "pointer",
                    fontWeight: "600",
                    color: formMethod === "CASH" ? "#92400e" : "#374151",
                  }}>
                  💵 Cash
                </button>
                <button
                  onClick={() => setFormMethod("BANK")}
                  style={{
                    flex: 1,
                    padding: "14px",
                    border: formMethod === "BANK" ? "2px solid #3b82f6" : "1px solid #ddd",
                    borderRadius: "8px",
                    background: formMethod === "BANK" ? "#eff6ff" : "white",
                    cursor: "pointer",
                    fontWeight: "600",
                    color: formMethod === "BANK" ? "#2563eb" : "#374151",
                  }}>
                  🏦 Bank
                </button>
              </div>
            </div>

            {formMethod === "BANK" && (
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Bank *</label>
                <select value={formBankId} onChange={(e) => setFormBankId(e.target.value)} style={inputStyle}>
                  {banks.length === 0 ? (
                    <option value="">No banks available</option>
                  ) : (
                    banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.name} ({bank.label})
                      </option>
                    ))
                  )}
                </select>
                {formBankId &&
                  (() => {
                    const selectedBank = banks.find((b) => b.id === formBankId);
                    return selectedBank ? (
                      <div style={{ marginTop: "8px", fontSize: "13px", color: "#059669", fontWeight: "600" }}>Available Balance: ₹{Number(selectedBank.balance || 0).toLocaleString()}</div>
                    ) : null;
                  })()}
              </div>
            )}

            {/* Amount */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Amount (₹) *</label>
              <input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="Enter amount" style={inputStyle} />
            </div>

            {/* Company Selection */}
            <div style={{ marginBottom: "20px", position: "relative" }}>
              <label style={labelStyle}>Company Name</label>
              <input
                type="text"
                value={companySearch}
                onChange={(e) => {
                  setCompanySearch(e.target.value);
                  setFormCompanyId(""); // Reset ID if user types manual name
                  setShowCompanyDropdown(true);
                }}
                onFocus={() => setShowCompanyDropdown(true)}
                placeholder="Search or enter company name"
                style={inputStyle}
              />
              {showCompanyDropdown && !formCompanyId && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "white",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    maxHeight: "200px",
                    overflowY: "auto",
                    zIndex: 10,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}>
                  {companies
                    .filter((c) => c.name.toLowerCase().includes(companySearch.toLowerCase()))
                    .map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setFormCompanyId(c.id);
                          setCompanySearch(c.name);
                          setShowCompanyDropdown(false);
                        }}
                        style={{
                          padding: "10px 12px",
                          cursor: "pointer",
                          borderBottom: "1px solid #f3f4f6",
                          fontSize: "14px",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "white")}>
                        {c.name} <span style={{ fontSize: "12px", color: "#6b7280" }}>(Due: ₹{c.amountDue})</span>
                      </div>
                    ))}
                  {companies.filter((c) => c.name.toLowerCase().includes(companySearch.toLowerCase())).length === 0 && (
                    <div style={{ padding: "10px 12px", color: "#9ca3af", fontSize: "13px" }}>No companies found. Manual name will be used.</div>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Description</label>
              <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} placeholder="Optional" style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }} />
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
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                }}>
                Add Payment
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
