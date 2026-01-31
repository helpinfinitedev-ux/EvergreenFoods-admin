import { useEffect, useState } from "react";
import { adminAPI, bankAPI, companyAPI, customerAPI } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Box from "@mui/material/Box";
import { TabPanel, a11yProps, StyledTabs, StyledTab, ListContainer, ListItem, ListItemName, ListItemSecondary, ListItemAmount, EmptyState, SearchInput } from "../components/EntityTabs";
import ReceivePaymentModal, { type SelectedEntity, type EntityType, type Bank } from "../components/ReceivePaymentModal";
import { Modal, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, TextField, Button, CircularProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  address?: string | null;
  balance: number;
  updatedAt?: string;
}

interface Company {
  id: string;
  name: string;
  mobile?: string | null;
  address?: string | null;
  amountDue: number;
}

interface Driver {
  id: string;
  name: string;
  mobile: string;
  status: string;
  baseSalary?: number;
}

interface PaymentRecord {
  id: string;
  amount: number;
  method: string;
  date: string;
  description?: string;
  bankId?: string;
}

interface ViewDetailsEntity {
  id: string;
  name: string;
  type: EntityType;
}

export default function PaymentsReceived() {
  const [tabValue, setTabValue] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [totalCash, setTotalCash] = useState(0);

  // View Details Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsEntity, setDetailsEntity] = useState<ViewDetailsEntity | null>(null);
  const [paymentRecords, setPaymentRecords] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsStartDate, setDetailsStartDate] = useState("");
  const [detailsEndDate, setDetailsEndDate] = useState("");
  const [detailsTotal, setDetailsTotal] = useState(0);

  useEffect(() => {
    loadCustomers();
    loadCompanies();
    loadDrivers();
    loadBanks();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await customerAPI.getAll();
      setCustomers(res.data || []);
    } catch (err) {
      console.error("Failed to load customers", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const res = await companyAPI.getAll();
      setCompanies(res.data?.companies || res.data || []);
    } catch (err) {
      console.error("Failed to load companies", err);
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

  const loadBanks = async () => {
    try {
      const res = await bankAPI.getAll();
      setBanks(res.data || []);
    } catch (err) {
      console.error("Failed to load banks", err);
    }
  };

  const loadTotalCash = async () => {
    try {
      const res = await adminAPI.getTotalCapital();
      setTotalCash(Number(res.data?.totalCash || 0));
    } catch (err) {
      console.error("Failed to load total cash", err);
    }
  };

  const openModal = (entity: SelectedEntity) => {
    setSelectedEntity(entity);
    loadTotalCash();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEntity(null);
  };

  const handleCustomerClick = (customer: Customer) => {
    openModal({
      id: customer.id,
      name: customer.name,
      balance: customer.balance,
      type: "customer",
    });
  };

  const handleCompanyClick = (company: Company) => {
    openModal({
      id: company.id,
      name: company.name,
      balance: company.amountDue,
      type: "company",
    });
  };

  const handleDriverClick = (driver: Driver) => {
    openModal({
      id: driver.id,
      name: driver.name,
      balance: 0, // Drivers don't have a due amount
      type: "driver",
    });
  };

  // View Details Modal Functions
  const openDetailsModal = (entity: ViewDetailsEntity) => {
    setDetailsEntity(entity);
    setDetailsStartDate("");
    setDetailsEndDate("");
    setPaymentRecords([]);
    setShowDetailsModal(true);
    loadPaymentRecords(entity.id, entity.type);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setDetailsEntity(null);
    setPaymentRecords([]);
    setDetailsStartDate("");
    setDetailsEndDate("");
  };

  const loadPaymentRecords = async (entityId: string, entityType: EntityType, start?: string, end?: string) => {
    setDetailsLoading(true);
    try {
      const params: { entityType: string; start?: string; end?: string } = { entityType };
      if (start) params.start = new Date(start).toISOString();
      if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        params.end = endDate.toISOString();
      }
      const res = await adminAPI.getPaymentsReceived(entityId, params);
      setPaymentRecords(res.data?.rows || []);
      setDetailsTotal(res.data?.total || 0);
    } catch (err) {
      console.error("Failed to load payment records", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDetailsDateFilter = () => {
    if (detailsEntity) {
      loadPaymentRecords(detailsEntity.id, detailsEntity.type, detailsStartDate, detailsEndDate);
    }
  };

  const clearDetailsDateFilter = () => {
    setDetailsStartDate("");
    setDetailsEndDate("");
    if (detailsEntity) {
      loadPaymentRecords(detailsEntity.id, detailsEntity.type);
    }
  };

  const formatPaymentDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  console.log(detailsEntity);
  const handlePaymentSubmit = async (data: { entityId: string; entityType: EntityType; amount: number; method: "CASH" | "BANK"; bankId?: string }) => {
    // Call appropriate API based on entity type
    console.log(data);
    switch (data.entityType) {
      case "customer":
        await adminAPI.receiveCustomerPayment({
          customerId: data.entityId,
          amount: data.amount,
          method: data.method,
          bankId: data.bankId,
        });
        loadCustomers();
        break;
      case "company":
        // TODO: Add company payment API when available
        await adminAPI.receiveCustomerPayment({
          companyId: data.entityId,
          amount: data.amount,
          method: data.method,
          bankId: data.bankId,
        });
        loadCompanies();
        break;
      case "driver":
        // TODO: Add driver payment API when available
        await adminAPI.receiveCustomerPayment({
          driverId: data.entityId,
          amount: data.amount,
          method: data.method,
          bankId: data.bankId,
        });
        loadDrivers();
        break;
    }
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

      const periodText = "Report Generated: " + new Date().toLocaleDateString("en-IN");

      doc.setFontSize(10);
      doc.text(periodText, 14, 36);

      const headers = ["Customer", "Mobile", "Due Amount", "Last Updated"];
      const rows = customers.map((c) => [c.name, c.mobile, formatMoneyPdf(c.balance), formatDatePdf(c.updatedAt)]);

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

  const filteredCustomers = customers.filter((c) => {
    const query = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(query) || c.mobile.includes(query);
  });

  const filteredCompanies = companies.filter((c) => {
    const query = companySearch.toLowerCase();
    return c.name.toLowerCase().includes(query) || (c.mobile && c.mobile.includes(query));
  });

  const filteredDrivers = drivers.filter((d) => {
    const query = driverSearch.toLowerCase();
    return d.name.toLowerCase().includes(query) || d.mobile.includes(query);
  });

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Loading...</div>;

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

      {/* Tabs */}
      <Box sx={{ width: "100%", mb: 3 }}>
        <StyledTabs value={tabValue} onChange={handleTabChange} aria-label="entity tabs">
          <StyledTab label="Companies" {...a11yProps(0)} />
          <StyledTab label="Customers" {...a11yProps(1)} />
          <StyledTab label="Drivers" {...a11yProps(2)} />
        </StyledTabs>

        {/* Companies Tab */}
        <TabPanel value={tabValue} index={0}>
          <SearchInput type="text" placeholder="Search companies by name or mobile..." value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} />
          <ListContainer>
            {filteredCompanies.length === 0 ? (
              <EmptyState>No companies found</EmptyState>
            ) : (
              filteredCompanies.map((company) => (
                <ListItem key={company.id} sx={{ cursor: "pointer" }}>
                  <Box onClick={() => handleCompanyClick(company)} sx={{ flex: 1 }}>
                    <ListItemName>{company.name}</ListItemName>
                    {company.mobile && <ListItemSecondary>• {company.mobile}</ListItemSecondary>}
                    {company.address && <ListItemSecondary>• {company.address}</ListItemSecondary>}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetailsModal({ id: company.id, name: company.name, type: "company" });
                      }}
                      sx={{ textTransform: "none", borderColor: "#3b82f6", color: "#3b82f6", "&:hover": { borderColor: "#2563eb", backgroundColor: "#eff6ff" } }}>
                      View Details
                    </Button>
                    <ListItemAmount positive={Number(company.amountDue) <= 0} onClick={() => handleCompanyClick(company)}>
                      ₹{Number(company.amountDue || 0).toLocaleString()}
                    </ListItemAmount>
                  </Box>
                </ListItem>
              ))
            )}
          </ListContainer>
        </TabPanel>

        {/* Customers Tab */}
        <TabPanel value={tabValue} index={1}>
          <SearchInput type="text" placeholder="Search customers by name or mobile..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <ListContainer>
            {filteredCustomers.length === 0 ? (
              <EmptyState>No customers found</EmptyState>
            ) : (
              filteredCustomers.map((customer) => (
                <ListItem key={customer.id} sx={{ cursor: "pointer" }}>
                  <Box onClick={() => handleCustomerClick(customer)} sx={{ flex: 1 }}>
                    <ListItemName>{customer.name}</ListItemName>
                    <ListItemSecondary>• {customer.mobile}</ListItemSecondary>
                    {customer.address && <ListItemSecondary>• {customer.address}</ListItemSecondary>}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetailsModal({ id: customer.id, name: customer.name, type: "customer" });
                      }}
                      sx={{ textTransform: "none", borderColor: "#3b82f6", color: "#3b82f6", "&:hover": { borderColor: "#2563eb", backgroundColor: "#eff6ff" } }}>
                      View Details
                    </Button>
                    <ListItemAmount positive={Number(customer.balance) <= 0} onClick={() => handleCustomerClick(customer)}>
                      ₹{Number(customer.balance || 0).toLocaleString()}
                    </ListItemAmount>
                  </Box>
                </ListItem>
              ))
            )}
          </ListContainer>
        </TabPanel>

        {/* Drivers Tab */}
        <TabPanel value={tabValue} index={2}>
          <SearchInput type="text" placeholder="Search drivers by name or mobile..." value={driverSearch} onChange={(e) => setDriverSearch(e.target.value)} />
          <ListContainer>
            {filteredDrivers.length === 0 ? (
              <EmptyState>No drivers found</EmptyState>
            ) : (
              filteredDrivers.map((driver) => (
                <ListItem key={driver.id} sx={{ cursor: "pointer" }}>
                  <Box onClick={() => handleDriverClick(driver)} sx={{ flex: 1 }}>
                    <ListItemName>{driver.name}</ListItemName>
                    <ListItemSecondary>• {driver.mobile}</ListItemSecondary>
                    <ListItemSecondary>
                      • <span style={{ color: driver.status === "ACTIVE" ? "#10b981" : "#ef4444", fontWeight: 600 }}>{driver.status}</span>
                    </ListItemSecondary>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetailsModal({ id: driver.id, name: driver.name, type: "driver" });
                      }}
                      sx={{ textTransform: "none", borderColor: "#3b82f6", color: "#3b82f6", "&:hover": { borderColor: "#2563eb", backgroundColor: "#eff6ff" } }}>
                      View Details
                    </Button>
                    {driver.baseSalary !== undefined && (
                      <Box sx={{ textAlign: "right" }} onClick={() => handleDriverClick(driver)}>
                        <span style={{ fontSize: "13px", color: "#6b7280" }}>Base Salary</span>
                        <br />
                        <span style={{ fontWeight: 600, color: "#111827" }}>₹{Number(driver.baseSalary || 0).toLocaleString()}</span>
                      </Box>
                    )}
                  </Box>
                </ListItem>
              ))
            )}
          </ListContainer>
        </TabPanel>
      </Box>

      {/* Reusable Payment Modal */}
      <ReceivePaymentModal open={showModal} entity={selectedEntity} banks={banks} totalCash={totalCash} onClose={closeModal} onSubmit={handlePaymentSubmit} />

      {/* View Details Modal */}
      <Modal open={showDetailsModal} onClose={closeDetailsModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90%",
            maxWidth: 800,
            maxHeight: "85vh",
            bgcolor: "background.paper",
            borderRadius: 3,
            boxShadow: 24,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}>
          {/* Modal Header */}
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f9fafb" }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#111827" }}>
                Payment History - {detailsEntity?.name}
              </Typography>
              <Typography variant="body2" sx={{ color: "#6b7280", textTransform: "capitalize" }}>
                {detailsEntity?.type} • {detailsTotal} payment(s) found
              </Typography>
            </Box>
            <IconButton onClick={closeDetailsModal} sx={{ color: "#6b7280" }}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Date Filters */}
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid #e5e7eb", display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
            <TextField
              type="date"
              label="Start Date"
              value={detailsStartDate}
              onChange={(e) => setDetailsStartDate(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ width: 160 }}
            />
            <TextField type="date" label="End Date" value={detailsEndDate} onChange={(e) => setDetailsEndDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
            <Button variant="contained" size="small" onClick={handleDetailsDateFilter} sx={{ textTransform: "none", backgroundColor: "#3b82f6", "&:hover": { backgroundColor: "#2563eb" } }}>
              Apply Filter
            </Button>
            {(detailsStartDate || detailsEndDate) && (
              <Button
                variant="outlined"
                size="small"
                onClick={clearDetailsDateFilter}
                sx={{ textTransform: "none", borderColor: "#ef4444", color: "#ef4444", "&:hover": { borderColor: "#dc2626", backgroundColor: "#fef2f2" } }}>
                Clear
              </Button>
            )}
            {/* Total Amount Summary */}
            <Box sx={{ ml: "auto", textAlign: "right" }}>
              <Typography variant="caption" sx={{ color: "#6b7280" }}>
                Total Received
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#10b981" }}>
                ₹{paymentRecords.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0).toLocaleString()}
              </Typography>
            </Box>
          </Box>

          {/* Table Content */}
          <Box sx={{ flex: 1, overflow: "auto", maxHeight: 400 }}>
            {detailsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            ) : paymentRecords.length === 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", py: 8 }}>
                <Typography variant="h4" sx={{ mb: 1 }}>
                  💳
                </Typography>
                <Typography variant="body1" sx={{ color: "#6b7280" }}>
                  No payment records found
                </Typography>
                <Typography variant="body2" sx={{ color: "#9ca3af", mt: 0.5 }}>
                  {detailsStartDate || detailsEndDate ? "Try adjusting the date filter" : "No payments have been received yet"}
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: "#f9fafb" }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: "#f9fafb" }}>Method</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, backgroundColor: "#f9fafb" }}>
                        Amount
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: "#f9fafb" }}>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paymentRecords.map((payment) => (
                      <TableRow key={payment.id} hover>
                        <TableCell>{formatPaymentDate(payment.date)}</TableCell>
                        <TableCell>
                          <Box
                            component="span"
                            sx={{
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 2,
                              fontSize: "12px",
                              fontWeight: 600,
                              backgroundColor: payment?.details.includes("CASH") ? "#fef3c7" : "#dbeafe",
                              color: payment?.details === "CASH" ? "#92400e" : "#1e40af",
                            }}>
                            {payment?.details}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#10b981" }}>
                            ₹{Number(payment?.totalAmount || 0).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: "#6b7280", maxWidth: 200 }}>{payment.details || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          {/* Modal Footer */}
          <Box sx={{ px: 3, py: 2, borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", backgroundColor: "#f9fafb" }}>
            <Button variant="outlined" onClick={closeDetailsModal} sx={{ textTransform: "none" }}>
              Close
            </Button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
}
