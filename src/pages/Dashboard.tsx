import { useEffect, useState } from "react";
import { adminAPI, expenseAPI, companyAPI, bankAPI } from "../api";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";

interface ExpenseSummary {
  cashTotal: number;
  bankTotal: number;
  total: number;
  count: number;
}

interface TotalCapital {
  id: string;
  totalCash: number;
  todayCash: number;
  cashLastUpdatedAt: string | null;
}

interface DriverActivity {
  driverId: string;
  driverName: string;
  totalSellCashAmount: number;
  totalSellUpiAmount: number;
  totalSellAmount: number;
  totalSellQuantity: number;
  totalBuyAmount: number;
  totalBuyQuantityKg: number;
  totalWeightLoss: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null);
  const [totalCapital, setTotalCapital] = useState<TotalCapital | null>(null);
  const [totalUdhaar, setTotalUdhaar] = useState(0);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date());
  const [driversActivity, setDriversActivity] = useState<DriverActivity[]>([]);
  const [driverSearch, setDriverSearch] = useState("");
  const [driverTableDate, setDriverTableDate] = useState<Dayjs>(dayjs());

  // Edit Bank Modal State
  const [editBankModalOpen, setEditBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<{ id: string; name: string; balance: number } | null>(null);
  const [editBankBalance, setEditBankBalance] = useState("");
  const [editBankSubmitting, setEditBankSubmitting] = useState(false);

  // Edit Total Capital Modal State
  const [editCapitalModalOpen, setEditCapitalModalOpen] = useState(false);
  const [editCapitalAmount, setEditCapitalAmount] = useState("");
  const [editCapitalSubmitting, setEditCapitalSubmitting] = useState(false);

  useEffect(() => {
    const loadStats = async (date: Date) => {
      try {
        // Get today's expenses
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        const [dashboardRes, expenseRes, capitalRes, borrowedRes, companiesRes, driversActivityRes] = await Promise.all([
          adminAPI.getDashboard({ start: startDate.getTime(), end: endDate.getTime() }),
          expenseAPI.getSummary({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }),
          adminAPI.getTotalCapital(),
          adminAPI.getBorrowedInfo(),
          companyAPI.getAll({ page: 1 }),
          adminAPI.getDriversActivitySummary({
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          }),
        ]);

        setStats(dashboardRes.data);
        setExpenseSummary(expenseRes.data);
        setTotalCapital(capitalRes.data);
        setDriversActivity(driversActivityRes.data?.driversActivity || []);

        // Calculate Total Udhaar
        const udhaar = (borrowedRes.data || []).reduce((sum: number, item: any) => sum + Number(item.borrowedMoney || 0), 0);
        setTotalUdhaar(udhaar);

        // Set Total Companies
        setTotalCompanies(Number(companiesRes.data?.total || 0));
      } catch (err) {
        console.error("Failed to load stats", err);
      } finally {
        setLoading(false);
      }
    };
    console.log(date);
    loadStats(date);
  }, [date]);

  // Load driver activity when driverTableDate changes
  useEffect(() => {
    const loadDriverActivity = async () => {
      try {
        const startDate = driverTableDate.startOf("day").toDate();
        const endDate = driverTableDate.endOf("day").toDate();

        const driversActivityRes = await adminAPI.getDriversActivitySummary({
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        });
        setDriversActivity(driversActivityRes.data?.driversActivity || []);
      } catch (err) {
        console.error("Failed to load driver activity", err);
      }
    };
    loadDriverActivity();
  }, [driverTableDate]);

  // Filter drivers by search
  const filteredDriversActivity = driversActivity.filter((driver) => driver.driverName?.toLowerCase().includes(driverSearch.toLowerCase()));

  // Handle opening bank edit modal
  const handleOpenBankEdit = (bank: { id: string; name: string; balance: number }) => {
    setEditingBank(bank);
    setEditBankBalance(String(bank.balance));
    setEditBankModalOpen(true);
  };

  // Handle bank balance update
  const handleUpdateBankBalance = async () => {
    if (!editingBank) return;
    const numericBalance = Number(editBankBalance);
    if (isNaN(numericBalance)) {
      alert("Please enter a valid number");
      return;
    }
    setEditBankSubmitting(true);
    try {
      await bankAPI.update(editingBank.id, { balance: numericBalance });
      setEditBankModalOpen(false);
      setEditingBank(null);
      setEditBankBalance("");
      // Reload stats to reflect changes
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      const dashboardRes = await adminAPI.getDashboard({ start: startDate.getTime(), end: endDate.getTime() });
      setStats(dashboardRes.data);
    } catch (err) {
      console.error("Failed to update bank balance", err);
      alert("Failed to update bank balance");
    } finally {
      setEditBankSubmitting(false);
    }
  };

  // Handle opening capital edit modal
  const handleOpenCapitalEdit = () => {
    setEditCapitalAmount("");
    setEditCapitalModalOpen(true);
  };

  // Handle total capital update
  const handleUpdateTotalCapital = async () => {
    const numericAmount = Number(editCapitalAmount);
    if (isNaN(numericAmount)) {
      alert("Please enter a valid number");
      return;
    }
    setEditCapitalSubmitting(true);
    try {
      await adminAPI.updateTotalCapital(numericAmount);
      setEditCapitalModalOpen(false);
      setEditCapitalAmount("");
      // Reload total capital
      const capitalRes = await adminAPI.getTotalCapital();
      setTotalCapital(capitalRes.data);
    } catch (err) {
      console.error("Failed to update total capital", err);
      alert("Failed to update total capital");
    } finally {
      setEditCapitalSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Loading...</div>;
  console.log(stats);
  return (
    <div style={{ padding: "30px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <h1 style={{ marginBottom: "30px", fontSize: "28px", fontWeight: "700" }}>Dashboard</h1>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            value={dayjs(date)}
            onChange={(newValue: Dayjs | null) => {
              if (newValue) {
                setDate(newValue.toDate());
              }
            }}
            slotProps={{ textField: { size: "small" } }}
            disableFuture
          />
        </LocalizationProvider>
      </div>

      {/* Main Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "24px",
          marginBottom: "30px",
        }}>
        <StatCard title="Total Available Stock" value={`${(stats?.totalAvailableStock || 0).toFixed(2)} KG`} color="#7c3aed" icon="📦" />
        <StatCard title="Today Buy" value={`${(stats?.todayBuy || 0)?.toFixed(2)} KG`} color="#10b981" icon="📥" />
        <StatCard title="Today Sell" value={`${(stats?.todaySell || 0)?.toFixed(2)} KG`} color="#3b82f6" icon="📤" />
        {/* <StatCard title="Today Shop Buy" value={`${(stats?.todayShopBuy || 0)?.toFixed(2)} KG`} color="#8b5cf6" icon="🛒" /> */}
      </div>

      {/* Driver Activity Table */}
      <Paper sx={{ mb: 4, borderRadius: 3, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        {/* Header with Title */}
        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#374151" }}>
            Driver Activity Summary
          </Typography>
        </Box>

        {/* Filters Section */}
        <Box sx={{ px: 3, py: 2, display: "flex", gap: 2, alignItems: "center", borderBottom: "1px solid #e5e7eb", backgroundColor: "#fff" }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Select Date"
              value={driverTableDate}
              onChange={(newValue: Dayjs | null) => {
                if (newValue) {
                  setDriverTableDate(newValue);
                }
              }}
              slotProps={{ textField: { size: "small", sx: { width: 180 } } }}
              disableFuture
            />
          </LocalizationProvider>
          <TextField
            size="small"
            placeholder="Search driver..."
            value={driverSearch}
            onChange={(e) => setDriverSearch(e.target.value)}
            sx={{ width: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#9ca3af" }} />
                </InputAdornment>
              ),
            }}
          />
          <Typography variant="body2" sx={{ color: "#6b7280", ml: "auto" }}>
            {filteredDriversActivity.length} driver(s) found
          </Typography>
        </Box>

        {/* Table with fixed height and scroll */}
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: "#374151", backgroundColor: "#f9fafb" }}>Driver</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: "#374151", backgroundColor: "#f9fafb" }}>
                  Buy Qty (KG)
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: "#374151", backgroundColor: "#f9fafb" }}>
                  Buy Amount
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: "#374151", backgroundColor: "#f9fafb" }}>
                  Sell Qty (KG)
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: "#374151", backgroundColor: "#f9fafb" }}>
                  Sell Amount
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: "#374151", backgroundColor: "#f9fafb" }}>
                  Cash Collected
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: "#374151", backgroundColor: "#f9fafb" }}>
                  UPI Collected
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: "#374151", backgroundColor: "#f9fafb" }}>
                  Weight Loss
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDriversActivity.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: "#6b7280" }}>
                    No driver activity for this date
                  </TableCell>
                </TableRow>
              ) : (
                filteredDriversActivity.map((driver) => (
                  <TableRow key={driver.driverId} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Chip label={driver.driverName || "Unknown"} size="small" sx={{ fontWeight: 600, backgroundColor: "#eff6ff", color: "#1d4ed8" }} />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {driver.totalBuyQuantityKg.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#3b82f6" }}>
                        ₹{driver.totalBuyAmount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {driver.totalSellQuantity.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#10b981" }}>
                        ₹{driver.totalSellAmount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#f59e0b" }}>
                        ₹{driver.totalSellCashAmount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#8b5cf6" }}>
                        ₹{driver.totalSellUpiAmount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: driver.totalWeightLoss > 0 ? "#ef4444" : "#6b7280" }}>
                        {driver.totalWeightLoss.toFixed(2)} KG
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Today's Buy & Sell Cards Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "24px",
          marginBottom: "30px",
        }}>
        {/* Today's Buy Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
            padding: "32px",
            borderRadius: "16px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 6px rgba(59, 130, 246, 0.3)",
          }}>
          <div>
            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>Today's Buy (Purchase)</div>
            <div style={{ fontSize: "36px", fontWeight: "800" }}>₹{(stats?.todayBuyTotalAmount || 0).toLocaleString()}</div>
            <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
              <div style={{ fontSize: "13px", opacity: 0.9 }}>
                <span style={{ opacity: 0.7 }}>Qty:</span> {stats?.todayBuy || 0} KG
              </div>
              <div style={{ fontSize: "13px", opacity: 0.9 }}>
                <span style={{ opacity: 0.7 }}>Avg Rate:</span> ₹{stats?.todayBuyAvgRate || 0}/kg
              </div>
            </div>
          </div>
          <div style={{ fontSize: "56px", opacity: 0.3 }}>📥</div>
        </div>

        {/* Today's Sell Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            padding: "32px",
            borderRadius: "16px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 6px rgba(16, 185, 129, 0.3)",
          }}>
          <div>
            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>Today's Sell</div>
            <div style={{ fontSize: "36px", fontWeight: "800" }}>₹{(stats?.todaySellTotalAmount || 0).toLocaleString()}</div>
            <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
              <div style={{ fontSize: "13px", opacity: 0.9 }}>
                <span style={{ opacity: 0.7 }}>Qty:</span> {stats?.todaySell || 0} KG
              </div>
              <div style={{ fontSize: "13px", opacity: 0.9 }}>
                <span style={{ opacity: 0.7 }}>Avg Rate:</span> ₹{(stats?.todaySellAvgRate || 0).toFixed(2)}/kg
              </div>
            </div>
          </div>
          <div style={{ fontSize: "56px", opacity: 0.3 }}>📤</div>
        </div>
      </div>

      {/* Today's Profit/Loss + Payment Received */}
      <div style={{ marginBottom: "30px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
        <div
          style={{
            background: (stats?.todayProfit || 0) >= 0 ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            padding: "32px",
            borderRadius: "16px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: (stats?.todayProfit || 0) >= 0 ? "0 4px 6px rgba(16, 185, 129, 0.3)" : "0 4px 6px rgba(239, 68, 68, 0.3)",
          }}>
          <div>
            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>Today's {(stats?.todayProfit || 0) >= 0 ? "Profit" : "Loss"}</div>
            <div style={{ fontSize: "42px", fontWeight: "800" }}>
              {(stats?.todayProfit || 0) >= 0 ? "+" : ""}₹{Math.abs(stats?.todayProfit || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "8px" }}>
              Sell (₹{(stats?.todaySellTotalAmount || 0).toLocaleString()}) - Buy (₹{(stats?.todayBuyTotalAmount || 0).toLocaleString()})
            </div>
          </div>
          <div style={{ fontSize: "64px", opacity: 0.3 }}>{(stats?.todayProfit || 0) >= 0 ? "📈" : "📉"}</div>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            padding: "32px",
            borderRadius: "16px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 6px rgba(245, 158, 11, 0.3)",
          }}>
          <div>
            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>Payment Received Today</div>
            <div style={{ fontSize: "36px", fontWeight: "800" }}>₹{Number(totalCapital?.todayCash || 0).toLocaleString()}</div>
            <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "8px" }}>Cash received and tracked today</div>
          </div>
          <div style={{ fontSize: "56px", opacity: 0.3 }}>💰</div>
        </div>
      </div>

      {/* Total Amount Due + Total Capital */}
      <div style={{ marginBottom: "30px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)",
            padding: "32px",
            borderRadius: "16px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 6px rgba(6, 182, 212, 0.3)",
          }}>
          <div>
            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>Total Amount Due (Companies)</div>
            <div style={{ fontSize: "36px", fontWeight: "800" }}>₹{Number(stats?.totalCompanyDue || 0).toLocaleString()}</div>
            <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "8px" }}>Total due across companies</div>
          </div>
          <div style={{ fontSize: "56px", opacity: 0.3 }}>🏢</div>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
            padding: "32px",
            borderRadius: "16px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 6px rgba(14, 165, 233, 0.3)",
            position: "relative",
          }}>
          {/* <IconButton
            size="small"
            onClick={handleOpenCapitalEdit}
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.3)" },
            }}>
            <EditIcon sx={{ fontSize: 18, color: "#fff" }} />
          </IconButton> */}
          <div>
            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>Total Capital</div>
            <div style={{ fontSize: "36px", fontWeight: "800" }}>
              ₹{(Number(totalCapital?.totalCash || 0) + Number(stats?.totalBankBalance || 0) + Number(stats?.totalInMarket || 0) - Number(stats?.totalCompanyDue || 0)).toLocaleString()}
            </div>
            <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "8px" }}>Cash + Bank + Market + Advance - Due(On Company)</div>
          </div>
          <div style={{ fontSize: "56px", opacity: 0.3 }}>💼</div>
        </div>
      </div>

      {/* Total Cash, Bank, Market */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "24px",
          marginBottom: "30px",
        }}>
        <div
          style={{
            background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
            padding: "32px",
            borderRadius: "16px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 6px rgba(14, 165, 233, 0.3)",
            position: "relative",
          }}>
          <IconButton
            size="small"
            onClick={handleOpenCapitalEdit}
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.3)" },
            }}>
            <EditIcon sx={{ fontSize: 18, color: "#fff" }} />
          </IconButton>
          <div>
            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>Total Cash</div>
            <div style={{ fontSize: "36px", fontWeight: "800" }}>₹{Number(totalCapital?.totalCash || 0).toLocaleString()}</div>
            <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "8px" }}>Cash available in hand</div>
          </div>
          <div style={{ fontSize: "56px", opacity: 0.3 }}>💵</div>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
            padding: "32px",
            borderRadius: "16px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 6px rgba(59, 130, 246, 0.3)",
          }}>
          <div>
            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>Total Bank Balance</div>
            <div style={{ fontSize: "36px", fontWeight: "800" }}>₹{Number(stats?.totalBankBalance || 0).toLocaleString()}</div>
            <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "8px" }}>Sum of all bank balances</div>
          </div>
          <div style={{ fontSize: "56px", opacity: 0.3 }}>🏦</div>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
            padding: "32px",
            borderRadius: "16px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 6px rgba(249, 115, 22, 0.3)",
          }}>
          <div>
            <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>Total in Market</div>
            <div style={{ fontSize: "36px", fontWeight: "800" }}>₹{Number(stats?.totalInMarket || 0).toLocaleString()}</div>
            <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "8px" }}>Total customer due balance</div>
          </div>
          <div style={{ fontSize: "56px", opacity: 0.3 }}>📌</div>
        </div>
      </div>

      {/* Individual Bank Balances */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "30px" }}>
        {(stats?.banks || []).map((b: any) => (
          <div
            key={b.id}
            style={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              position: "relative",
            }}>
            <IconButton
              size="small"
              onClick={() => handleOpenBankEdit({ id: b.id, name: b.name, balance: b.balance })}
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                "&:hover": { backgroundColor: "rgba(59, 130, 246, 0.2)" },
              }}>
              <EditIcon sx={{ fontSize: 16, color: "#3b82f6" }} />
            </IconButton>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ fontSize: "13px", color: "#6b7280", fontWeight: "700" }}>{b.name}</div>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontSize: "12px",
                  fontWeight: "800",
                }}>
                {b.label}
              </span>
            </div>
            <div style={{ marginTop: "6px", fontSize: "20px", fontWeight: "900", color: "#111827" }}>₹{Number(b.balance || 0).toFixed(2)}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "24px",
          marginBottom: "30px",
        }}>
        <StatCard title="Weight Loss" value={`${stats?.todayWeightLoss || 0} KG`} color="#ef4444" icon="📉" />
        <div
          style={{
            background: "white",
            padding: "28px",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            borderLeft: "5px solid #dc2626",
            minHeight: "120px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500" }}>Weight Loss %</div>
            <span style={{ fontSize: "24px" }}>📊</span>
          </div>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "#111827" }}>{(stats?.totalWeightLossPercentage || 0).toFixed(2)}%</div>
          <div style={{ fontSize: "12px", color: "#9ca3af" }}>Against {stats?.todayBuy || 0} KG bought</div>
        </div>
      </div>

      {/* Expense Summary Section */}
      <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px", color: "#374151" }}>Today's Expenses</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "24px",
          marginBottom: "30px",
        }}>
        <ExpenseCard title="Cash Expenses" value={expenseSummary?.cashTotal || 0} color="#ef4444" bgColor="#fef2f2" icon="💵" />
        <ExpenseCard title="Bank Expenses" value={expenseSummary?.bankTotal || 0} color="#3b82f6" bgColor="#eff6ff" icon="🏦" />
        <ExpenseCard title="Total Expenses" value={expenseSummary?.total || 0} color="#7c3aed" bgColor="#f5f3ff" icon="💸" />
      </div>

      {/* My Udhaar Card */}
      <div
        style={{
          background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
          padding: "32px",
          borderRadius: "16px",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 4px 6px rgba(99, 102, 241, 0.3)",
          marginBottom: "30px",
        }}>
        <div>
          <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" }}>My Udhaar</div>
          <div style={{ fontSize: "36px", fontWeight: "800" }}>₹{totalUdhaar.toLocaleString()}</div>
          <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "8px" }}>Across {totalCompanies} People</div>
        </div>
        <div style={{ fontSize: "56px", opacity: 0.3 }}>💳</div>
      </div>

      {/* Edit Bank Balance Modal */}
      <Dialog open={editBankModalOpen} onClose={() => setEditBankModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Edit Bank Balance</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: "#6b7280" }}>
            Update balance for <strong>{editingBank?.name}</strong>
          </Typography>
          <TextField label="New Balance (₹)" type="number" fullWidth value={editBankBalance} onChange={(e) => setEditBankBalance(e.target.value)} sx={{ mt: 1 }} autoFocus />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditBankModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleUpdateBankBalance} variant="contained" disabled={editBankSubmitting}>
            {editBankSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Total Capital Modal */}
      <Dialog open={editCapitalModalOpen} onClose={() => setEditCapitalModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Adjust Total Cash</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: "#6b7280" }}>
            Enter the amount to add (positive) or subtract (negative) from Total Cash.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Current Total Cash: <strong>₹{Number(totalCapital?.totalCash || 0).toLocaleString()}</strong>
          </Typography>
          <TextField
            label="Adjustment Amount (₹)"
            type="number"
            fullWidth
            value={editCapitalAmount}
            onChange={(e) => setEditCapitalAmount(e.target.value)}
            placeholder="e.g., 5000 or -2000"
            sx={{ mt: 1 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditCapitalModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleUpdateTotalCapital} variant="contained" disabled={editCapitalSubmitting}>
            {editCapitalSubmitting ? "Saving..." : "Apply"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value, color, icon }: { title: string; value: string | number; color: string; icon: string }) {
  return (
    <div
      style={{
        background: "white",
        padding: "28px",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        borderLeft: `5px solid ${color}`,
        minHeight: "120px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500" }}>{title}</div>
        <span style={{ fontSize: "24px" }}>{icon}</span>
      </div>
      <div style={{ fontSize: "32px", fontWeight: "700", color: "#111827" }}>{value}</div>
    </div>
  );
}

function ExpenseCard({ title, value, color, bgColor, icon }: { title: string; value: number; color: string; bgColor: string; icon: string }) {
  return (
    <div
      style={{
        background: bgColor,
        padding: "28px",
        borderRadius: "12px",
        border: `1px solid ${color}20`,
        minHeight: "120px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500" }}>{title}</div>
        <span style={{ fontSize: "24px" }}>{icon}</span>
      </div>
      <div style={{ fontSize: "32px", fontWeight: "700", color }}>₹{value.toLocaleString()}</div>
    </div>
  );
}
