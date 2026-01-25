import { useState, useEffect, type SyntheticEvent } from "react";
import { Modal, Box, Typography, TextField, Button, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, IconButton, styled, Autocomplete } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export interface Bank {
  id: string;
  name: string;
  label: string;
  balance: number;
}

export interface Company {
  id: string;
  name: string;
  amountDue: number;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  balance: number;
}

export type EntityType = "company" | "customer";

export interface PaymentFormData {
  amount: number;
  method: "CASH" | "BANK";
  bankId?: string;
  companyId?: string;
  customerId?: string;
  companyName?: string;
  description?: string;
  date: string;
  entityType: EntityType;
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentFormData) => Promise<void>;
  banks: Bank[];
  companies: Company[];
  customers: Customer[];
  totalCash: number;
}

// Styled components
const ModalContent = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "100%",
  maxWidth: 520,
  backgroundColor: theme.palette.background.paper,
  borderRadius: 12,
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  padding: theme.spacing(4),
  maxHeight: "90vh",
  overflow: "auto",
}));

const ModalHeader = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 24,
});

const StyledTabs = styled(Tabs)({
  marginBottom: 16,
  "& .MuiTabs-indicator": {
    backgroundColor: "#3b82f6",
  },
});

const StyledTab = styled(Tab)({
  textTransform: "none",
  fontWeight: 600,
  fontSize: 14,
  color: "#6b7280",
  "&.Mui-selected": {
    color: "#3b82f6",
  },
});

const MethodButton = styled(Button)<{ selected?: boolean; methodType: "cash" | "bank" }>(({ selected, methodType }) => ({
  flex: 1,
  padding: "14px",
  borderRadius: 8,
  fontWeight: 600,
  textTransform: "none",
  border: selected ? (methodType === "cash" ? "2px solid #f59e0b" : "2px solid #3b82f6") : "1px solid #ddd",
  backgroundColor: selected ? (methodType === "cash" ? "#fef3c7" : "#eff6ff") : "white",
  color: selected ? (methodType === "cash" ? "#92400e" : "#2563eb") : "#374151",
  "&:hover": {
    backgroundColor: selected ? (methodType === "cash" ? "#fef3c7" : "#eff6ff") : "#f9fafb",
  },
}));

const ActionButton = styled(Button)<{ variant?: "contained" | "outlined" }>(({ variant }) => ({
  flex: 1,
  padding: "14px",
  borderRadius: 8,
  fontWeight: 600,
  textTransform: "none",
  ...(variant === "contained"
    ? {
        backgroundColor: "#10b981",
        color: "white",
        "&:hover": {
          backgroundColor: "#059669",
        },
      }
    : {
        backgroundColor: "#e5e7eb",
        color: "#374151",
        "&:hover": {
          backgroundColor: "#d1d5db",
        },
      }),
}));

const AvailableText = styled(Typography)({
  marginTop: 8,
  fontSize: 13,
  color: "#059669",
  fontWeight: 600,
});

