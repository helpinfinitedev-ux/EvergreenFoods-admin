import { useEffect, useState } from "react";
import { adminAPI, companyAPI, customerAPI } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type EntityType = "company" | "customer" | "driver";

interface Company {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  mobile: string;
}

interface Driver {
  id: string;
  name: string;
  mobile: string;
}

export default function Bought() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState({
    startDate: "",
    endDate: "",
    detail: "",
    companyName: "",
  });

  // Entity selection state
  const [entityType, setEntityType] = useState<EntityType>("company");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [loadingEntities, setLoadingEntities] = useState(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editRate, setEditRate] = useState("");
  const [editTotalAmount, setEditTotalAmount] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTransactions(1, false);
    loadEntities(entityType);
  }, []);

  useEffect(() => {
    loadEntities(entityType);
    setSelectedEntityId("");
  }, [entityType]);

  const loadEntities = async (type: EntityType) => {
    setLoadingEntities(true);
    try {
      switch (type) {
        case "company":
          const companyRes = await companyAPI.getAll();
          setCompanies(companyRes.data?.companies || companyRes.data || []);
          break;
        case "customer":
          const customerRes = await customerAPI.getAll();
          setCustomers(customerRes.data || []);
          break;
        case "driver":
          const driverRes = await adminAPI.getDrivers();
          setDrivers(driverRes.data || []);
          break;
      }
    } catch (err) {
      console.error(`Failed to load ${type}s`, err);
    } finally {
      setLoadingEntities(false);
    }
  };

  const loadTransactions = async (nextPage: number, append: boolean) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      let params: any = { type: "BUY" };
      if (filter.startDate) params.startDate = filter.startDate;
      if (filter.endDate) params.endDate = filter.endDate;
      if (filter.detail) params.details = filter.detail;
      if (filter.companyName) params.companyName = filter.companyName;

      // Add entity filter based on selection
      if (selectedEntityId) {
        switch (entityType) {
          case "company":
            params.companyId = selectedEntityId;
            break;
          case "customer":
            params.customerId = selectedEntityId;
            break;
          case "driver":
            params.driverId = selectedEntityId;
            break;
        }
      }

      params.page = nextPage;

      const response = await adminAPI.getTransactions(params);
      const data = response.data || {};
      const rows = data.rows || [];
      setTransactions((prev) => (append ? [...prev, ...rows] : rows));
      setPage(data.page || nextPage);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleFilter = () => {
    setPage(1);
    loadTransactions(1, false);
  };

  const clearFilter = () => {
    setFilter({ startDate: "", endDate: "", detail: "", companyName: "" });
    setSelectedEntityId("");
    setPage(1);
    loadTransactions(1, false);
  };

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    loadTransactions(page + 1, true);
  };

  // Edit modal handlers
  const openEditModal = (tx: any) => {
    setEditingTransaction(tx);
    const entityType = tx.customerId ? "customer" : tx.companyId ? "company" : tx.driverId ? "driver" : undefined;
    if (!entityType) {
      return;
    }
    setEntityType(entityType);
    setEditAmount(tx.amount?.toString() || "");
    setEditRate(tx.rate?.toString() || "");
    setEditTotalAmount(tx.totalAmount?.toString() || "");
    setEditDetails(tx.details || "");
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingTransaction(null);
    setEditAmount("");
    setEditRate("");
    setEditTotalAmount("");
    setEditDetails("");
  };

  const handleAmountChange = (newAmount: string) => {
    setEditAmount(newAmount);
    if (editingTransaction && newAmount && editRate) {
      const calculatedTotal = Number(newAmount) * Number(editRate);
      setEditTotalAmount(calculatedTotal.toFixed(2));
    }
  };

  const handleRateChange = (newRate: string) => {
    setEditRate(newRate);
    if (editingTransaction && newRate && editAmount) {
      const calculatedTotal = Number(newRate) * Number(editAmount);
      setEditTotalAmount(calculatedTotal.toFixed(2));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;

    setSaving(true);
    console.log(editingTransaction);
    try {
      const response = await adminAPI.updateTransaction(editingTransaction.id, {
        amount: editAmount ? Number(editAmount) : undefined,
        rate: editRate ? Number(editRate) : undefined,
        totalAmount: editTotalAmount ? Number(editTotalAmount) : undefined,
        details: editDetails.trim() === "" ? null : editDetails,
        companyId: editingTransaction.companyId,
        customerId: editingTransaction.customerId,
        driverId: editingTransaction.driverId,
        entityType: editingTransaction.entityType,
      });

      // Update local state
      setTransactions((prev) => prev.map((tx) => (tx.id === editingTransaction.id ? response.data.transaction : tx)));

      closeEditModal();
    } catch (err) {
      console.error("Failed to update transaction", err);
      alert("Failed to update transaction");
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const totalAmount = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const totalValue = transactions.reduce((sum, tx) => sum + Number(tx.totalAmount || 0), 0);

  const formatIndianNumber = (num: number): string => {
    const numStr = Math.round(num).toString();
    if (numStr.length <= 3) return numStr;

    const lastThree = numStr.slice(-3);
    const remaining = numStr.slice(0, -3);
    return remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  };

  const formatMoneyPdf = (value: any) => {
    const n = Number(value || 0);
    const fixed = n.toFixed(2);
    const [intPart, decPart] = fixed.split(".");
    return "Rs." + formatIndianNumber(Number(intPart)) + "." + decPart;
  };

  const formatDatePdf = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const downloadPdf = () => {
    if (transactions.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Evergreen Foods", pageWidth / 2, 18, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Bought (Purchase) Transactions", pageWidth / 2, 26, { align: "center" });

    const periodText =
      filter.startDate || filter.endDate ? "Period: " + (filter.startDate || "Start") + " to " + (filter.endDate || "Present") : "Report Generated: " + new Date().toLocaleDateString("en-IN");
    const detailsText = filter.detail ? 'Details filter: "' + filter.detail + '"' : "";

    doc.setFontSize(10);
    doc.text(periodText, 14, 36);
    if (detailsText) doc.text(detailsText, 14, 42);

    const headers = ["Date", "Driver", "Customer", "Qty", "Unit", "Rate", "Total", "Details"];
    const rows = transactions.map((tx) => [
      formatDatePdf(tx.date),
      tx.driver?.name || "-",
      tx.customer?.name || "-",
      Number(tx.amount || 0).toFixed(2),
      tx.unit || "-",
      tx.rate ? formatMoneyPdf(tx.rate) : "-",
      tx.totalAmount ? formatMoneyPdf(tx.totalAmount) : "-",
      (tx.details ? String(tx.details).replaceAll("₹", "Rs.") : "-") as string,
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: detailsText ? 48 : 42,
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
        1: { cellWidth: 22 }, // Driver
        2: { cellWidth: 22 }, // Customer
        3: { cellWidth: 12 }, // Qty
        4: { cellWidth: 12 }, // Unit
        5: { cellWidth: 18 }, // Rate
        6: { cellWidth: 20 }, // Total
        7: { cellWidth: "auto" }, // Details (wrap)
      },
      tableWidth: "auto",
      margin: { left: 14, right: 14 },
    });

    const fileName = "bought_transactions_" + new Date().toISOString().split("T")[0] + ".pdf";
    doc.save(fileName);
  };

  const getEntityList = () => {
    switch (entityType) {
      case "company":
        return companies.map((c) => ({ id: c.id, name: c.name }));
      case "customer":
        return customers.map((c) => ({ id: c.id, name: `${c.name} (${c.mobile})` }));
      case "driver":
        return drivers.map((d) => ({ id: d.id, name: `${d.name} (${d.mobile})` }));
      default:
        return [];
    }
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>;

  return (
    <div style={{ padding: "30px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "30px", gap: "15px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", margin: 0 }}>🛒 Bought (Purchase) Transactions</h1>
        <span
          style={{
            padding: "6px 14px",
            background: "#dbeafe",
            borderRadius: "20px",
            fontSize: "14px",
            fontWeight: "600",
            color: "#1e40af",
          }}>
          {transactions.length} records
        </span>
        <button
          onClick={downloadPdf}
          disabled={transactions.length === 0}
          style={{
            marginLeft: "auto",
            padding: "10px 16px",
            background: transactions.length === 0 ? "#e5e7eb" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
            color: transactions.length === 0 ? "#9ca3af" : "white",
            border: "none",
            borderRadius: "10px",
            cursor: transactions.length === 0 ? "not-allowed" : "pointer",
            fontWeight: "700",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: transactions.length === 0 ? "none" : "0 2px 10px rgba(139, 92, 246, 0.3)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseOver={(e) => {
            if (transactions.length > 0) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(139, 92, 246, 0.4)";
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = transactions.length === 0 ? "none" : "0 2px 10px rgba(139, 92, 246, 0.3)";
          }}>
          <span style={{ fontSize: "16px" }}>📄</span>
          Download PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "25px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
            color: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
          }}>
          <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "5px" }}>Total Quantity</div>
          <div style={{ fontSize: "26px", fontWeight: "700" }}>{totalAmount.toFixed(2)}</div>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
            color: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
          }}>
          <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "5px" }}>Total Value</div>
          <div style={{ fontSize: "26px", fontWeight: "700" }}>₹{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      {/* Entity Type Selection */}
      <div
        style={{
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          marginBottom: "16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid #e5e7eb",
        }}>
        <label style={{ display: "block", marginBottom: "12px", fontWeight: "600", fontSize: "14px", color: "#374151" }}>Bought From</label>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Radio Buttons */}
          <div style={{ display: "flex", gap: "20px" }}>
            {(["company", "customer", "driver"] as EntityType[]).map((type) => (
              <label
                key={type}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: entityType === type ? "2px solid #3b82f6" : "1px solid #d1d5db",
                  background: entityType === type ? "#eff6ff" : "white",
                  transition: "all 0.2s",
                }}>
                <input
                  type="radio"
                  name="entityType"
                  value={type}
                  checked={entityType === type}
                  onChange={() => setEntityType(type)}
                  style={{ accentColor: "#3b82f6", width: "16px", height: "16px" }}
                />
                <span style={{ fontWeight: entityType === type ? "600" : "500", color: entityType === type ? "#1d4ed8" : "#374151", textTransform: "capitalize" }}>{type}</span>
              </label>
            ))}
          </div>

          {/* Entity Dropdown */}
          <div style={{ flex: 1, minWidth: "250px" }}>
            <select
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              disabled={loadingEntities}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                cursor: loadingEntities ? "wait" : "pointer",
                background: loadingEntities ? "#f3f4f6" : "white",
              }}>
              <option value="">All {entityType}s</option>
              {getEntityList().map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          marginBottom: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid #e5e7eb",
        }}>
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "end" }}>
          <div style={{ flex: "1", minWidth: "150px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", fontSize: "14px", color: "#374151" }}>Start Date</label>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
            />
          </div>

          <div style={{ flex: "1", minWidth: "150px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", fontSize: "14px", color: "#374151" }}>End Date</label>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
            />
          </div>

          <div style={{ flex: "1.3", minWidth: "220px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", fontSize: "14px", color: "#374151" }}>Search Details</label>
            <input
              type="text"
              value={filter.detail}
              onChange={(e) => setFilter({ ...filter, detail: e.target.value })}
              placeholder='e.g. "abc"'
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFilter();
              }}
            />
          </div>
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", fontSize: "14px", color: "#374151" }}>Company Name</label>
            <input
              type="text"
              value={filter.companyName}
              onChange={(e) => setFilter({ ...filter, companyName: e.target.value })}
              placeholder='e.g. "Evergreen"'
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFilter();
              }}
            />
          </div>

          <button
            onClick={handleFilter}
            style={{
              padding: "10px 24px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "14px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#2563eb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#3b82f6")}>
            Apply Filter
          </button>

          <button
            onClick={clearFilter}
            style={{
              padding: "10px 24px",
              background: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "14px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f3f4f6")}>
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Driver</th>
              <th style={thStyle}>Company</th>
              <th style={thStyle}>Quantity</th>
              <th style={thStyle}>Unit</th>
              <th style={thStyle}>Rate</th>
              <th style={thStyle}>Total Amount</th>
              <th style={thStyle}>Image</th>
              <th style={thStyle}>Details</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: "50px", textAlign: "center", color: "#9ca3af" }}>
                  <div style={{ fontSize: "48px", marginBottom: "10px" }}>📭</div>
                  No purchase transactions found
                </td>
              </tr>
            ) : (
              transactions.map((tx, index) => (
                <tr
                  key={tx.id}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: index % 2 === 0 ? "white" : "#fafbfc",
                  }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: "500", color: "#1f2937" }}>
                      {new Date(tx.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                      {new Date(tx.date).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: "500", color: "#374151" }}>{tx.driver?.name || "-"}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: "500", color: "#374151" }}>{tx?.companyName || tx?.company?.name || tx?.customer?.name || tx?.driver?.name || "-"}</div>
                    {tx.customer?.phone && <div style={{ fontSize: "12px", color: "#9ca3af" }}>{tx.customer.phone}</div>}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: "600", color: "#1f2937" }}>{Number(tx.amount).toFixed(2)}</span>
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: "3px 8px",
                        background: "#f1f5f9",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "500",
                        color: "#64748b",
                      }}>
                      {tx.unit}
                    </span>
                  </td>
                  <td style={tdStyle}>{tx.rate ? <span style={{ color: "#374151" }}>₹{Number(tx.rate).toFixed(2)}</span> : "-"}</td>
                  <td style={tdStyle}>
                    {tx.totalAmount ? (
                      <span
                        style={{
                          fontWeight: "600",
                          color: "#059669",
                          fontSize: "15px",
                        }}>
                        ₹{Number(tx.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={tdStyle}>
                    {tx.imageUrl ? (
                      <a href={tx.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={tx.imageUrl}
                          alt="Slip"
                          style={{
                            width: "60px",
                            height: "60px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                            cursor: "pointer",
                            transition: "transform 0.2s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        />
                      </a>
                    ) : (
                      <span style={{ color: "#9ca3af", fontSize: "12px" }}>No image</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: "#6b7280", fontSize: "13px" }}>{tx.details || "-"}</span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => openEditModal(tx)}
                      style={{
                        padding: "6px 14px",
                        background: "#f59e0b",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "500",
                        fontSize: "13px",
                        transition: "background 0.2s",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#d97706")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#f59e0b")}>
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
        <button
          onClick={handleLoadMore}
          disabled={loadingMore || page >= totalPages}
          style={{
            padding: "10px 18px",
            background: loadingMore || page >= totalPages ? "#e5e7eb" : "#f3f4f6",
            color: loadingMore || page >= totalPages ? "#9ca3af" : "#374151",
            border: "1px solid #d1d5db",
            borderRadius: "10px",
            cursor: loadingMore || page >= totalPages ? "not-allowed" : "pointer",
            fontWeight: "700",
            fontSize: "13px",
          }}>
          {loadingMore ? "Loading..." : page >= totalPages ? "No More Transactions" : "Load More"}
        </button>
      </div>

      {/* Edit Modal */}
      {editModalOpen && editingTransaction && (
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
              borderRadius: "16px",
              padding: "30px",
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
              maxWidth: "450px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              animation: "fadeIn 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "25px" }}>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#1f2937" }}>✏️ Edit Transaction</h2>
              <button
                onClick={closeEditModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#9ca3af",
                  padding: "5px",
                  lineHeight: 1,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#374151")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}>
                ×
              </button>
            </div>

            {/* Transaction Info */}
            <div
              style={{
                background: "#f8fafc",
                padding: "15px",
                borderRadius: "10px",
                marginBottom: "20px",
                border: "1px solid #e5e7eb",
              }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "14px" }}>
                <div>
                  <span style={{ color: "#6b7280" }}>Customer:</span>
                  <div style={{ fontWeight: "600", color: "#374151" }}>{editingTransaction.customer?.name || "-"}</div>
                </div>
                <div>
                  <span style={{ color: "#6b7280" }}>Quantity:</span>
                  <div style={{ fontWeight: "600", color: "#374151" }}>
                    {Number(editingTransaction.amount).toFixed(2)} {editingTransaction.unit}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#6b7280" }}>Date:</span>
                  <div style={{ fontWeight: "600", color: "#374151" }}>{new Date(editingTransaction.date).toLocaleDateString("en-IN")}</div>
                </div>
                <div>
                  <span style={{ color: "#6b7280" }}>Driver:</span>
                  <div style={{ fontWeight: "600", color: "#374151" }}>{editingTransaction.driver?.name || "-"}</div>
                </div>
              </div>
            </div>

            {/* Amount Input */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#374151",
                }}>
                Quantity (Kg)
              </label>
              <input
                type="number"
                value={editAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="Enter quantity"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "10px",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            {/* Rate Input */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#374151",
                }}>
                Rate (₹ per unit)
              </label>
              <input
                type="number"
                value={editRate}
                onChange={(e) => handleRateChange(e.target.value)}
                placeholder="Enter rate"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "10px",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            {/* Total Amount Input */}
            <div style={{ marginBottom: "25px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#374151",
                }}>
                Total Amount (₹)
              </label>
              <input
                type="number"
                value={editTotalAmount}
                onChange={(e) => setEditTotalAmount(e.target.value)}
                placeholder="Enter total amount"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "10px",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                  background: "#f8fafc",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
              <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#6b7280" }}>
                Auto-calculated: Rate × Quantity = ₹{editRate && editAmount ? (Number(editRate) * Number(editAmount)).toFixed(2) : "0.00"}
              </p>
            </div>

            {/* Details Input */}
            <div style={{ marginBottom: "25px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#374151",
                }}>
                Details
              </label>
              <textarea
                value={editDetails}
                onChange={(e) => setEditDetails(e.target.value)}
                placeholder="Enter details / notes"
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "10px",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={closeEditModal}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "15px",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#f3f4f6")}>
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  background: saving ? "#9ca3af" : "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: "15px",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => !saving && (e.currentTarget.style.background = "#059669")}
                onMouseLeave={(e) => !saving && (e.currentTarget.style.background = "#10b981")}>
                {saving ? "Saving..." : "Save Changes"}
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
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const tdStyle: React.CSSProperties = {
  padding: "16px",
  fontSize: "14px",
  color: "#6b7280",
};
