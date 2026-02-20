import { useEffect, useState } from "react";
import { adminAPI, companyAPI, customerAPI } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@mui/material";
import Loader from "../components/Loader";
import DateService from "../utils/date";

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
    console.log(editingTransaction, entityType);
    try {
      const response = await adminAPI.updateTransaction(editingTransaction.id, {
        amount: editAmount ? Number(editAmount) : undefined,
        rate: editRate ? Number(editRate) : undefined,
        totalAmount: editTotalAmount ? Number(editTotalAmount) : undefined,
        details: editDetails.trim() === "" ? null : editDetails,
        companyId: editingTransaction.companyId,
        customerId: editingTransaction.customerId,
        driverId: editingTransaction.driverId,
        entityType: entityType,
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

  const handleDelete = async (tx: any) => {
    const ok = window.confirm("Delete this bought transaction?.");
    if (!ok) return;
    setLoading(true);
    try {
      await adminAPI.deleteTransaction(tx.id);
      setTransactions((prev) => prev.filter((row) => row.id !== tx.id));
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete transaction");
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="p-[30px]">
      {loading && <Loader />}
      <div className="flex items-center mb-[30px] gap-[15px]">
        <h1 className="text-[28px] font-bold m-0">🛒 Bought (Purchase) Transactions</h1>
        <span className="px-3.5 py-1.5 bg-blue-100 rounded-full text-sm font-semibold text-blue-800">{transactions.length} records</span>
        <button
          onClick={downloadPdf}
          disabled={transactions.length === 0}
          className={`ml-auto px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all duration-150 ${
            transactions.length === 0
              ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
              : "bg-gradient-to-br from-violet-500 to-violet-600 text-white cursor-pointer shadow-[0_2px_10px_rgba(139,92,246,0.3)] hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(139,92,246,0.4)]"
          }`}>
          <span className="text-base">📄</span>
          Download PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-5 rounded-xl shadow-[0_4px_12px_rgba(59,130,246,0.3)]">
          <div className="text-sm opacity-90 mb-1.5">Total Quantity</div>
          <div className="text-[26px] font-bold">{totalAmount.toFixed(2)}</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-5 rounded-xl shadow-[0_4px_12px_rgba(16,185,129,0.3)]">
          <div className="text-sm opacity-90 mb-1.5">Total Value</div>
          <div className="text-[26px] font-bold">₹{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      {/* Entity Type Selection */}
      <div className="bg-white p-5 rounded-xl mb-4 shadow-sm border border-gray-200">
        <label className="block mb-3 font-semibold text-sm text-gray-700">Bought From</label>
        <div className="flex gap-6 flex-wrap items-center">
          {/* Radio Buttons */}
          <div className="flex gap-5">
            {(["company", "customer", "driver"] as EntityType[]).map((type) => (
              <label
                key={type}
                className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                  entityType === type ? "border-2 border-blue-500 bg-blue-50" : "border-gray-300 bg-white"
                }`}>
                <input type="radio" name="entityType" value={type} checked={entityType === type} onChange={() => setEntityType(type)} className="accent-blue-500 w-4 h-4" />
                <span className={`capitalize ${entityType === type ? "font-semibold text-blue-700" : "font-medium text-gray-700"}`}>{type}</span>
              </label>
            ))}
          </div>

          {/* Entity Dropdown */}
          <div className="flex-1 min-w-[250px]">
            <select
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              disabled={loadingEntities}
              className={`w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition-colors ${loadingEntities ? "cursor-wait bg-gray-100" : "cursor-pointer bg-white"}`}>
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
      <div className="bg-white p-5 rounded-xl mb-5 shadow-sm border border-gray-200">
        <div className="flex gap-[15px] flex-wrap items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block mb-2 font-medium text-sm text-gray-700">Start Date</label>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block mb-2 font-medium text-sm text-gray-700">End Date</label>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex-[1.3] min-w-[220px]">
            <label className="block mb-2 font-medium text-sm text-gray-700">Search Details</label>
            <input
              type="text"
              value={filter.detail}
              onChange={(e) => setFilter({ ...filter, detail: e.target.value })}
              placeholder='e.g. "abc"'
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFilter();
              }}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block mb-2 font-medium text-sm text-gray-700">Company Name</label>
            <input
              type="text"
              value={filter.companyName}
              onChange={(e) => setFilter({ ...filter, companyName: e.target.value })}
              placeholder='e.g. "Evergreen"'
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFilter();
              }}
            />
          </div>

          <button onClick={handleFilter} className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 transition-colors cursor-pointer">
            Apply Filter
          </button>

          <button onClick={clearFilter} className="px-6 py-2.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors cursor-pointer">
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b-2 border-gray-200">
              <th className="p-3.5 px-4 text-left text-[13px] font-semibold text-slate-600 uppercase tracking-tighter">Date</th>
              <th className="p-3.5 px-4 text-left text-[13px] font-semibold text-slate-600 uppercase tracking-tighter">Driver</th>
              <th className="p-3.5 px-4 text-left text-[13px] font-semibold text-slate-600 uppercase tracking-tighter">Company</th>
              <th className="p-3.5 px-4 text-left text-[13px] font-semibold text-slate-600 uppercase tracking-tighter">Quantity</th>
              <th className="p-3.5 px-4 text-left text-[13px] font-semibold text-slate-600 uppercase tracking-tighter">Unit</th>
              <th className="p-3.5 px-4 text-left text-[13px] font-semibold text-slate-600 uppercase tracking-tighter">Rate</th>
              <th className="p-3.5 px-4 text-left text-[13px] font-semibold text-slate-600 uppercase tracking-tighter">Total Amount</th>
              <th className="p-3.5 px-4 text-left text-[13px] font-semibold text-slate-600 uppercase tracking-tighter">Image</th>
              <th className="p-3.5 px-4 text-left text-[13px] font-semibold text-slate-600 uppercase tracking-tighter">Details</th>
              <th className="p-3.5 px-4 text-left text-[13px] font-semibold text-slate-600 uppercase tracking-tighter">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-[50px] text-center text-gray-400">
                  <div className="text-5xl mb-2.5">📭</div>
                  No purchase transactions found
                </td>
              </tr>
            ) : (
              transactions.map((tx, index) => (
                <tr key={tx.id} className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                  <td className="p-4 text-sm text-gray-500">
                    <div className="font-medium text-gray-900">
                      {new Date(tx.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(tx.date).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    <div className="font-medium text-gray-700">{tx.driver?.name || "-"}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    <div className="font-medium text-gray-700">{tx?.companyName || tx?.company?.name || tx?.customer?.name || tx?.driver?.name || "-"}</div>
                    {tx.customer?.phone && <div className="text-xs text-gray-400">{tx.customer.phone}</div>}
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    <span className="font-semibold text-gray-900">{Number(tx.amount).toFixed(2)}</span>
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-medium text-slate-500">{tx.unit}</span>
                  </td>
                  <td className="p-4 text-sm text-gray-500">{tx.rate ? <span className="text-gray-700">₹{Number(tx.rate).toFixed(2)}</span> : "-"}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {tx.totalAmount ? <span className="font-semibold text-emerald-600 text-[15px]">₹{Number(tx.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span> : "-"}
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {tx.imageUrl ? (
                      <a href={tx.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img src={tx.imageUrl} alt="Slip" className="w-[60px] h-[60px] object-cover rounded-lg border border-gray-200 cursor-pointer transition-transform hover:scale-110" />
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">No image</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    <span className="text-gray-500 text-[13px]">{tx.details || "-"}</span>
                  </td>
                  <td className="p-4 flex gap-2 items-center text-sm text-gray-500">
                    <button
                      onClick={() => openEditModal(tx)}
                      className="px-3.5 py-1.5 bg-amber-500 text-white rounded-md font-medium text-[13px] hover:bg-amber-600 transition-colors flex items-center gap-1 cursor-pointer">
                      ✏️ Edit
                    </button>
                    {DateService.isDateWithinToday(new Date(tx.createdAt)) ? (
                      <button className="bg-red-600 py-[7px] cursor-pointer hover:bg-red-800 px-4 text-[12px] text-white rounded-md shadow-xl" onClick={() => handleDelete(tx)}>
                        Delete
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">Not Bought Today</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center mt-4">
        <button
          onClick={handleLoadMore}
          disabled={loadingMore || page >= totalPages}
          className={`px-4.5 py-2.5 rounded-[10px] font-bold text-[13px] border transition-colors ${
            loadingMore || page >= totalPages ? "bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 cursor-pointer"
          }`}>
          {loadingMore ? "Loading..." : page >= totalPages ? "No More Transactions" : "Load More"}
        </button>
      </div>

      {/* Edit Modal */}
      {editModalOpen && editingTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] animate-in fade-in duration-200" onClick={closeEditModal}>
          <div className="bg-white rounded-2xl p-[30px] w-full max-h-[80vh] overflow-y-auto max-w-[450px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="m-0 text-[22px] font-bold text-gray-800">✏️ Edit Transaction</h2>
              <button onClick={closeEditModal} className="bg-transparent border-none text-2xl cursor-pointer text-gray-400 p-1.25 leading-none hover:text-gray-700 transition-colors">
                ×
              </button>
            </div>

            {/* Transaction Info */}
            <div className="bg-slate-50 p-4 rounded-[10px] mb-5 border border-gray-200">
              <div className="grid grid-cols-2 gap-2.5 text-sm">
                <div>
                  <span className="text-gray-500">Customer:</span>
                  <div className="font-semibold text-gray-700">{editingTransaction.customer?.name || "-"}</div>
                </div>
                <div>
                  <span className="text-gray-500">Quantity:</span>
                  <div className="font-semibold text-gray-700">
                    {Number(editingTransaction.amount).toFixed(2)} {editingTransaction.unit}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>
                  <div className="font-semibold text-gray-700">{new Date(editingTransaction.date).toLocaleDateString("en-IN")}</div>
                </div>
                <div>
                  <span className="text-gray-500">Driver:</span>
                  <div className="font-semibold text-gray-700">{editingTransaction.driver?.name || "-"}</div>
                </div>
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-5">
              <label className="block mb-2 font-semibold text-sm text-gray-700">Quantity (Kg)</label>
              <input
                type="number"
                value={editAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="Enter quantity"
                className="w-full p-3 px-3.5 border-2 border-gray-200 rounded-[10px] text-base outline-none focus:border-blue-500 transition-all box-border"
              />
            </div>

            {/* Rate Input */}
            <div className="mb-5">
              <label className="block mb-2 font-semibold text-sm text-gray-700">Rate (₹ per unit)</label>
              <input
                type="number"
                value={editRate}
                onChange={(e) => handleRateChange(e.target.value)}
                placeholder="Enter rate"
                className="w-full p-3 px-3.5 border-2 border-gray-200 rounded-[10px] text-base outline-none focus:border-blue-500 transition-all box-border"
              />
            </div>

            {/* Total Amount Input */}
            <div className="mb-6">
              <label className="block mb-2 font-semibold text-sm text-gray-700">Total Amount (₹)</label>
              <input
                type="number"
                value={editTotalAmount}
                onChange={(e) => setEditTotalAmount(e.target.value)}
                placeholder="Enter total amount"
                className="w-full p-3 px-3.5 border-2 border-gray-200 rounded-[10px] text-base outline-none focus:border-blue-500 transition-all box-border bg-slate-50"
              />
              <p className="mt-2 text-xs text-gray-500">Auto-calculated: Rate × Quantity = ₹{editRate && editAmount ? (Number(editRate) * Number(editAmount)).toFixed(2) : "0.00"}</p>
            </div>

            {/* Details Input */}
            <div className="mb-6">
              <label className="block mb-2 font-semibold text-sm text-gray-700">Details</label>
              <textarea
                value={editDetails}
                onChange={(e) => setEditDetails(e.target.value)}
                placeholder="Enter details / notes"
                rows={3}
                className="w-full p-3 px-3.5 border-2 border-gray-200 rounded-[10px] text-sm outline-none focus:border-blue-500 transition-all box-border font-inherit resize-y"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={closeEditModal}
                className="flex-1 py-3 px-5 bg-gray-100 text-gray-700 border border-gray-300 rounded-[10px] cursor-pointer font-semibold text-[15px] hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className={`flex-1 py-3 px-5 rounded-[10px] font-semibold text-[15px] transition-colors ${
                  saving ? "bg-gray-400 text-white cursor-not-allowed" : "bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600"
                }`}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
