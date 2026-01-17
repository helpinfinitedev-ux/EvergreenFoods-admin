import { useEffect, useMemo, useState } from "react";
import { customerAPI, adminAPI, notificationAPI } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type CustomerTransactionType = "SELL" | "DEBIT_NOTE" | "CREDIT_NOTE";

interface CustomerTransaction {
  id: string;
  type: CustomerTransactionType | string;
  totalAmount?: number | string | null;
  paymentCash?: number | string | null;
  paymentUpi?: number | string | null;
  amount?: number | string | null; // KG
  rate?: number | string | null;
  details?: string | null;
  date: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteType, setNoteType] = useState<"DEBIT_NOTE" | "CREDIT_NOTE">("DEBIT_NOTE");
  const [noteAmount, setNoteAmount] = useState("");
  const [noteKg, setNoteKg] = useState("");
  const [noteReason, setNoteReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit customer modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  // History modal state
  const [historyCustomer, setHistoryCustomer] = useState<any>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyTransactions, setHistoryTransactions] = useState<CustomerTransaction[]>([]);
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");

  const formatMoneyForPdf = (value: number) => {
    const fixed = Number(value || 0).toFixed(2);
    const [intPart, decPart] = fixed.split(".");
    const intWithCommas = intPart.length <= 3 ? intPart : intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + intPart.slice(-3);
    return "Rs." + intWithCommas + "." + decPart;
  };

  const formatDateForPdf = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const generateCustomerHistoryPdf = () => {
    if (!historyCustomer || historyRows.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Evergreen Foods", pageWidth / 2, 18, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Customer Transaction Report", pageWidth / 2, 26, { align: "center" });

    // Customer Info
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Customer: " + historyCustomer.name, 14, 38);
    doc.setFont("helvetica", "normal");
    doc.text("Mobile: " + historyCustomer.mobile, 14, 45);
    doc.text("Current Due: " + formatMoneyForPdf(Number(historyCustomer.balance || 0)), 14, 52);

    const periodText =
      historyStartDate || historyEndDate ? "Period: " + (historyStartDate || "Start") + " to " + (historyEndDate || "Present") : "Report Generated: " + new Date().toLocaleDateString("en-IN");
    doc.text(periodText, 14, 59);

    const headers = ["Date", "Qty (Kg)", "Type", "Bill", "Paid", "Due", "Δ", "Info"];
    const rows = historyRows.map((row) => {
      const delta = Number(row.change || 0);
      const deltaStr = (delta > 0 ? "+" : delta < 0 ? "-" : "") + formatMoneyForPdf(Math.abs(delta));
      return [
        formatDateForPdf(row.date),
        row.qtyKg ? Number(row.qtyKg).toFixed(2) : "-",
        row.type,
        formatMoneyForPdf(Number(row.bill || 0)),
        formatMoneyForPdf(Number(row.paid || 0)),
        formatMoneyForPdf(Number(row.balanceAfter || 0)),
        deltaStr,
        String(row.info || "-"),
      ];
    });

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 66,
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
        0: { cellWidth: 22 }, // Date
        1: { cellWidth: 16 }, // Type
        2: { cellWidth: 18 }, // Bill
        3: { cellWidth: 18 }, // Paid
        4: { cellWidth: 20 }, // Due
        5: { cellWidth: 16 }, // Delta
        6: { cellWidth: "auto" }, // Info (wrap)
      },
      tableWidth: "auto",
      margin: { left: 14, right: 14 },
    });

    const fileName = (historyCustomer.name || "customer").replace(/\s+/g, "_") + "_history_" + new Date().toISOString().split("T")[0] + ".pdf";
    doc.save(fileName);
  };

  const generateCustomersPdf = () => {
    if (customers.length === 0) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Evergreen Foods", pageWidth / 2, 18, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Customers Report", pageWidth / 2, 26, { align: "center" });

    const headers = ["Name", "Mobile", "Address", "Balance"];
    const rows = customers.map((c) => [c.name || "-", c.mobile || "-", c.address || "-", formatMoneyForPdf(Number(c.balance || 0))]);

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
        2: { cellWidth: "auto" },
        3: { cellWidth: 22 },
      },
      tableWidth: "auto",
      margin: { left: 14, right: 14 },
    });

    const fileName = "customers_" + new Date().toISOString().split("T")[0] + ".pdf";
    doc.save(fileName);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (showHistoryModal && historyCustomer?.id) {
      loadCustomerHistory(historyCustomer.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistoryModal, historyCustomer?.id]);

  const loadCustomers = async () => {
    try {
      const response = await customerAPI.getAll();
      setCustomers(response.data);
    } catch (err) {
      console.error("Failed to load customers", err);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const name = String(c.name || "").toLowerCase();
      const mobile = String(c.mobile || "").toLowerCase();
      const address = String(c.address || "").toLowerCase();
      return name.includes(q) || mobile.includes(q) || address.includes(q);
    });
  }, [customers, searchQuery]);

  const loadCustomerHistory = async (customerId: string) => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const response = await customerAPI.getHistory(customerId);
      setHistoryTransactions(response.data || []);
    } catch (err) {
      console.error("Failed to load customer history", err);
      setHistoryError("Failed to load customer transactions");
      setHistoryTransactions([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryModal = (customer: any) => {
    setHistoryCustomer(customer);
    setHistoryTransactions([]);
    setHistoryError("");
    setHistoryStartDate("");
    setHistoryEndDate("");
    setShowHistoryModal(true);
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setHistoryCustomer(null);
    setHistoryTransactions([]);
    setHistoryError("");
    setHistoryStartDate("");
    setHistoryEndDate("");
  };

  const openEditCustomerModal = (customer: any) => {
    setEditingCustomer(customer);
    setEditName(customer?.name || "");
    setEditMobile(customer?.mobile || "");
    setEditAddress(customer?.address || "");
    setEditBalance(String(customer?.balance ?? 0));
    setEditError("");
    setShowEditModal(true);
  };

  const closeEditCustomerModal = () => {
    setShowEditModal(false);
    setEditingCustomer(null);
    setEditName("");
    setEditMobile("");
    setEditAddress("");
    setEditBalance("");
    setEditError("");
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer) return;
    if (!editName.trim() || !editMobile.trim()) {
      setEditError("Name and mobile are required");
      return;
    }
    if (!/^\d{10}$/.test(editMobile.trim())) {
      setEditError("Please enter a valid 10-digit mobile number");
      return;
    }
    const bal = Number(editBalance);
    if (Number.isNaN(bal)) {
      setEditError("Balance must be a number");
      return;
    }
    setEditSubmitting(true);
    try {
      await customerAPI.update(editingCustomer.id, {
        name: editName.trim(),
        mobile: editMobile.trim(),
        address: editAddress.trim() || undefined,
        balance: bal,
      });
      closeEditCustomerModal();
      loadCustomers();
    } catch (err: any) {
      setEditError(err.response?.data?.error || "Failed to update customer");
    } finally {
      setEditSubmitting(false);
    }
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

  const historyRowsAll = useMemo(() => {
    if (!historyCustomer) return [];

    // API returns newest first (desc). We'll compute "due balance after this txn" using current balance and walking backwards.
    let runningBalance = Number(historyCustomer.balance || 0);

    return historyTransactions.map((t) => {
      const bill = Number(t.totalAmount || 0);
      let paid = Number(t.paymentCash || 0) + Number(t.paymentUpi || 0);

      // How this transaction affects customer.balance in backend:
      // SELL: increment by (bill - paid)
      // DEBIT_NOTE: increment by bill
      // CREDIT_NOTE: increment by (-bill)
      let change = 0;
      if (t.type === "SELL") change = bill - paid;
      else if (t.type === "DEBIT_NOTE") {
        paid = 0;
        change = bill;
      } else if (t.type === "CREDIT_NOTE") {
        paid = bill;
        change = -bill;
      }

      const balanceAfter = runningBalance;
      runningBalance = runningBalance - change;

      const typeLabel = t.type === "SELL" ? "Sell" : t.type === "DEBIT_NOTE" ? "Debit Note" : t.type === "CREDIT_NOTE" ? "Credit Note" : String(t.type || "-");

      const infoParts: string[] = [];
      let qtyKg: number | null = null;
      if (t.type === "SELL") {
        const qty = Number(t.amount || 0);
        const rate = Number(t.rate || 0);
        qtyKg = qty;
        infoParts.push(`${qty.toFixed(2)} Kg @ Rs.${rate ? rate.toFixed(2) : "-"}`);
      } else if (t.type === "DEBIT_NOTE" || t.type === "CREDIT_NOTE") {
        const qty = Number(t.amount || 0);
        if (qty > 0) qtyKg = qty;
      }
      if (t.details) infoParts.push(t.details.replaceAll("₹", "Rs."));

      return {
        id: t.id,
        date: t.date,
        type: typeLabel,
        info: infoParts.join(" • ") || "-",
        bill,
        paid,
        change,
        qtyKg,
        balanceAfter,
      };
    });
  }, [historyCustomer, historyTransactions]);

  const historyRows = useMemo(() => {
    if (!historyStartDate && !historyEndDate) return historyRowsAll;

    const start = historyStartDate ? new Date(historyStartDate + "T00:00:00.000") : null;
    const end = historyEndDate ? new Date(historyEndDate + "T23:59:59.999") : null;

    return historyRowsAll.filter((row) => {
      const d = new Date(row.date);
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [historyRowsAll, historyStartDate, historyEndDate]);

  const handleCreateNote = async () => {
    if (!selectedCustomer || !noteAmount || !noteReason) {
      alert("Please fill all fields");
      return;
    }

    try {
      await adminAPI.createFinancialNote({
        customerId: selectedCustomer.id,
        type: noteType,
        amount: parseFloat(noteAmount),
        weight: noteKg ? parseFloat(noteKg) : 0,
        reason: noteReason,
      });

      // Create notification for debit/credit
      const noteTypeLabel = noteType === "DEBIT_NOTE" ? "Debit" : "Credit";
      const notificationMessage = `${noteTypeLabel} of Rs.${parseFloat(noteAmount).toFixed(2)} done on ${selectedCustomer.name}`;
      await notificationAPI.create(notificationMessage);

      alert("Note created successfully");
      setShowNoteModal(false);
      setNoteAmount("");
      setNoteKg("");
      setNoteReason("");
      loadCustomers();
    } catch (err) {
      alert("Failed to create note");
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>My customers</h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer..."
            style={{
              width: "240px",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
            }}
          />
          <button
            onClick={generateCustomersPdf}
            disabled={customers.length === 0}
            style={{
              padding: "10px 16px",
              background: customers.length === 0 ? "#e5e7eb" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
              color: customers.length === 0 ? "#9ca3af" : "white",
              border: "none",
              borderRadius: "8px",
              cursor: customers.length === 0 ? "not-allowed" : "pointer",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: customers.length === 0 ? "none" : "0 2px 8px rgba(139, 92, 246, 0.3)",
            }}>
            <span style={{ fontSize: "16px" }}>📄</span>
            Download PDF
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
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Mobile</th>
              <th style={thStyle}>Address</th>
              <th style={thStyle}>Balance</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer) => (
              <tr
                key={customer.id}
                style={{ borderBottom: "1px solid #e5e7eb", cursor: "pointer", transition: "background 0.15s" }}
                onClick={() => openHistoryModal(customer)}
                onMouseOver={(e) => (e.currentTarget.style.background = "#f9fafb")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
                <td style={tdStyle}>{customer.name}</td>
                <td style={tdStyle}>{customer.mobile}</td>
                <td style={tdStyle}>{customer.address || "-"}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      color: Number(customer.balance) > 0 ? "#dc2626" : "#059669",
                      fontWeight: "600",
                    }}>
                    Rs.{Number(customer.balance).toFixed(2)}
                  </span>
                </td>
                <td style={tdStyle}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditCustomerModal(customer);
                    }}
                    style={{
                      padding: "6px 12px",
                      background: "#f59e0b",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      marginRight: "8px",
                      fontSize: "13px",
                    }}>
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCustomer(customer);
                      setNoteType("DEBIT_NOTE");
                      setShowNoteModal(true);
                    }}
                    style={{
                      padding: "6px 12px",
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      marginRight: "8px",
                      fontSize: "13px",
                    }}>
                    Debit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCustomer(customer);
                      setNoteType("CREDIT_NOTE");
                      setShowNoteModal(true);
                    }}
                    style={{
                      padding: "6px 12px",
                      background: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}>
                    Credit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showEditModal && editingCustomer && (
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
              borderRadius: "8px",
              width: "100%",
              maxWidth: "520px",
            }}>
            <h2 style={{ marginBottom: "20px" }}>Edit Customer</h2>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Mobile</label>
              <input type="text" value={editMobile} onChange={(e) => setEditMobile(e.target.value)} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Address</label>
              <textarea
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                rows={3}
                style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", fontFamily: "inherit" }}
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Balance (Rs.)</label>
              <input type="number" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }} />
            </div>

            {editError && <div style={{ marginBottom: "12px", color: "#dc2626", fontSize: "13px" }}>{editError}</div>}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleUpdateCustomer}
                disabled={editSubmitting}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: editSubmitting ? "#9ca3af" : "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: editSubmitting ? "not-allowed" : "pointer",
                  fontWeight: "500",
                }}>
                {editSubmitting ? "Saving..." : "Save"}
              </button>
              <button
                onClick={closeEditCustomerModal}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#e5e7eb",
                  color: "#374151",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showNoteModal && (
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
              borderRadius: "8px",
              width: "100%",
              maxWidth: "500px",
            }}>
            <h2 style={{ marginBottom: "20px" }}>Create {noteType === "DEBIT_NOTE" ? "Debit" : "Credit"} Note</h2>
            <p style={{ marginBottom: "20px", color: "#666" }}>
              Customer: <strong>{selectedCustomer?.name}</strong>
            </p>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Amount (Rs.)</label>
              <input
                type="number"
                value={noteAmount}
                onChange={(e) => setNoteAmount(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Weight (Kg)</label>
              <input
                type="number"
                value={noteKg}
                onChange={(e) => setNoteKg(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Reason</label>
              <textarea
                value={noteReason}
                onChange={(e) => setNoteReason(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleCreateNote}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}>
                Create Note
              </button>
              <button
                onClick={() => setShowNoteModal(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#e5e7eb",
                  color: "#374151",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Transaction History Modal */}
      {showHistoryModal && historyCustomer && (
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
              maxWidth: "980px",
              maxHeight: "85vh",
              overflow: "hidden",
              boxShadow: "0 25px 80px rgba(0, 0, 0, 0.35)",
            }}
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e5e7eb",
                background: "linear-gradient(135deg, #f8fafc, #f1f5f9)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#111827" }}>{historyCustomer.name}'s Transactions</h2>
                <div style={{ marginTop: "4px", fontSize: "13px", color: "#6b7280" }}>
                  Mobile: {historyCustomer.mobile} • Current Due:{" "}
                  <span style={{ fontWeight: "700", color: Number(historyCustomer.balance || 0) > 0 ? "#dc2626" : "#059669" }}>Rs.{Number(historyCustomer.balance || 0).toFixed(2)}</span>
                </div>
                {/* Date Filters */}
                <div style={{ display: "flex", gap: "10px", marginTop: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <label style={{ fontSize: "12px", color: "#6b7280", fontWeight: "600" }}>From:</label>
                    <input
                      type="date"
                      value={historyStartDate}
                      onChange={(e) => setHistoryStartDate(e.target.value)}
                      style={{
                        padding: "8px 10px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "13px",
                        color: "#374151",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <label style={{ fontSize: "12px", color: "#6b7280", fontWeight: "600" }}>To:</label>
                    <input
                      type="date"
                      value={historyEndDate}
                      onChange={(e) => setHistoryEndDate(e.target.value)}
                      style={{
                        padding: "8px 10px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "13px",
                        color: "#374151",
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
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "none",
                        borderRadius: "6px",
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
                  onClick={generateCustomerHistoryPdf}
                  disabled={historyLoading || historyRows.length === 0}
                  style={{
                    background: historyLoading || historyRows.length === 0 ? "#e5e7eb" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                    border: "none",
                    fontSize: "14px",
                    cursor: historyLoading || historyRows.length === 0 ? "not-allowed" : "pointer",
                    color: historyLoading || historyRows.length === 0 ? "#9ca3af" : "white",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.15s",
                    boxShadow: historyLoading || historyRows.length === 0 ? "none" : "0 2px 8px rgba(139, 92, 246, 0.3)",
                  }}
                  onMouseOver={(e) => {
                    if (!historyLoading && historyRows.length > 0) {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(139, 92, 246, 0.4)";
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = !historyLoading && historyRows.length > 0 ? "0 2px 8px rgba(139, 92, 246, 0.3)" : "none";
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

            {/* Content */}
            <div style={{ paddingBottom: 32, maxHeight: "calc(85vh - 90px)", overflowY: "auto" }}>
              {historyLoading ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#6b7280" }}>Loading transactions...</div>
              ) : historyError ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#dc2626" }}>{historyError}</div>
              ) : historyRows.length === 0 ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#9ca3af" }}>No transactions found (last 30 days)</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ ...historyThStyle, width: "140px" }}>Date</th>
                      <th style={{ ...historyThStyle, width: "110px" }}>Qty (Kg)</th>
                      <th style={{ ...historyThStyle, width: "260px" }}>Info</th>
                      <th style={{ ...historyThStyle, width: "140px" }}>Bill</th>
                      <th style={{ ...historyThStyle, width: "160px" }}>Payment Done</th>
                      <th style={{ ...historyThStyle, width: "150px" }}>Due Balance</th>
                      <th style={{ ...historyThStyle, width: "130px" }}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((row) => (
                      <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={historyTdStyle}>{formatDate(row.date)}</td>
                        <td style={historyTdStyle}>{row.qtyKg ? Number(row.qtyKg).toFixed(2) : "-"}</td>
                        <td
                          style={{
                            ...historyTdStyle,
                            color: "#374151",
                            maxWidth: "260px",
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                          }}>
                          {row.info}
                        </td>
                        <td style={historyTdStyle}>
                          <span style={{ fontWeight: "700", color: "#111827" }}>Rs.{Number(row.bill).toFixed(2)}</span>
                        </td>
                        <td style={historyTdStyle}>
                          <span style={{ fontWeight: "700", color: "#111827" }}>Rs.{Number(row.paid).toFixed(2)}</span>
                        </td>
                        <td style={historyTdStyle}>
                          <span style={{ fontWeight: "700", color: Number(row.balanceAfter) > 0 ? "#dc2626" : "#059669" }}>Rs.{Number(row.balanceAfter).toFixed(2)}</span>
                          <div
                            style={{
                              marginTop: "3px",
                              fontSize: "12px",
                              fontWeight: "700",
                              color: Number(row.change) > 0 ? "#dc2626" : Number(row.change) < 0 ? "#059669" : "#9ca3af",
                            }}>
                            {Number(row.change) > 0 ? "+" : Number(row.change) < 0 ? "-" : ""}Rs.{Math.abs(Number(row.change)).toFixed(2)}
                          </div>
                        </td>
                        <td style={historyTdStyle}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "999px",
                              fontSize: "12px",
                              fontWeight: "600",
                              background: row.type === "Sell" ? "#dbeafe" : row.type === "Debit Note" ? "#fee2e2" : "#d1fae5",
                              color: row.type === "Sell" ? "#1e40af" : row.type === "Debit Note" ? "#991b1b" : "#065f46",
                            }}>
                            {row.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

const historyThStyle: React.CSSProperties = {
  padding: "14px 16px",
  textAlign: "left",
  fontSize: "12px",
  fontWeight: "700",
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const historyTdStyle: React.CSSProperties = {
  padding: "14px 16px",
  fontSize: "14px",
  color: "#374151",
  verticalAlign: "top",
};
