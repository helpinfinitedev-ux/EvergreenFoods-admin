import { useEffect, useMemo, useState } from "react";
import { companyAPI } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { updateRunningBalance, updateRunningBalanceBasedOnPreviousTransaction } from "../utils/updateRunningBalance";
import { EVERGREEN_PHONE, EVERGREEN_NAME } from "../constants";

interface Company {
  id: string;
  name: string;
  mobile?: string | null;
  address?: string | null;
  amountDue: number;
  createdAt: string;
}

interface CompanyForm {
  name: string;
  mobile: string;
  address: string;
  amountDue: string;
}

interface CompanyTransaction {
  id: string;
  type: string;
  totalAmount?: number | string | null;
  paymentCash?: number | string | null;
  paymentUpi?: number | string | null;
  amount?: number | string | null;
  rate?: number | string | null;
  details?: string | null;
  date: string;
  createdAt?: string;
}

const initialForm: CompanyForm = {
  name: "",
  mobile: "",
  address: "",
  amountDue: "",
};

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyForm>(initialForm);
  const [editForm, setEditForm] = useState<CompanyForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // History modal state
  const [historyCompany, setHistoryCompany] = useState<Company | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyTransactions, setHistoryTransactions] = useState<CompanyTransaction[]>([]);
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");

  useEffect(() => {
    loadCompanies(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (showHistoryModal && historyCompany?.id) {
      loadCompanyHistory(historyCompany.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistoryModal, historyCompany?.id]);

  const loadCompanies = async (pageToLoad: number) => {
    setLoading(true);
    try {
      const response = await companyAPI.getAll({ page: pageToLoad });
      const data = response.data;
      setCompanies(data.companies || []);
      setPage(data.page || pageToLoad);
      setPageSize(data.pageSize || 10);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Failed to load companies", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyHistory = async (companyId: string) => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const response = await companyAPI.getHistory(companyId);
      setHistoryTransactions(response.data || []);
    } catch (err) {
      console.error("Failed to load company history", err);
      setHistoryError("Failed to load company transactions");
      setHistoryTransactions([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  console.log(historyTransactions);

  const openHistoryModal = (company: Company) => {
    setHistoryCompany(company);
    setHistoryTransactions([]);
    setHistoryError("");
    setHistoryStartDate("");
    setHistoryEndDate("");
    setShowHistoryModal(true);
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setHistoryCompany(null);
    setHistoryTransactions([]);
    setHistoryError("");
    setHistoryStartDate("");
    setHistoryEndDate("");
  };
  let openingBalance = 0;
  // Process history rows for display
  const historyRowsAll = useMemo(() => {
    if (!historyCompany) return [];

    let runningBalance = Number(historyCompany.amountDue || 0);
    let prevousDeposit = 0;

    return historyTransactions.map((t, i) => {
      let bill = Number(t.totalAmount || 0);
      let paid = Number(t.paymentCash || 0) + Number(t.paymentUpi || 0);
      const rate = Number(t.rate || 0);

      let deposit = 0;
      let amount = 0;

      let change = 0;

      if (t.type === "BUY") {
        amount = Number(t.totalAmount || 0);
        runningBalance = updateRunningBalance(runningBalance, i, historyTransactions);
      }
      if (t.type === "SELL") {
        amount = Number(t.totalAmount || 0);
        deposit = Number(t.paymentCash || 0) + Number(t.paymentUpi || 0);
        runningBalance = updateRunningBalance(runningBalance, i, historyTransactions);
      } else if (t.type === "PAYMENT") {
        deposit = Number(t.totalAmount || 0);
        runningBalance = updateRunningBalance(runningBalance, i, historyTransactions);
      } else if (t.type === "RECEIVE_PAYMENT") {
        amount = 0;
        deposit = Number(t.totalAmount || 0);
        runningBalance = updateRunningBalance(runningBalance, i, historyTransactions);
      }

      const balanceAfter = runningBalance;

      const typeLabel = t.type === "BUY" ? "BUY" : t.type === "DEBIT_NOTE" ? "DEBIT" : t.type === "CREDIT_NOTE" ? "CREDIT" : t.type === "PAYMENT" ? "PAYMENT" : String(t.type || "-");

      let qtyKg: number | null = null;

      qtyKg = Number(t.amount || 0);
      if (t.type === "DEBIT_NOTE" || t.type === "CREDIT_NOTE") {
        const qty = Number(t.amount || 0);
        if (qty > 0) qtyKg = qty;
      }

      openingBalance = updateRunningBalanceBasedOnPreviousTransaction(runningBalance, i + 1, historyTransactions);

      return {
        ...t,
        id: t.id,
        date: t.date,
        createdAt: t.createdAt,
        type: typeLabel,
        bill: amount,
        paid: deposit,
        change,
        qtyKg,
        rate,
        balanceAfter,
      };
    });
  }, [historyCompany, historyTransactions]);

  openingBalance = updateRunningBalanceBasedOnPreviousTransaction(historyRowsAll?.[historyRowsAll?.length - 1]?.balanceAfter, historyRowsAll?.length, historyTransactions);

  let historyRows = useMemo(() => {
    if (!historyStartDate && !historyEndDate) return historyRowsAll;

    const start = historyStartDate ? new Date(historyStartDate + "T00:00:00.000") : null;
    const end = historyEndDate ? new Date(historyEndDate + "T23:59:59.999") : null;

    return historyRowsAll.filter((row) => {
      const d = new Date(row.createdAt?.toString() as string);
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [historyRowsAll, historyStartDate, historyEndDate]);

  const generateCompanyHistoryPdf = async () => {
    if (!historyCompany || historyRows.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Load and add logo
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = reject;
        logoImg.src = "/icon.png";
      });
      doc.addImage(logoImg, "PNG", 14, 8, 12, 12);
    } catch (e) {
      console.warn("Could not load logo for PDF");
    }

    // Header - Left side: Evergreen Foods
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(EVERGREEN_NAME, 28, 16);

    // Header - Right side: Evergreen Foods phone
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Ph: " + EVERGREEN_PHONE, pageWidth - 14, 12, { align: "right" });

    // Company info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Company: " + historyCompany.name, 14, 28);

    // Company phone if available
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (historyCompany.mobile) {
      doc.text("Mobile: " + historyCompany.mobile, 14, 34);
    }

    // Simple table headers matching the format
    const headers = ["Date", "Quantity", "Type", "Rate", "Amt", "Deposit", "Due (on me)", "Driver"];
    const rows = historyRows.map((row: any) => {
      return [
        formatDatePdf(row.createdAt || ""),
        row.qtyKg ? Number(row.qtyKg).toFixed(2) : "-",
        row.type,
        row.rate ? Number(row.rate).toFixed(2) : "-",
        Number(row.bill || 0).toFixed(2),
        Number(row.paid || 0).toFixed(2),
        Number(row.balanceAfter || 0).toFixed(2),
        row?.driver?.name || "-",
      ];
    });

    const tableStartY = historyCompany.mobile ? 40 : 34;

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: tableStartY,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: "linebreak",
        valign: "middle",
        halign: "center",
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255],
      },
      // tableLineColor: [0, 0, 0],
      // tableLineWidth: 0.5,
      columnStyles: {
        0: { cellWidth: 22 }, // Date
        1: { cellWidth: 16 }, // Quantity
        2: { cellWidth: 30 }, // Type
        3: { cellWidth: 24 }, // Rate
        4: { cellWidth: 28 }, // Amt
        5: { cellWidth: 25 }, // Deposit
        6: { cellWidth: 25 }, // Balance
        7: { cellWidth: 22 }, // Driver
      },
      tableWidth: "auto",
      margin: { left: 8, right: 8 },
    });

    const fileName = (historyCompany.name || "company").replace(/\s+/g, "_") + "_history_" + new Date().toISOString().split("T")[0] + ".pdf";
    doc.save(fileName);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatMoney = (value: number) => "₹" + Number(value || 0).toLocaleString("en-IN");

  const formatMoneyPdf = (value: number) => {
    const n = Number(value || 0);
    return "Rs." + n.toFixed(2);
  };

  const formatDatePdf = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const downloadPdf = async () => {
    if (downloadingPdf || companies.length === 0) return;
    setDownloadingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Load and add logo
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = reject;
          logoImg.src = "/icon.png";
        });
        doc.addImage(logoImg, "PNG", 14, 8, 12, 12);
      } catch (e) {
        console.warn("Could not load logo for PDF");
      }

      // Header - Left side: Evergreen Foods
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(EVERGREEN_NAME, 28, 16);

      // Header - Right side: Evergreen Foods phone
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Ph: " + EVERGREEN_PHONE, pageWidth - 14, 12, { align: "right" });

      // Subtitle
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("My Companies", 14, 26);

      const headers = ["Company Name", "Mobile", "Amount Due", "Created On"];
      const rows = companies.map((c) => [c.name || "-", c.mobile || "-", formatMoneyPdf(Number(c.amountDue || 0)), formatDatePdf(c.createdAt)]);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 32,
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
          0: { cellWidth: "auto" },
          1: { cellWidth: 28 },
          2: { cellWidth: 28 },
          3: { cellWidth: 28 },
        },
        tableWidth: "auto",
        margin: { left: 14, right: 14 },
      });

      const fileName = "companies_" + new Date().toISOString().split("T")[0] + ".pdf";
      doc.save(fileName);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Failed to generate PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const openAddModal = () => {
    setForm(initialForm);
    setError("");
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setForm(initialForm);
    setError("");
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setEditForm({
      name: company.name || "",
      mobile: company.mobile || "",
      address: company.address || "",
      amountDue: String(company.amountDue ?? 0),
    });
    setError("");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingCompany(null);
    setEditForm(initialForm);
    setError("");
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Company name is required");
      return;
    }
    setSubmitting(true);
    try {
      await companyAPI.create({
        name: form.name.trim(),
        mobile: form.mobile.trim() || undefined,
        address: form.address.trim() || undefined,
        amountDue: form.amountDue ? Number(form.amountDue) : 0,
      });
      closeAddModal();
      loadCompanies(page);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add company");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    if (!editForm.name.trim()) {
      setError("Company name is required");
      return;
    }
    setSubmitting(true);
    try {
      await companyAPI.update(editingCompany.id, {
        name: editForm.name.trim(),
        mobile: editForm.mobile.trim() || null,
        address: editForm.address.trim() || null,
        amountDue: editForm.amountDue ? Number(editForm.amountDue) : 0,
      });
      closeEditModal();
      loadCompanies(page);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update company");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompany = async (company: Company) => {
    const ok = window.confirm(`Delete company "${company.name}"?\n\nThis cannot be undone.`);
    if (!ok) return;
    try {
      await companyAPI.delete(company.id);
      loadCompanies(page);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete company");
    }
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>;

  return (
    <div style={{ padding: "30px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", margin: 0 }}>My Companies</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={downloadPdf}
            disabled={downloadingPdf || companies.length === 0}
            style={{
              padding: "10px 16px",
              background: downloadingPdf || companies.length === 0 ? "#e5e7eb" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
              color: downloadingPdf || companies.length === 0 ? "#9ca3af" : "white",
              border: "none",
              borderRadius: "8px",
              cursor: downloadingPdf || companies.length === 0 ? "not-allowed" : "pointer",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: downloadingPdf || companies.length === 0 ? "none" : "0 2px 8px rgba(139, 92, 246, 0.3)",
            }}>
            <span style={{ fontSize: "16px" }}>📄</span>
            {downloadingPdf ? "Preparing..." : "Download PDF"}
          </button>
          <button
            onClick={openAddModal}
            style={{
              padding: "12px 20px",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
            }}>
            <span style={{ fontSize: "18px" }}>+</span>
            Add Company
          </button>
        </div>
      </div>

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
              <th style={thStyle}>Company Name</th>
              <th style={thStyle}>Amount Due</th>
              <th style={thStyle}>Created On</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr
                key={company.id}
                style={{ borderBottom: "1px solid #e5e7eb", cursor: "pointer", transition: "background 0.15s" }}
                onClick={() => openHistoryModal(company)}
                onMouseOver={(e) => (e.currentTarget.style.background = "#f9fafb")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
                <td style={tdStyle}>{company.name}</td>
                <td style={tdStyle}>{formatMoney(company.amountDue)}</td>
                <td style={tdStyle}>{formatDate(company.createdAt)}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(company);
                      }}
                      style={{
                        padding: "6px 12px",
                        background: "#f59e0b",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}>
                      ✏️ Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
        <span style={{ color: "#6b7280", fontSize: "14px" }}>
          Page {page} of {totalPages} • {pageSize} per page
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              padding: "8px 14px",
              background: page <= 1 ? "#e5e7eb" : "#f3f4f6",
              color: page <= 1 ? "#9ca3af" : "#374151",
              border: "none",
              borderRadius: "6px",
              cursor: page <= 1 ? "not-allowed" : "pointer",
              fontSize: "13px",
              fontWeight: "600",
            }}>
            Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              padding: "8px 14px",
              background: page >= totalPages ? "#e5e7eb" : "#f3f4f6",
              color: page >= totalPages ? "#9ca3af" : "#374151",
              border: "none",
              borderRadius: "6px",
              cursor: page >= totalPages ? "not-allowed" : "pointer",
              fontSize: "13px",
              fontWeight: "600",
            }}>
            Next
          </button>
        </div>
      </div>

      {showAddModal && (
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
          onClick={closeAddModal}>
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "32px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#111827" }}>Add Company</h2>
              <button
                onClick={closeAddModal}
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

            <form onSubmit={handleAddCompany}>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Company Name *</label>
                <input type="text" name="name" value={form.name} onChange={handleInputChange} placeholder="Enter company name" style={inputStyle} />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Mobile</label>
                <input type="tel" name="mobile" value={form.mobile} onChange={handleInputChange} placeholder="Optional" style={inputStyle} />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Address</label>
                <textarea name="address" value={form.address} onChange={handleInputChange} placeholder="Optional" style={{ ...inputStyle, minHeight: "70px" }} />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Amount Due (₹)</label>
                <input type="number" name="amountDue" value={form.amountDue} onChange={handleInputChange} placeholder="0" style={inputStyle} />
              </div>

              {error && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    marginBottom: "20px",
                    fontSize: "14px",
                  }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={closeAddModal}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: "500",
                  }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    background: submitting ? "#9ca3af" : "linear-gradient(135deg, #10b981, #059669)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontSize: "15px",
                    fontWeight: "600",
                  }}>
                  {submitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingCompany && (
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
              borderRadius: "12px",
              padding: "32px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#111827" }}>Edit Company</h2>
              <button
                onClick={closeEditModal}
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

            <form onSubmit={handleUpdateCompany}>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Company Name *</label>
                <input type="text" name="name" value={editForm.name} onChange={handleEditInputChange} style={inputStyle} />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Mobile</label>
                <input type="tel" name="mobile" value={editForm.mobile} onChange={handleEditInputChange} style={inputStyle} />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Address</label>
                <textarea name="address" value={editForm.address} onChange={handleEditInputChange} style={{ ...inputStyle, minHeight: "70px" }} />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Amount Due (₹)</label>
                <input type="number" name="amountDue" value={editForm.amountDue} onChange={handleEditInputChange} style={inputStyle} />
              </div>

              {error && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    marginBottom: "20px",
                    fontSize: "14px",
                  }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={closeEditModal}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: "500",
                  }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    background: submitting ? "#9ca3af" : "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontSize: "15px",
                    fontWeight: "600",
                  }}>
                  {submitting ? "Updating..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Company Transaction History Modal */}
      {showHistoryModal && historyCompany && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={closeHistoryModal}>
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "900px",
              maxHeight: "85vh",
              overflow: "hidden",
              boxShadow: "0 25px 80px rgba(0, 0, 0, 0.35)",
            }}
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "2px solid #000",
                background: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px",
              }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#000" }}>Company {historyCompany.name}</h2>
                <div style={{ marginTop: "8px", fontSize: "13px", color: "#333" }}>
                  {historyCompany.mobile && <>Mobile: {historyCompany.mobile} • </>}
                  Current Balance: <span style={{ fontWeight: "700" }}>{Number(historyCompany.amountDue || 0).toFixed(0)}</span> • <></> Opening Balance:{" "}
                  <span style={{ fontWeight: "700" }}>{Number(openingBalance || 0).toFixed(0)}</span>
                </div>
                {/* Date Filters */}
                <div style={{ display: "flex", gap: "10px", marginTop: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <label style={{ fontSize: "12px", color: "#333", fontWeight: "600" }}>From:</label>
                    <input
                      type="date"
                      value={historyStartDate}
                      onChange={(e) => setHistoryStartDate(e.target.value)}
                      style={{
                        padding: "8px 10px",
                        border: "1px solid #000",
                        borderRadius: "4px",
                        fontSize: "13px",
                        color: "#000",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <label style={{ fontSize: "12px", color: "#333", fontWeight: "600" }}>To:</label>
                    <input
                      type="date"
                      value={historyEndDate}
                      onChange={(e) => setHistoryEndDate(e.target.value)}
                      style={{
                        padding: "8px 10px",
                        border: "1px solid #000",
                        borderRadius: "4px",
                        fontSize: "13px",
                        color: "#000",
                      }}
                    />
                  </div>
                  {(historyStartDate || historyEndDate) && (
                    <button
                      onClick={() => {
                        setHistoryStartDate("");
                        setHistoryEndDate("");
                      }}
                      style={{
                        padding: "8px 12px",
                        background: "#fff",
                        color: "#000",
                        border: "1px solid #000",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "700",
                      }}>
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  onClick={generateCompanyHistoryPdf}
                  disabled={historyLoading || historyRows.length === 0}
                  style={{
                    background: historyLoading || historyRows.length === 0 ? "#ccc" : "#000",
                    border: "none",
                    fontSize: "14px",
                    cursor: historyLoading || historyRows.length === 0 ? "not-allowed" : "pointer",
                    color: "#fff",
                    padding: "10px 14px",
                    borderRadius: "4px",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}>
                  <span style={{ fontSize: "16px" }}>📄</span>
                  Download PDF
                </button>
                <button
                  onClick={closeHistoryModal}
                  style={{
                    background: "#fff",
                    border: "1px solid #000",
                    fontSize: "20px",
                    cursor: "pointer",
                    color: "#000",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    lineHeight: 1,
                  }}>
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: "20px 24px", maxHeight: "calc(85vh - 90px)", overflowY: "auto" }}>
              {historyLoading ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#6b7280" }}>Loading transactions...</div>
              ) : historyError ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#dc2626" }}>{historyError}</div>
              ) : historyRows.length === 0 ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#9ca3af" }}>No transactions found (last 30 days)</div>
              ) : (
                <div style={{ border: "2px solid #000", borderRadius: "4px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #000" }}>
                        <th style={simpleThStyle}>Date</th>
                        <th style={simpleThStyle}>Quantity</th>
                        <th style={simpleThStyle}>Type</th>
                        <th style={simpleThStyle}>Rate</th>
                        <th style={simpleThStyle}>Amt</th>
                        <th style={simpleThStyle}>Deposit</th>
                        <th style={simpleThStyle}>Due (on me)</th>
                        <th style={simpleThStyle}>Driver</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.map((row: any) => (
                        <tr key={row.id} style={{ borderBottom: "1px solid #000" }}>
                          <td style={simpleTdStyle}>{formatDatePdf(row.createdAt || "")}</td>
                          <td style={simpleTdStyle}>{row.qtyKg ? Number(row.qtyKg).toFixed(0) : "-"}</td>
                          <td style={simpleTdStyle}>{row.type}</td>
                          <td style={simpleTdStyle}>{row.rate ? Number(row.rate).toFixed(0) : "-"}</td>
                          <td style={simpleTdStyle}>{Number(row.bill).toFixed(0)}</td>
                          <td style={simpleTdStyle}>{Number(row.paid).toFixed(0)}</td>
                          <td style={simpleTdStyle}>{Number(row.balanceAfter).toFixed(0)}</td>
                          <td style={simpleTdStyle}>{row?.driver?.name || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: "14px",
  fontWeight: "600",
  color: "#374151",
};

const tdStyle: React.CSSProperties = {
  padding: "16px",
  fontSize: "14px",
  color: "#6b7280",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  fontSize: "14px",
  fontWeight: "500",
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "15px",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
  boxSizing: "border-box",
};

const simpleThStyle: React.CSSProperties = {
  padding: "12px 16px",
  textAlign: "center",
  fontSize: "14px",
  fontWeight: "600",
  color: "#000",
  background: "#fff",
  borderRight: "1px solid #000",
};

const simpleTdStyle: React.CSSProperties = {
  padding: "10px 16px",
  fontSize: "14px",
  color: "#000",
  textAlign: "center",
  background: "#fff",
  borderRight: "1px solid #000",
};
