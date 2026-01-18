import { useEffect, useState } from "react";
import { adminAPI } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface DriverForm {
  name: string;
  mobile: string;
  password: string;
  baseSalary: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  rate?: number;
  totalAmount?: number;
  date: string;
  customer?: { name: string };
  details?: string;
  imageUrl?: string;
  paymentCash?: number;
  paymentUpi?: number;
}

type HistoryTab = "BUY" | "SELL" | "WEIGHT_LOSS";

const initialForm: DriverForm = {
  name: "",
  mobile: "",
  password: "",
  baseSalary: "",
};

export default function Drivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<DriverForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit driver modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editBaseSalary, setEditBaseSalary] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  // History modal state
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTab, setHistoryTab] = useState<HistoryTab>("BUY");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    loadDrivers();
  }, []);

  useEffect(() => {
    if (selectedDriver && showHistoryModal) {
      loadDriverHistory();
    }
  }, [selectedDriver, historyTab, startDate, endDate]);

  const loadDrivers = async () => {
    try {
      const response = await adminAPI.getDrivers();
      setDrivers(response.data);
    } catch (err) {
      console.error("Failed to load drivers", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDriverHistory = async () => {
    if (!selectedDriver) return;
    setHistoryLoading(true);
    try {
      const params: { type?: string; startDate?: string; endDate?: string } = {
        type: historyTab,
      };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString();

      const response = await adminAPI.getDriverHistory(selectedDriver.id, params);
      if (params.type === "SELL") {
        params.type = "ADVANCE_PAYMENT";
        const advancePaymentResponse = await adminAPI.getDriverHistory(selectedDriver.id, params);
        setTransactions([...response.data, ...advancePaymentResponse.data]);
      } else {
        setTransactions(response.data);
      }
    } catch (err) {
      console.error("Failed to load driver history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryModal = (driver: any) => {
    setSelectedDriver(driver);
    setHistoryTab("BUY");
    setStartDate("");
    setEndDate("");
    setTransactions([]);
    setShowHistoryModal(true);
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setSelectedDriver(null);
    setTransactions([]);
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

  // Format number with Indian style commas (no spaces)
  const formatIndianNumber = (num: number): string => {
    const numStr = Math.round(num).toString();
    if (numStr.length <= 3) return numStr;

    let result = "";
    const lastThree = numStr.slice(-3);
    const remaining = numStr.slice(0, -3);

    if (remaining.length > 0) {
      // Add commas every 2 digits for remaining part (Indian format)
      result = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
    } else {
      result = lastThree;
    }
    return result;
  };

  const generatePDF = () => {
    if (!selectedDriver || transactions.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Evergreen Foods", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Driver Transaction Report", pageWidth / 2, 30, { align: "center" });

    // Driver Info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Driver: " + selectedDriver.name, 14, 45);
    doc.setFont("helvetica", "normal");
    doc.text("Mobile: " + selectedDriver.mobile, 14, 52);
    doc.text("Transaction Type: " + (historyTab === "WEIGHT_LOSS" ? "Weight Loss" : historyTab.charAt(0) + historyTab.slice(1).toLowerCase()), 14, 59);

    // Date range
    const dateRangeText = startDate || endDate ? "Period: " + (startDate || "Start") + " to " + (endDate || "Present") : "Report Generated: " + new Date().toLocaleDateString("en-IN");
    doc.text(dateRangeText, 14, 66);

    // Table data
    let headers: string[];
    let rows: string[][];
    let columnStyles: { [key: number]: { cellWidth: number | "auto" | "wrap" } };

    if (historyTab === "WEIGHT_LOSS") {
      headers = ["Date", "Amount (Kg)", "Details"];
      rows = transactions.map((txn) => [formatDate(txn.date), Number(txn.amount).toFixed(2) + " Kg", txn.details?.replaceAll("₹", "Rs.") || "-"]);
      columnStyles = {
        0: { cellWidth: 45 },
        1: { cellWidth: 30 },
        2: { cellWidth: "auto" },
      };
    } else if (historyTab === "SELL") {
      headers = ["Date", "Amount (Kg)", "Rate", "Total", "Customer", "Details"];
      rows = transactions.map((txn) => [
        formatDate(txn.date),
        Number(txn.amount).toFixed(2) + " Kg",
        txn.rate ? "Rs." + Number(txn.rate).toFixed(2) : "-",
        txn.totalAmount ? "Rs." + formatIndianNumber(Number(txn.totalAmount)) : "-",
        txn.customer?.name || "-",
        txn.details?.replaceAll("₹", "Rs.") || "-",
      ]);
      columnStyles = {
        0: { cellWidth: 35 },
        1: { cellWidth: 25 },
        2: { cellWidth: 22 },
        3: { cellWidth: 28 },
        4: { cellWidth: 30 },
        5: { cellWidth: 45 },
      };
    } else {
      headers = ["Date", "Amount (Kg)", "Rate", "Total", "Details"];
      rows = transactions.map(
        (txn) =>
          [
            formatDate(txn.date),
            Number(txn.amount).toFixed(2) + " Kg",
            txn.rate ? "Rs." + Number(txn.rate).toFixed(2) : "-",
            txn.totalAmount ? "Rs." + formatIndianNumber(Number(txn.totalAmount)) : "-",
            txn.details?.replaceAll("₹", "Rs.") || "-",
          ] as string[],
      );
      columnStyles = {
        0: { cellWidth: 40 },
        1: { cellWidth: 28 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: "auto" },
      };
    }

    // Generate table
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 75,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: columnStyles,
      tableWidth: "auto",
      margin: { left: 14, right: 14 },
    });

    // Summary section
    const finalY = (doc as any).lastAutoTable.finalY || 75;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 14, finalY + 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const totalQty = transactions.reduce((sum, t) => sum + Number(t.amount), 0).toFixed(2);
    doc.text("Total Transactions: " + transactions.length, 14, finalY + 25);
    doc.text("Total Quantity: " + totalQty + " Kg", 14, finalY + 32);

    if (historyTab !== "WEIGHT_LOSS") {
      const totalAmount = transactions.reduce((sum, t) => sum + Number(t.totalAmount || 0), 0);
      doc.text("Total Amount: Rs." + formatIndianNumber(totalAmount), 14, finalY + 39);
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated on ${new Date().toLocaleString("en-IN")}`, pageWidth / 2, pageHeight - 10, { align: "center" });

    // Save the PDF
    const fileName = `${selectedDriver.name.replace(/\s+/g, "_")}_${historyTab.toLowerCase()}_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
  };

  const generateDriversPdf = () => {
    if (drivers.length === 0) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Evergreen Foods", pageWidth / 2, 18, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Drivers Report", pageWidth / 2, 26, { align: "center" });

    const headers = ["Name", "Mobile", "Role", "Status", "Salary"];
    const rows = drivers.map((d) => [d.name || "-", d.mobile || "-", d.role || "-", d.status || "-", "Rs." + Number(d.baseSalary || 0).toFixed(2)]);

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
        0: { cellWidth: 30 },
        1: { cellWidth: 28 },
        2: { cellWidth: 18 },
        3: { cellWidth: 20 },
        4: { cellWidth: 22 },
      },
      tableWidth: "auto",
      margin: { left: 14, right: 14 },
    });

    const fileName = "drivers_" + new Date().toISOString().split("T")[0] + ".pdf";
    doc.save(fileName);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    try {
      await adminAPI.updateDriverStatus(id, newStatus);
      loadDrivers();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.mobile.trim() || !form.password.trim()) {
      setError("Name, mobile and password are required");
      return;
    }

    if (form.mobile.length !== 10 || !/^\d+$/.test(form.mobile)) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    if (form.password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setSubmitting(true);
    try {
      await adminAPI.createDriver({
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        password: form.password,
        baseSalary: form.baseSalary ? Number(form.baseSalary) : 0,
      });
      setShowModal(false);
      setForm(initialForm);
      loadDrivers();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create driver");
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(initialForm);
    setError("");
  };

  const openEditDriverModal = (driver: any) => {
    setEditingDriver(driver);
    setEditPassword("");
    setEditBaseSalary(driver?.baseSalary?.toString?.() || String(driver?.baseSalary || 0));
    setEditError("");
    setShowEditModal(true);
  };

  const closeEditDriverModal = () => {
    setShowEditModal(false);
    setEditingDriver(null);
    setEditPassword("");
    setEditBaseSalary("");
    setEditError("");
  };

  const handleUpdateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;

    const payload: { password?: string; baseSalary?: number } = {};

    const salaryStr = editBaseSalary.trim();
    if (salaryStr !== "") {
      const salaryNum = Number(salaryStr);
      if (Number.isNaN(salaryNum) || salaryNum < 0) {
        setEditError("Please enter a valid salary");
        return;
      }
      payload.baseSalary = salaryNum;
    }

    const pwd = editPassword.trim();
    if (pwd !== "") {
      if (pwd.length < 4) {
        setEditError("Password must be at least 4 characters");
        return;
      }
      payload.password = pwd;
    }

    if (Object.keys(payload).length === 0) {
      setEditError("Nothing to update");
      return;
    }

    setEditSubmitting(true);
    try {
      await adminAPI.updateDriver(editingDriver.id, payload);
      closeEditDriverModal();
      loadDrivers();
    } catch (err: any) {
      setEditError(err.response?.data?.error || "Failed to update driver");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteDriver = async (driver: any) => {
    const ok = window.confirm(`Delete driver "${driver.name}"?\n\nThis cannot be undone.`);
    if (!ok) return;
    try {
      await adminAPI.deleteDriver(driver.id);
      loadDrivers();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete driver");
    }
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>;

  return (
    <div style={{ padding: "30px", overflow: "auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", margin: 0 }}>Driver Management</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={generateDriversPdf}
            disabled={drivers.length === 0}
            style={{
              padding: "10px 16px",
              background: drivers.length === 0 ? "#e5e7eb" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
              color: drivers.length === 0 ? "#9ca3af" : "white",
              border: "none",
              borderRadius: "8px",
              cursor: drivers.length === 0 ? "not-allowed" : "pointer",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: drivers.length === 0 ? "none" : "0 2px 8px rgba(139, 92, 246, 0.3)",
            }}>
            <span style={{ fontSize: "16px" }}>📄</span>
            Download PDF
          </button>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: "12px 24px",
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
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.4)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(16, 185, 129, 0.3)";
            }}>
            <span style={{ fontSize: "18px" }}>+</span>
            Add Driver
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search by name or mobile..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "15px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            outline: "none",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        />
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
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Mobile</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Salary</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers
              .filter((driver) => {
                const query = searchQuery.toLowerCase();
                return driver.name.toLowerCase().includes(query) || driver.mobile.includes(query);
              })
              .map((driver) => (
                <tr
                  key={driver.id}
                  style={{
                    borderBottom: "1px solid #e5e7eb",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onClick={() => openHistoryModal(driver)}
                  onMouseOver={(e) => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={tdStyle}>{driver.name}</td>
                  <td style={tdStyle}>{driver.mobile}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: "4px 12px",
                        background: driver.role === "ADMIN" ? "#fef3c7" : "#dbeafe",
                        color: driver.role === "ADMIN" ? "#92400e" : "#1e40af",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "500",
                      }}>
                      {driver.role}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: "4px 12px",
                        background: driver.status === "ACTIVE" ? "#d1fae5" : "#fee2e2",
                        color: driver.status === "ACTIVE" ? "#065f46" : "#991b1b",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "500",
                      }}>
                      {driver.status}
                    </span>
                  </td>
                  <td style={tdStyle}>₹{driver.baseSalary || 0}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDriverModal(driver);
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStatus(driver.id, driver.status);
                        }}
                        style={{
                          padding: "6px 12px",
                          background: driver.status === "ACTIVE" ? "#ef4444" : "#10b981",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "600",
                        }}>
                        {driver.status === "ACTIVE" ? "Block" : "Activate"}
                      </button>
                      {/* <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDriver(driver);
                        }}
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

      {/* Add Driver Modal */}
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
              borderRadius: "12px",
              padding: "32px",
              width: "100%",
              maxWidth: "440px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            }}
            onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#111827" }}>Add New Driver</h2>
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

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Full Name *</label>
                <input type="text" name="name" value={form.name} onChange={handleInputChange} placeholder="Enter driver's full name" style={inputStyle} />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Mobile Number *</label>
                <input type="tel" name="mobile" value={form.mobile} onChange={handleInputChange} placeholder="10-digit mobile number" maxLength={10} style={inputStyle} />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Password *</label>
                <input type="password" name="password" value={form.password} onChange={handleInputChange} placeholder="Minimum 4 characters" style={inputStyle} />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={labelStyle}>Base Salary (₹)</label>
                <input type="number" name="baseSalary" value={form.baseSalary} onChange={handleInputChange} placeholder="Enter monthly salary" style={inputStyle} />
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
                  onClick={closeModal}
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
                  {submitting ? "Creating..." : "Create Driver"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Driver Modal */}
      {showEditModal && editingDriver && (
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
          onClick={closeEditDriverModal}>
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "32px",
              width: "100%",
              maxWidth: "440px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#111827" }}>Edit Driver</h2>
                <div style={{ marginTop: "4px", fontSize: "13px", color: "#6b7280" }}>
                  {editingDriver.name} • {editingDriver.mobile}
                </div>
              </div>
              <button
                onClick={closeEditDriverModal}
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

            <form onSubmit={handleUpdateDriver}>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>New Password</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => {
                    setEditPassword(e.target.value);
                    setEditError("");
                  }}
                  placeholder="Leave blank to keep unchanged"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={labelStyle}>Base Salary (₹)</label>
                <input
                  type="number"
                  value={editBaseSalary}
                  onChange={(e) => {
                    setEditBaseSalary(e.target.value);
                    setEditError("");
                  }}
                  placeholder="Enter monthly salary"
                  style={inputStyle}
                />
              </div>

              {editError && (
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
                  {editError}
                </div>
              )}

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={closeEditDriverModal}
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
                  disabled={editSubmitting}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    background: editSubmitting ? "#9ca3af" : "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: editSubmitting ? "not-allowed" : "pointer",
                    fontSize: "15px",
                    fontWeight: "600",
                  }}>
                  {editSubmitting ? "Updating..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Driver History Modal */}
      {showHistoryModal && selectedDriver && (
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
              overflow: "auto",
              boxShadow: "0 25px 80px rgba(0, 0, 0, 0.35)",
            }}
            onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div
              style={{
                padding: "24px 28px",
                borderBottom: "1px solid #e5e7eb",
                background: "linear-gradient(135deg, #f8fafc, #f1f5f9)",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#111827" }}>{selectedDriver.name}'s History</h2>
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#6b7280" }}>View transactions and activity</p>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
                    onClick={generatePDF}
                    disabled={transactions.length === 0 || historyLoading}
                    style={{
                      background: transactions.length === 0 || historyLoading ? "#e5e7eb" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                      border: "none",
                      fontSize: "14px",
                      cursor: transactions.length === 0 || historyLoading ? "not-allowed" : "pointer",
                      color: transactions.length === 0 || historyLoading ? "#9ca3af" : "white",
                      padding: "10px 16px",
                      borderRadius: "8px",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.15s",
                      boxShadow: transactions.length === 0 || historyLoading ? "none" : "0 2px 8px rgba(139, 92, 246, 0.3)",
                    }}
                    onMouseOver={(e) => {
                      if (transactions.length > 0 && !historyLoading) {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(139, 92, 246, 0.4)";
                      }
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = transactions.length > 0 && !historyLoading ? "0 2px 8px rgba(139, 92, 246, 0.3)" : "none";
                    }}>
                    <span style={{ fontSize: "16px" }}>📄</span>
                    Download PDF
                  </button>
                  <button
                    onClick={closeHistoryModal}
                    style={{
                      background: "#f3f4f6",
                      border: "none",
                      fontSize: "20px",
                      cursor: "pointer",
                      color: "#6b7280",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      lineHeight: 1,
                      transition: "background 0.15s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#e5e7eb")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "#f3f4f6")}>
                    ✕
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
                {(["BUY", "SELL", "WEIGHT_LOSS"] as HistoryTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setHistoryTab(tab)}
                    style={{
                      padding: "10px 20px",
                      background:
                        historyTab === tab
                          ? tab === "BUY"
                            ? "linear-gradient(135deg, #3b82f6, #2563eb)"
                            : tab === "SELL"
                              ? "linear-gradient(135deg, #10b981, #059669)"
                              : "linear-gradient(135deg, #f59e0b, #d97706)"
                          : "#fff",
                      color: historyTab === tab ? "white" : "#4b5563",
                      border: historyTab === tab ? "none" : "1px solid #d1d5db",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      transition: "all 0.15s",
                      boxShadow: historyTab === tab ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                    }}>
                    {tab === "WEIGHT_LOSS" ? "Weight Loss" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Date Filters */}
              <div style={{ display: "flex", gap: "16px", marginTop: "16px", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label style={{ fontSize: "13px", color: "#6b7280", fontWeight: "500" }}>From:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      color: "#374151",
                    }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label style={{ fontSize: "13px", color: "#6b7280", fontWeight: "500" }}>To:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      color: "#374151",
                    }}
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    style={{
                      padding: "8px 14px",
                      background: "#fee2e2",
                      color: "#dc2626",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "500",
                    }}>
                    Clear
                  </button>
                )}

                {/* Total Cash Display on Top */}
                {historyTab !== "WEIGHT_LOSS" && (
                  <div
                    style={{
                      marginLeft: "auto",
                      padding: "10px 20px",
                      background: historyTab === "BUY" ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "linear-gradient(135deg, #10b981, #059669)",
                      color: "white",
                      borderRadius: "12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      boxShadow: historyTab === "BUY" ? "0 4px 12px rgba(59, 130, 246, 0.2)" : "0 4px 12px rgba(16, 185, 129, 0.2)",
                    }}>
                    <span style={{ fontSize: "11px", opacity: 0.85, fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Cash ({historyTab})</span>
                    {historyTab === "BUY" ? (
                      <span style={{ fontSize: "20px", fontWeight: "800" }}>₹{transactions.reduce((sum, t) => sum + Number(t.totalAmount || 0), 0).toLocaleString("en-IN")}</span>
                    ) : (
                      <span style={{ fontSize: "20px", fontWeight: "800" }}>
                        ₹
                        {(
                          transactions.filter((item) => item.type === "SELL").reduce((sum, t) => sum + Number(t?.paymentCash || 0) + Number(t?.paymentUpi || 0), 0) +
                          transactions.filter((item) => item.type === "ADVANCE_PAYMENT").reduce((sum, t) => sum + Number(t?.totalAmount || 0), 0)
                        ).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                )}
                {historyTab === "WEIGHT_LOSS" && (
                  <div
                    style={{
                      marginLeft: "auto",
                      padding: "10px 20px",
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      color: "white",
                      borderRadius: "12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
                    }}>
                    <span style={{ fontSize: "11px", opacity: 0.85, fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Weight Loss</span>
                    <span style={{ fontSize: "20px", fontWeight: "800" }}>{transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0).toFixed(2)} Kg</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "0", maxHeight: "calc(85vh - 220px)", overflowY: "auto" }}>
              {historyLoading ? (
                <div style={{ padding: "60px", textAlign: "center", color: "#6b7280" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "3px solid #e5e7eb",
                      borderTop: "3px solid #3b82f6",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                      margin: "0 auto 16px",
                    }}
                  />
                  Loading transactions...
                </div>
              ) : transactions.length === 0 ? (
                <div style={{ padding: "60px", textAlign: "center", color: "#9ca3af" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
                  <p style={{ fontSize: "16px", margin: 0 }}>No {historyTab.toLowerCase().replace("_", " ")} transactions found</p>
                  <p style={{ fontSize: "14px", marginTop: "8px" }}>{startDate || endDate ? "Try adjusting the date filter" : "This driver has no records yet"}</p>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={historyThStyle}>Date</th>
                      <th style={historyThStyle}>Amount (Kg)</th>
                      {historyTab !== "WEIGHT_LOSS" && <th style={historyThStyle}>Rate</th>}
                      {historyTab !== "WEIGHT_LOSS" && <th style={historyThStyle}>Total</th>}
                      {historyTab === "SELL" && <th style={historyThStyle}>Customer</th>}
                      <th style={historyThStyle}>Details</th>
                      <th style={historyThStyle}>Image</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn) => (
                      <tr key={txn.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={historyTdStyle}>{formatDate(txn.date)}</td>
                        <td style={historyTdStyle}>
                          <span
                            style={{
                              fontWeight: "600",
                              color: historyTab === "BUY" ? "#2563eb" : historyTab === "SELL" ? "#059669" : "#d97706",
                            }}>
                            {Number(txn.amount).toFixed(2)} Kg
                          </span>
                        </td>
                        {historyTab !== "WEIGHT_LOSS" && <td style={historyTdStyle}>₹{txn.rate ? Number(txn.rate).toFixed(2) : "-"}</td>}
                        {historyTab !== "WEIGHT_LOSS" && (
                          <td style={historyTdStyle}>
                            <span style={{ fontWeight: "600" }}>₹{txn.totalAmount ? Number(txn.totalAmount).toLocaleString("en-IN") : "-"}</span>
                          </td>
                        )}
                        {historyTab === "SELL" && <td style={historyTdStyle}>{txn.customer?.name || "-"}</td>}
                        <td style={{ ...historyTdStyle, color: "#9ca3af", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>{txn.details || "-"}</td>
                        <td style={historyTdStyle}>
                          {txn.imageUrl ? (
                            <a href={txn.imageUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                              <img
                                src={txn.imageUrl}
                                alt="Transaction"
                                style={{
                                  width: "44px",
                                  height: "44px",
                                  borderRadius: "6px",
                                  objectFit: "cover",
                                  border: "1px solid #e5e7eb",
                                }}
                              />
                              <span style={{ color: "#2563eb", textDecoration: "underline", fontSize: "12px", fontWeight: 600 }}>Open</span>
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer - Summary */}
            {transactions.length > 0 && (
              <div
                style={{
                  padding: "16px 28px",
                  borderTop: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                <span style={{ fontSize: "14px", color: "#6b7280" }}>
                  {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
                </span>
                <div style={{ display: "flex", gap: "24px" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "2px" }}>Total Quantity</div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>{transactions.reduce((sum, t) => sum + Number(t.amount), 0).toFixed(2)} Kg</div>
                  </div>
                  {historyTab !== "WEIGHT_LOSS" && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "2px" }}>Total Amount</div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>₹{transactions.reduce((sum, t) => sum + Number(t.totalAmount || 0), 0).toLocaleString("en-IN")}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
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

const historyThStyle: React.CSSProperties = {
  padding: "14px 20px",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: "600",
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const historyTdStyle: React.CSSProperties = {
  padding: "14px 20px",
  fontSize: "14px",
  color: "#374151",
};