export default function PaymentModal({ open, onClose, onSubmit, banks, companies, customers, totalCash }: PaymentModalProps) {
  const [entityType, setEntityType] = useState<EntityType>("company");
  const [method, setMethod] = useState<"CASH" | "BANK">("CASH");
  const [amount, setAmount] = useState("");
  const [bankId, setBankId] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [companyInputValue, setCompanyInputValue] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  // Set default bank when method changes to BANK
  useEffect(() => {
    if (method === "BANK" && !bankId && banks.length > 0) {
      setBankId(banks[0].id);
    }
    if (method === "CASH") {
      setBankId("");
    }
  }, [method, banks, bankId]);

  const resetForm = () => {
    setEntityType("company");
    setMethod("CASH");
    setAmount("");
    setBankId("");
    setSelectedCompany(null);
    setSelectedCustomer(null);
    setCompanyInputValue("");
    setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
  };

  const handleEntityTabChange = (_event: SyntheticEvent, newValue: EntityType) => {
    setEntityType(newValue);
    setSelectedCompany(null);
    setSelectedCustomer(null);
    setCompanyInputValue("");
  };

  const handleSubmit = async () => {
    if (!amount) {
      alert("Please enter amount");
      return;
    }
    const amt = Number(amount);
    if (Number.isNaN(amt) || amt <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    if (method === "BANK" && !bankId) {
      alert("Please select a bank");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        amount: amt,
        method,
        bankId: method === "BANK" ? bankId : undefined,
        companyId: entityType === "company" ? selectedCompany?.id : undefined,
        customerId: entityType === "customer" ? selectedCustomer?.id : undefined,
        companyName: entityType === "company" && !selectedCompany ? companyInputValue : undefined,
        description: description || undefined,
        date,
        entityType,
      });
      onClose();
    } catch (err) {
      alert("Failed to add payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  const selectedBank = banks.find((b) => b.id === bankId);

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalContent>
        <ModalHeader>
          <Typography variant="h6" fontWeight={700}>
            Add Payment
          </Typography>
          <IconButton onClick={handleClose} disabled={submitting} size="small">
            <CloseIcon />
          </IconButton>
        </ModalHeader>

        {/* Payment Method */}
        <Box mb={3}>
          <Typography variant="body2" fontWeight={500} color="text.secondary" mb={1}>
            Payment Method *
          </Typography>
          <Box display="flex" gap={1.5}>
            <MethodButton selected={method === "CASH"} methodType="cash" onClick={() => setMethod("CASH")} fullWidth>
              💵 Cash
            </MethodButton>
            <MethodButton selected={method === "BANK"} methodType="bank" onClick={() => setMethod("BANK")} fullWidth>
              🏦 Bank
            </MethodButton>
          </Box>
          {method === "CASH" && <AvailableText>Available Cash: ₹{totalCash.toLocaleString()}</AvailableText>}
        </Box>

        {/* Bank Selection */}
        {method === "BANK" && (
          <Box mb={3}>
            <FormControl fullWidth>
              <InputLabel>Bank *</InputLabel>
              <Select value={bankId} label="Bank *" onChange={(e) => setBankId(e.target.value)}>
                {banks.map((bank) => (
                  <MenuItem key={bank.id} value={bank.id}>
                    {bank.name} ({bank.label})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedBank && <AvailableText>Available Balance: ₹{Number(selectedBank.balance || 0).toLocaleString()}</AvailableText>}
          </Box>
        )}

        {/* Amount */}
        <Box mb={3}>
          <TextField fullWidth label="Amount (₹) *" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" />
        </Box>

        {/* Entity Type Tabs */}
        <Box mb={3}>
          <Typography variant="body2" fontWeight={500} color="text.secondary" mb={1}>
            Pay To *
          </Typography>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <StyledTabs value={entityType} onChange={handleEntityTabChange}>
              <StyledTab label="Company" value="company" />
              <StyledTab label="Customer" value="customer" />
            </StyledTabs>
          </Box>

          {/* Company Selection */}
          {entityType === "company" && (
            <Box mt={2}>
              <Autocomplete
                freeSolo
                options={companies}
                getOptionLabel={(option) => (typeof option === "string" ? option : option.name)}
                value={selectedCompany}
                onChange={(_event, newValue) => {
                  if (typeof newValue === "string") {
                    setSelectedCompany(null);
                    setCompanyInputValue(newValue);
                  } else {
                    setSelectedCompany(newValue);
                    setCompanyInputValue(newValue?.name || "");
                  }
                }}
                inputValue={companyInputValue}
                onInputChange={(_event, newInputValue) => {
                  setCompanyInputValue(newInputValue);
                }}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Due: ₹{option.amountDue}
                      </Typography>
                    </Box>
                  </li>
                )}
                renderInput={(params) => <TextField {...params} label="Company Name" placeholder="Search or enter company name" />}
              />
            </Box>
          )}

          {/* Customer Selection */}
          {entityType === "customer" && (
            <Box mt={2}>
              <Autocomplete
                options={customers}
                getOptionLabel={(option) => option.name}
                value={selectedCustomer}
                onChange={(_event, newValue) => {
                  setSelectedCustomer(newValue);
                }}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.mobile} • Balance: ₹{option.balance}
                      </Typography>
                    </Box>
                  </li>
                )}
                renderInput={(params) => <TextField {...params} label="Customer" placeholder="Search customer by name" />}
              />
            </Box>
          )}
        </Box>

        {/* Description */}
        <Box mb={3}>
          <TextField fullWidth label="Description" multiline rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
        </Box>

        {/* Date */}
        <Box mb={3}>
          <TextField fullWidth label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Box>

        {/* Actions */}
        <Box display="flex" gap={1.5}>
          <ActionButton variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Adding..." : "Add Payment"}
          </ActionButton>
          <ActionButton onClick={handleClose} disabled={submitting}>
            Cancel
          </ActionButton>
        </Box>
      </ModalContent>
    </Modal>
  );
}
