import { useEffect, useState } from "react";
import { adminAPI, bankAPI, expenseAPI } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Autocomplete, TextField, Box, Typography } from "@mui/material";

interface Expense {
  id: string;
  type: "CASH" | "BANK";
  amount: number;
  description: string;
  category: string | null;
  date: string;
  bankId?: string | null;
  driverId?: string | null;
  driver?: {
    id: string;
    name: string;
  } | null;
}

interface Driver {
  id: string;
  name: string;
  mobile: string;
  status: string;
}

interface ExpenseSummary {
  cashTotal: number;
  bankTotal: number;
  total: number;
  count: number;
}

interface Bank {
  id: string;
  name: string;
  label: string;
  balance: number;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [cashInHand, setCashInHand] = useState(0);
  const [totalBankBalance, setTotalBankBalance] = useState(0);
  const [filterType, setFilterType] = useState<string>("");
  const [filterDates, setFilterDates] = useState({ startDate: "", endDate: "" });
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Form state
  const [formType, setFormType] = useState<"CASH" | "BANK">("CASH");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formBankId, setFormBankId] = useState("");
  const [formDriver, setFormDriver] = useState<Driver | null>(null);

  // Edit form state
  const [editType, setEditType] = useState<"CASH" | "BANK">("CASH");
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState(new Date().toISOString().split("T")[0]);
  const [editBankId, setEditBankId] = useState("");
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [filterDriverId, setFilterDriverId] = useState("");
  const [filteredCateogry, setFilteredCateogry] = useState("");

  useEffect(() => {
    loadData();
    loadDrivers();
  }, []);

  useEffect(() => {
    loadBanks();
  }, []);

  // Reset driver when category changes away from Salary
  useEffect(() => {
    if (formCategory !== "Salary") {
      setFormDriver(null);
    }
  }, [formCategory]);

  useEffect(() => {
    if (editCategory !== "Salary") {
      setEditDriver(null);
    }
  }, [editCategory]);

  useEffect(() => {
    if (showModal) {
      loadTotals();
    }
  }, [showModal]);

  useEffect(() => {
    if (formType === "BANK" && !formBankId) {
      setFormBankId(banks[0]?.id || "");
    }
    if (formType === "CASH" && formBankId) {
      setFormBankId("");
    }
  }, [formType, banks, formBankId]);

  useEffect(() => {
    if (editType === "BANK" && !editBankId) {
      setEditBankId(banks[0]?.id || "");
    }
    if (editType === "CASH" && editBankId) {
      setEditBankId("");
    }
  }, [editType, banks, editBankId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterType) params.type = filterType;
      if (filterDates.startDate) params.startDate = filterDates.startDate;
      if (filterDates.endDate) params.endDate = filterDates.endDate;
      if (filterDriverId) params.driverId = filterDriverId;
      if (filteredCateogry) params.category = filteredCateogry;
      const [expensesRes, summaryRes] = await Promise.all([expenseAPI.getAll(params), expenseAPI.getSummary(params)]);

      setExpenses(expensesRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error("Failed to load expenses", err);
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

  const loadDrivers = async () => {
    try {
      const res = await adminAPI.getDrivers();
      setDrivers(res.data || []);
    } catch (err) {
      console.error("Failed to load drivers", err);
    }
  };

  const loadTotals = async () => {
    try {
      const [capitalRes, bankRes] = await Promise.all([adminAPI.getTotalCapital(), bankAPI.getDetails()]);
      const totalCash = Number(capitalRes.data?.totalCash ?? 0);
      const totalBank = Number(bankRes.data?.totalBankBalance ?? 0);
      setCashInHand(totalCash);
      setTotalBankBalance(totalBank);
    } catch (err) {
      console.error("Failed to load totals", err);
    }
  };

  const handleSubmit = async () => {
    if (!formAmount || !formDescription) {
      alert("Please fill amount and description");
      return;
    }

    if (formType === "BANK" && !formBankId) {
      alert("Please select a bank");
      return;
    }

    try {
      await expenseAPI.create({
        type: formType,
        amount: parseFloat(formAmount),
        description: formDescription,
        category: formCategory || undefined,
        date: formDate,
        bankId: formType === "BANK" ? formBankId : undefined,
        driverId: formDriver ? formDriver.id : undefined,
      });

      alert("Expense added successfully");
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      alert("Failed to add expense");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      await expenseAPI.delete(id);
      loadData();
    } catch (err) {
      alert("Failed to delete expense");
    }
  };

  const resetForm = () => {
    setFormType("CASH");
    setFormAmount("");
    setFormDescription("");
    setFormCategory("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormBankId("");
    setFormDriver(null);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setEditType(expense.type);
    setEditAmount(String(expense.amount ?? ""));
    setEditDescription(expense.description || "");
    setEditCategory(expense.category || "");
    setEditDate(expense.date ? expense.date.split("T")[0] : new Date().toISOString().split("T")[0]);
    setEditBankId(expense.bankId || "");
    // Set driver if exists
    if (expense.driverId && expense.driver) {
      const driver = drivers.find((d) => d.id === expense.driverId);
      setEditDriver(driver || null);
    } else {
      setEditDriver(null);
    }
    loadTotals();
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingExpense(null);
    setEditType("CASH");
    setEditAmount("");
    setEditDescription("");
    setEditCategory("");
    setEditDate(new Date().toISOString().split("T")[0]);
    setEditBankId("");
    setEditDriver(null);
  };

  const handleUpdate = async () => {
    if (!editingExpense) return;
    if (!editAmount || !editDescription) {
      alert("Please fill amount and description");
      return;
    }
    if (editType === "BANK" && !editBankId) {
      alert("Please select a bank");
      return;
    }
    try {
      await expenseAPI.update(editingExpense.id, {
        type: editType,
        amount: parseFloat(editAmount),
        description: editDescription,
        category: editCategory || undefined,
        date: editDate,
        bankId: editType === "BANK" ? editBankId : undefined,
        driverId: editCategory === "Salary" && editDriver ? editDriver.id : undefined,
      });
      closeEditModal();
      loadData();
    } catch (err) {
      alert("Failed to update expense");
    }
  };

  const categories = ["EMI", "Fuel", "Salary", "Labor", "Other"];

  const handleFilter = () => {
    loadData();
  };

  const clearFilter = () => {
    setFilterType("");
    setFilterDates({ startDate: "", endDate: "" });
    setTimeout(() => loadData(), 0);
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
    if (downloadingPdf || expenses.length === 0) return;
    setDownloadingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Evergreen Foods", pageWidth / 2, 18, { align: "center" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Expenses Report", pageWidth / 2, 26, { align: "center" });

      const periodText =
        filterDates.startDate || filterDates.endDate
          ? "Period: " + (filterDates.startDate || "Start") + " to " + (filterDates.endDate || "Present")
          : "Report Generated: " + new Date().toLocaleDateString("en-IN");
      const typeText = filterType ? "Type: " + filterType : "";

      doc.setFontSize(10);
      doc.text(periodText, 14, 36);
      if (typeText) doc.text(typeText, 14, 42);

      const headers = ["Date", "Type", "Category", "Description", "Amount"];
      const rows = expenses.map((exp) => [formatDatePdf(exp.date), exp.type, exp.category || "-", exp.description || "-", formatMoneyPdf(exp.amount)]);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: typeText ? 48 : 42,
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
          1: { cellWidth: 16 },
          2: { cellWidth: 22 },
          3: { cellWidth: "auto" },
          4: { cellWidth: 20 },
        },
        tableWidth: "auto",
        margin: { left: 14, right: 14 },
      });

      const fileName = "expenses_" + new Date().toISOString().split("T")[0] + ".pdf";
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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700" }}>Expenses</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={downloadPdf}
            disabled={downloadingPdf || expenses.length === 0}
            style={{
              padding: "12px 16px",
              background: downloadingPdf || expenses.length === 0 ? "#e5e7eb" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
              color: downloadingPdf || expenses.length === 0 ? "#9ca3af" : "white",
              border: "none",
              borderRadius: "10px",
              cursor: downloadingPdf || expenses.length === 0 ? "not-allowed" : "pointer",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: downloadingPdf || expenses.length === 0 ? "none" : "0 2px 10px rgba(139, 92, 246, 0.3)",
            }}>
            <span style={{ fontSize: "16px" }}>📄</span>
            {downloadingPdf ? "Preparing..." : "Download PDF"}
          </button>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: "12px 24px",
              background: "#667eea",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
            }}>
            + Add Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "30px" }}>
          <div style={summaryCardStyle}>
            <div style={{ color: "#6b7280", fontSize: "14px", marginBottom: "8px" }}>Cash Expenses</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#ef4444" }}>₹{summary.cashTotal.toLocaleString()}</div>
          </div>
          <div style={summaryCardStyle}>
            <div style={{ color: "#6b7280", fontSize: "14px", marginBottom: "8px" }}>Bank Expenses</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#3b82f6" }}>₹{summary.bankTotal.toLocaleString()}</div>
          </div>
          <div style={summaryCardStyle}>
            <div style={{ color: "#6b7280", fontSize: "14px", marginBottom: "8px" }}>Total Expenses</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#111827" }}>₹{summary.total.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Filter */}
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
          <div style={{ minWidth: "150px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "700", fontSize: "13px", color: "#374151" }}>Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={filterInputStyle}>
              <option value="">All Types</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
            </select>
          </div>
          <div style={{ minWidth: "150px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "700", fontSize: "13px", color: "#374151" }}>Category</label>
            <select value={filteredCateogry} onChange={(e) => setFilteredCateogry(e.target.value)} style={filterInputStyle}>
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: "150px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "700", fontSize: "13px", color: "#374151" }}>Driver</label>
            <select value={filterDriverId} onChange={(e) => setFilterDriverId(e.target.value)} style={filterInputStyle}>
              <option value="">All Drivers</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleFilter} style={applyBtnStyle}>
            Apply Filter
          </button>
          <button onClick={clearFilter} style={clearBtnStyle}>
            Clear
          </button>
        </div>
      </div>

      {/* Expenses Table */}
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
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Driver</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                  Loading...
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                  No expenses found
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={tdStyle}>
                    {new Date(expense.date).toLocaleDateString("en-IN", {
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
                        background: expense.type === "CASH" ? "#fef3c7" : "#dbeafe",
                        color: expense.type === "CASH" ? "#92400e" : "#1e40af",
                      }}>
                      {expense.type}
                    </span>
                  </td>
                  <td style={tdStyle}>{expense.category || "-"}</td>
                  <td style={tdStyle}>{expense.driver?.name || "-"}</td>
                  <td style={tdStyle}>{expense.description}</td>
                  <td style={{ ...tdStyle, fontWeight: "600", color: "#dc2626" }}>₹{Number(expense.amount).toLocaleString()}</td>
                  <td style={tdStyle}>
                    {/* <button
                      onClick={() => handleDelete(expense.id)}
                      style={{
                        padding: "6px 12px",
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "500",
                      }}>
                      Delete
                    </button> */}
                    <button
                      onClick={() => openEditModal(expense)}
                      style={{
                        padding: "6px 12px",
                        background: "#f59e0b",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "500",
                        marginLeft: "8px",
                      }}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Expense Modal */}
      {showEditModal && editingExpense && (
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
              maxWidth: "500px",
              height: "80vh",
              overflow: "scroll",
            }}>
            <h2 style={{ marginBottom: "24px", fontSize: "20px", fontWeight: "700" }}>Edit Expense</h2>

            {/* Expense Type */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Expense Type *</label>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => setEditType("CASH")}
                  style={{
                    flex: 1,
                    padding: "14px",
                    border: editType === "CASH" ? "2px solid #ef4444" : "1px solid #ddd",
                    borderRadius: "8px",
                    background: editType === "CASH" ? "#fef2f2" : "white",
                    cursor: "pointer",
                    fontWeight: "600",
                    color: editType === "CASH" ? "#dc2626" : "#374151",
                  }}>
                  💵 Cash
                </button>
                <button
                  onClick={() => setEditType("BANK")}
                  style={{
                    flex: 1,
                    padding: "14px",
                    border: editType === "BANK" ? "2px solid #3b82f6" : "1px solid #ddd",
                    borderRadius: "8px",
                    background: editType === "BANK" ? "#eff6ff" : "white",
                    cursor: "pointer",
                    fontWeight: "600",
                    color: editType === "BANK" ? "#2563eb" : "#374151",
                  }}>
                  🏦 Bank
                </button>
              </div>
              {editType === "CASH" && <div style={{ marginTop: "8px", fontSize: "13px", color: "#059669", fontWeight: "600" }}>Available Cash: ₹{Number(cashInHand || 0).toLocaleString()}</div>}
            </div>

            {/* Bank */}
            {editType === "BANK" && (
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Bank *</label>
                <select value={editBankId} onChange={(e) => setEditBankId(e.target.value)} style={inputStyle}>
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
                {editBankId &&
                  (() => {
                    const selectedBank = banks.find((b) => b.id === editBankId);
                    return selectedBank ? (
                      <div style={{ marginTop: "8px", fontSize: "13px", color: "#059669", fontWeight: "600" }}>Available Balance: ₹{Number(selectedBank.balance || 0).toLocaleString()}</div>
                    ) : null;
                  })()}
              </div>
            )}

            {/* Amount */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Amount (₹) *</label>
              <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="Enter amount" style={inputStyle} />
            </div>

            {/* Description */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Description *</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What was this expense for?"
                rows={3}
                style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }}
              />
            </div>

            {/* Category */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Category</label>
              <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} style={inputStyle}>
                <option value="">Select category (optional)</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Driver Selection - Show when Salary category */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Driver *</label>
              <Autocomplete
                options={drivers}
                getOptionLabel={(option) => option.name}
                value={editDriver}
                onChange={(_event, newValue) => setEditDriver(newValue)}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.mobile} • {option.status}
                      </Typography>
                    </Box>
                  </li>
                )}
                renderInput={(params) => <TextField {...params} label="Select Driver" placeholder="Search driver by name" size="small" />}
              />
            </div>

            {/* Date */}
            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>Date</label>
              <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={inputStyle} />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleUpdate}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                }}>
                Save Changes
              </button>
              <button
                onClick={closeEditModal}
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

      {/* Add Expense Modal */}
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
              maxWidth: "500px",
              height: "80vh",
              overflow: "scroll",
            }}>
            <h2 style={{ marginBottom: "24px", fontSize: "20px", fontWeight: "700" }}>Add New Expense</h2>

            {/* Expense Type */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Expense Type *</label>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <button
                    onClick={() => setFormType("CASH")}
                    style={{
                      width: "100%",
                      padding: "14px",
                      border: formType === "CASH" ? "2px solid #ef4444" : "1px solid #ddd",
                      borderRadius: "8px",
                      background: formType === "CASH" ? "#fef2f2" : "white",
                      cursor: "pointer",
                      fontWeight: "600",
                      color: formType === "CASH" ? "#dc2626" : "#374151",
                    }}>
                    💵 Cash
                  </button>
                  <div style={{ marginTop: "6px", fontSize: "12px", color: "#6b7280" }}>Total Cash: ₹{Number(cashInHand || 0).toLocaleString("en-IN")}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <button
                    onClick={() => setFormType("BANK")}
                    style={{
                      width: "100%",
                      padding: "14px",
                      border: formType === "BANK" ? "2px solid #3b82f6" : "1px solid #ddd",
                      borderRadius: "8px",
                      background: formType === "BANK" ? "#eff6ff" : "white",
                      cursor: "pointer",
                      fontWeight: "600",
                      color: formType === "BANK" ? "#2563eb" : "#374151",
                    }}>
                    🏦 Bank
                  </button>
                  <div style={{ marginTop: "6px", fontSize: "12px", color: "#6b7280" }}>Total Bank: ₹{Number(totalBankBalance || 0).toLocaleString("en-IN")}</div>
                </div>
              </div>
            </div>

            {/* Bank */}
            {formType === "BANK" && (
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

            {/* Description */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Description *</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What was this expense for?"
                rows={3}
                style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }}
              />
            </div>

            {/* Category */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Category</label>
              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} style={inputStyle}>
                <option value="">Select category (optional)</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Driver Selection - Show when Salary category */}

            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Driver *</label>
              <Autocomplete
                options={drivers}
                getOptionLabel={(option) => option.name}
                value={formDriver}
                onChange={(_event, newValue) => setFormDriver(newValue)}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.mobile} • {option.status}
                      </Typography>
                    </Box>
                  </li>
                )}
                renderInput={(params) => <TextField {...params} label="Select Driver" placeholder="Search driver by name" size="small" />}
              />
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
                  background: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                }}>
                Add Expense
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

const summaryCardStyle: React.CSSProperties = {
  background: "white",
  padding: "24px",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

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
