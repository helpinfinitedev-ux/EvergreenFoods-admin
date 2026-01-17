import { useEffect, useState } from "react";
import { companyAPI } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  useEffect(() => {
    loadCompanies(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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
    });

  const downloadPdf = () => {
    if (downloadingPdf || companies.length === 0) return;
    setDownloadingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Evergreen Foods", pageWidth / 2, 18, { align: "center" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("My Companies", pageWidth / 2, 26, { align: "center" });

      const headers = ["Company Name", "Amount Due", "Created On"];
      const rows = companies.map((c) => [c.name || "-", formatMoneyPdf(Number(c.amountDue || 0)), formatDatePdf(c.createdAt)]);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 36,
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
              <tr key={company.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={tdStyle}>{company.name}</td>
                <td style={tdStyle}>{formatMoney(company.amountDue)}</td>
                <td style={tdStyle}>{formatDate(company.createdAt)}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      onClick={() => openEditModal(company)}
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
                    {/* <button
                      onClick={() => handleDeleteCompany(company)}
                      style={{
                        padding: "6px 12px",
                        background: "#111827",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}>
                      🗑️ Delete
                    </button> */}
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
