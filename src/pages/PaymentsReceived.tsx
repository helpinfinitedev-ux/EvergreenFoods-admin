import { useEffect, useState } from "react";
import { adminAPI, bankAPI } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  address?: string | null;
  balance: number;
  updatedAt?: string;
}

interface Bank {
  id: string;
  name: string;
  label: string;
  balance: number;
}

export default function PaymentsReceived() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [filterDates, setFilterDates] = useState({ startDate: "", endDate: "" });
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [method, setMethod] = useState<"CASH" | "BANK">("CASH");
  const [amount, setAmount] = useState("");
  const [bankId, setBankId] = useState("");

  useEffect(() => {
    loadCustomers();
    loadBanks();
  }, []);

  useEffect(() => {
    if (method === "BANK" && !bankId) {
      setBankId(banks[0]?.id || "");
    }
    if (method === "CASH" && bankId) {
      setBankId("");
    }
  }, [method, banks, bankId]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getDueCustomers({
        startDate: filterDates.startDate || undefined,
        endDate: filterDates.endDate || undefined,
      });
      setCustomers(res.data || []);
    } catch (err) {
      console.error("Failed to load customers", err);
    } finally {
      setLoading(false);
    }
  };

  const loadBanks = async () => {
    try {
      const res = await bankAPI.getAll();
      setBanks(res.data || []);
    } catch (err) {
      console.error("Failed to load banks", err);
    }
  };

  const openModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setMethod("CASH");
    setAmount("");
    setBankId(banks[0]?.id || "");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCustomer(null);
  };

  const submitPayment = async () => {
    if (!selectedCustomer) return;
    const amt = Number(amount);
    if (!amount || Number.isNaN(amt) || amt <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    if (method === "BANK" && !bankId) {
      alert("Please select a bank");
      return;
    }

    try {
      await adminAPI.receiveCustomerPayment(selectedCustomer.id, {
        amount: amt,
        method,
        bankId: method === "BANK" ? bankId : undefined,
      });
      closeModal();
      loadCustomers();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to receive payment");
    }
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Loading...</div>;

  const handleFilter = () => {
    loadCustomers();
  };

  const clearFilter = () => {
    setFilterDates({ startDate: "", endDate: "" });
    setTimeout(() => loadCustomers(), 0);
  };

  const formatDatePdf = (dateString?: string) => {
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
    if (downloadingPdf || customers.length === 0) return;
    setDownloadingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Evergreen Foods", pageWidth / 2, 18, { align: "center" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Payments Received (Pending Due)", pageWidth / 2, 26, { align: "center" });

      const periodText =
        filterDates.startDate || filterDates.endDate
          ? "Period: " + (filterDates.startDate || "Start") + " to " + (filterDates.endDate || "Present")
          : "Report Generated: " + new Date().toLocaleDateString("en-IN");

      doc.setFontSize(10);
      doc.text(periodText, 14, 36);

      const headers = ["Customer", "Mobile", "Due Amount", "Last Updated"];
      const rows = customers.map((c) => [
        c.name,
        c.mobile,
        formatMoneyPdf(c.balance),
        formatDatePdf(c.updatedAt),
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
          0: { cellWidth: 40 },
          1: { cellWidth: 28 },
          2: { cellWidth: 22 },
          3: { cellWidth: 24 },
        },
        tableWidth: "auto",
        margin: { left: 14, right: 14 },
      });

      const fileName = "payments_received_" + new Date().toISOString().split("T")[0] + ".pdf";
      doc.save(fileName);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Failed to generate PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700" }}>Payments Received</h1>
        <button
          onClick={downloadPdf}
          disabled={downloadingPdf || customers.length === 0}
          style={{
            padding: "12px 16px",
            background: downloadingPdf || customers.length === 0 ? "#e5e7eb" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
            color: downloadingPdf || customers.length === 0 ? "#9ca3af" : "white",
            border: "none",
            borderRadius: "10px",
            cursor: downloadingPdf || customers.length === 0 ? "not-allowed" : "pointer",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: downloadingPdf || customers.length === 0 ? "none" : "0 2px 10px rgba(139, 92, 246, 0.3)",
          }}>
          <span style={{ fontSize: "16px" }}>📄</span>
          {downloadingPdf ? "Preparing..." : "Download PDF"}
        </button>
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
            <input
              type="date"
              value={filterDates.startDate}
              onChange={(e) => setFilterDates({ ...filterDates, startDate: e.target.value })}
              style={filterInputStyle}
            />
          </div>
          <div style={{ flex: "1", minWidth: "160px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "700", fontSize: "13px", color: "#374151" }}>End Date</label>
            <input
              type="date"
              value={filterDates.endDate}
              onChange={(e) => setFilterDates({ ...filterDates, endDate: e.target.value })}
              style={filterInputStyle}
            />
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
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Mobile</th>
              <th style={thStyle}>Due Amount</th>
              <th style={thStyle}>Last Updated</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                  No pending balances
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={tdStyle}>{customer.name}</td>
                  <td style={tdStyle}>{customer.mobile}</td>
                  <td style={{ ...tdStyle, fontWeight: "700", color: "#dc2626" }}>₹{Number(customer.balance).toLocaleString()}</td>
                  <td style={tdStyle}>{customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString("en-IN") : "-"}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => openModal(customer)}
                      style={{
                        padding: "6px 12px",
                        background: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}>
                      Receive Money
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && selectedCustomer && (
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
            <h2 style={{ marginBottom: "8px", fontSize: "20px", fontWeight: "700" }}>Receive Payment</h2>
            <div style={{ marginBottom: "20px", color: "#6b7280", fontSize: "13px" }}>
              {selectedCustomer.name} • Due ₹{Number(selectedCustomer.balance).toLocaleString()}
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Method *</label>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => setMethod("CASH")}
                  style={{
                    flex: 1,
                    padding: "14px",
                    border: method === "CASH" ? "2px solid #f59e0b" : "1px solid #ddd",
                    borderRadius: "8px",
                    background: method === "CASH" ? "#fef3c7" : "white",
                    cursor: "pointer",
                    fontWeight: "600",
                    color: method === "CASH" ? "#92400e" : "#374151",
                  }}>
                  💵 Cash
                </button>
                <button
                  onClick={() => setMethod("BANK")}
                  style={{
                    flex: 1,
                    padding: "14px",
                    border: method === "BANK" ? "2px solid #3b82f6" : "1px solid #ddd",
                    borderRadius: "8px",
                    background: method === "BANK" ? "#eff6ff" : "white",
                    cursor: "pointer",
                    fontWeight: "600",
                    color: method === "BANK" ? "#2563eb" : "#374151",
                  }}>
                  🏦 Bank
                </button>
              </div>
            </div>

            {method === "BANK" && (
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Bank *</label>
                <select value={bankId} onChange={(e) => setBankId(e.target.value)} style={inputStyle}>
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
              </div>
            )}

            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>Amount (₹) *</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" style={inputStyle} />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={submitPayment}
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
                Receive
              </button>
              <button
                onClick={closeModal}
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
