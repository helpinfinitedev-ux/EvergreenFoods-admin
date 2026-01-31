import { useEffect, useMemo, useState } from "react";
import { customerAPI, adminAPI, notificationAPI } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { updateRunningBalanceForBuyForCustomer, updateRunningBalanceForCustomer } from "../utils/updateRunningBalance";
import { EVERGREEN_PHONE, EVERGREEN_NAME } from "../constants";

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
  createdAt?: string;
}

const formatDatePdf = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

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

  // Add customer modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addMobile, setAddMobile] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addBalance, setAddBalance] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState("");

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

  const generateCustomerHistoryPdf = async () => {
    if (!historyCustomer || historyRows.length === 0) return;

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

    // Customer info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Customer: " + historyCustomer.name, 14, 28);

    // Customer phone if available
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (historyCustomer.mobile) {
      doc.text("Mobile: " + historyCustomer.mobile, 14, 34);
    }

    // Simple table headers matching the image format
    const headers = ["Date", "Quantity", "Type", "Rate", "Amt", "Deposit", "Balance"];
    const rows = historyRows.map((row) => {
      return [
        formatDatePdf(row.createdAt || ""),
        row.qtyKg ? Number(row.qtyKg).toFixed(2) : "-",
        row.type,
        row.rate ? Number(row.rate).toFixed(2) : "-",
        Number(row.bill || 0).toFixed(2),
        Number(row.paid || 0).toFixed(2),
        Number(row.balanceAfter || 0).toFixed(2),
      ];
    });

    const tableStartY = historyCustomer.mobile ? 40 : 34;

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
      tableLineColor: [0, 0, 0],
      tableLineWidth: 0.5,
      columnStyles: {
        0: { cellWidth: 22 }, // Date
        1: { cellWidth: 16 }, // Quantity
        2: { cellWidth: 30 }, // Type
        3: { cellWidth: 24 }, // Rate
        4: { cellWidth: 28 }, // Amt
        5: { cellWidth: 28 }, // Deposit
        6: { cellWidth: 32 }, // Balance
      },
      tableWidth: "auto",
      margin: { left: 14, right: 14 },
    });

    const fileName = (historyCustomer.name || "customer").replace(/\s+/g, "_") + "_history_" + new Date().toISOString().split("T")[0] + ".pdf";
    doc.save(fileName);
  };

  const generateCustomersPdf = async () => {
    if (customers.length === 0) return;
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
    doc.text("Customers Report", 14, 26);

    const headers = ["Name", "Mobile", "Address", "Balance"];
    const rows = customers.map((c) => [c.name || "-", c.mobile || "-", c.address || "-", formatMoneyForPdf(Number(c.balance || 0))]);

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

  const historyRowsAll = useMemo(() => {
    if (!historyCustomer) return [];

    // API returns newest first (desc). We'll compute "due balance after this txn" using current balance and walking backwards.
    let runningBalance = Number(historyCustomer.balance || 0);

    return historyTransactions.map((t, i) => {
      let bill = Number(t.totalAmount || 0);
      let paid = Number(t.paymentCash || 0) + Number(t.paymentUpi || 0);
      const rate = Number(t.rate || 0);
      let deposit = 0;
      const amount = 0;

      // How this transaction affects customer.balance in backend:
      // SELL: increment by (bill - paid)
      // DEBIT_NOTE: increment by bill
      // CREDIT_NOTE: increment by (-bill)
      let change = 0;
      if (t.type === "SELL") {
        deposit = Number(t.paymentCash || 0) + Number(t.paymentUpi || 0);
      } else if (t.type === "DEBIT_NOTE") {
        paid = 0;
        change = bill;
      } else if (t.type === "CREDIT_NOTE") {
        paid = bill;
        change = -bill;
      } else if (t.type === "ADVANCE_PAYMENT") {
        paid = 0;
        change = -bill;
      } else if (t.type === "RECEIVE_PAYMENT") {
        deposit = bill;
        paid = bill;
        change = -bill;
        bill = 0;
      } else if (t.type === "PAYMENT") {
        bill = 0;
        deposit = Number(t.totalAmount || 0);
      } else if (t.type === "BUY") {
      }

      runningBalance = updateRunningBalanceForCustomer(runningBalance, i, historyTransactions);

      const balanceAfter = runningBalance;

      const typeLabel = t.type;

      const infoParts: string[] = [];
      let qtyKg: number | null = null;
      const qty = Number(t.amount || 0);
      qtyKg = qty;
      infoParts.push(`${qty.toFixed(2)} Kg @ Rs.${rate ? rate.toFixed(2) : "-"}`);

      if (t.type === "DEBIT_NOTE" || t.type === "CREDIT_NOTE") {
        const qty = Number(t.amount || 0);
        if (qty > 0) qtyKg = qty;
      }
      if (t.details) infoParts.push(t.details.replaceAll("₹", "Rs."));

      return {
        id: t.id,
        createdAt: t.createdAt,
        date: t.date,
        type: typeLabel,
        info: infoParts.join(" • ") || "-",
        bill,
        paid: deposit,
        change,
        qtyKg,
        rate,
        balanceAfter,
      };
    });
  }, [historyCustomer, historyTransactions]);

  const openingBalance = updateRunningBalanceForBuyForCustomer(historyRowsAll?.[historyRowsAll?.length - 1]?.balanceAfter, historyRowsAll?.length, historyTransactions);

  const historyRows = useMemo(() => {
    if (!historyStartDate && !historyEndDate) return historyRowsAll;

    const start = historyStartDate ? new Date(historyStartDate + "T00:00:00.000") : null;
    const end = historyEndDate ? new Date(historyEndDate + "T23:59:59.999") : null;

    return historyRowsAll.filter((row) => {
      const d = new Date(row.createdAt as string);
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
          <button
            onClick={() => {
              setAddName("");
              setAddMobile("");
              setAddAddress("");
              setAddBalance("");
              setAddError("");
              setShowAddModal(true);
            }}
            style={{
              padding: "10px 16px",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
            }}>
            <span style={{ fontSize: "16px" }}>+</span>
            Add Customer
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

      {/* Add Customer Modal */}
      {showAddModal && (
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
              maxHeight: "80vh",
              overflowY: "auto",
              maxWidth: "520px",
            }}>
            <h2 style={{ marginBottom: "20px" }}>Add New Customer</h2>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Name *</label>
              <input type="text" value={addName} onChange={(e) => setAddName(e.target.value)} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Mobile *</label>
              <input type="text" value={addMobile} onChange={(e) => setAddMobile(e.target.value)} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Address</label>
              <textarea
                value={addAddress}
                onChange={(e) => setAddAddress(e.target.value)}
                rows={3}
                style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px", fontFamily: "inherit" }}
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Opening Balance (Rs.)</label>
              <input
                type="number"
                value={addBalance}
                onChange={(e) => setAddBalance(e.target.value)}
                placeholder="0"
                style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }}
              />
            </div>

            {addError && <div style={{ marginBottom: "12px", color: "#dc2626", fontSize: "13px" }}>{addError}</div>}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={async () => {
                  if (!addName.trim() || !addMobile.trim()) {
                    setAddError("Name and mobile are required");
                    return;
                  }
                  if (!/^\d{10}$/.test(addMobile.trim())) {
                    setAddError("Please enter a valid 10-digit mobile number");
                    return;
                  }
                  const bal = Number(addBalance) || 0;
                  setAddSubmitting(true);
                  try {
                    await customerAPI.create({
                      name: addName.trim(),
                      mobile: addMobile.trim(),
                      address: addAddress.trim() || undefined,
                      balance: bal,
                    });
                    setShowAddModal(false);
                    loadCustomers();
                  } catch (err: any) {
                    setAddError(err.response?.data?.error || "Failed to add customer");
                  } finally {
                    setAddSubmitting(false);
                  }
                }}
                disabled={addSubmitting}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: addSubmitting ? "#9ca3af" : "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: addSubmitting ? "not-allowed" : "pointer",
                  fontWeight: "500",
                }}>
                {addSubmitting ? "Adding..." : "Add Customer"}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
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
                borderBottom: "2px solid #000",
                background: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px",
              }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#000" }}>Customer {historyCustomer.name}</h2>
                <div style={{ marginTop: "8px", fontSize: "13px", color: "#333" }}>
                  Mobile: {historyCustomer.mobile} • Current Balance: <span style={{ fontWeight: "700" }}>{Number(historyCustomer.balance || 0).toFixed(0)}</span>• Opening Balance:{" "}
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
                  onClick={generateCustomerHistoryPdf}
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
                        <th style={simpleThStyle}>Due(on customer)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.map((row) => (
                        <tr key={row.id} style={{ borderBottom: "1px solid #000" }}>
                          <td style={simpleTdStyle}>{formatDatePdf(row.createdAt || "")}</td>
                          <td style={simpleTdStyle}>{row.qtyKg ? Number(row.qtyKg).toFixed(2) : "-"}</td>
                          <td style={simpleTdStyle}>{row.type}</td>
                          <td style={simpleTdStyle}>{row.rate ? Number(row.rate).toFixed(2) : "-"}</td>
                          <td style={simpleTdStyle}>{Number(row.bill).toFixed(2)}</td>
                          <td style={simpleTdStyle}>{Number(row.paid).toFixed(2)}</td>
                          <td style={simpleTdStyle}>{Number(row.balanceAfter).toFixed(2)}</td>
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
