import { useState, useEffect } from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";

export type EntityType = "customer" | "company" | "driver";

export interface SelectedEntity {
  id: string;
  name: string;
  balance: number; // For customers this is balance, for companies this is amountDue
  type: EntityType;
}

export interface Bank {
  id: string;
  name: string;
  label: string;
  balance: number;
}

interface ReceivePaymentModalProps {
  open: boolean;
  entity: SelectedEntity | null;
  banks: Bank[];
  totalCash: number;
  onClose: () => void;
  onSubmit: (data: { entityId: string; entityType: EntityType; amount: number; method: "CASH" | "BANK"; bankId?: string }) => Promise<void>;
}

const ModalOverlay = styled(Box)({
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
});

const ModalContent = styled(Box)({
  background: "white",
  padding: "30px",
  borderRadius: "12px",
  width: "100%",
  maxWidth: "520px",
});

const ModalTitle = styled("h2")({
  marginBottom: "8px",
  fontSize: "20px",
  fontWeight: 700,
});

const ModalSubtitle = styled("div")({
  marginBottom: "20px",
  color: "#6b7280",
  fontSize: "13px",
});

const Label = styled("label")({
  display: "block",
  marginBottom: "8px",
  fontWeight: 500,
  color: "#374151",
  fontSize: "14px",
});

const Input = styled("input")({
  width: "100%",
  padding: "12px",
  border: "1px solid #ddd",
  borderRadius: "8px",
  fontSize: "14px",
  boxSizing: "border-box",
});

const Select = styled("select")({
  width: "100%",
  padding: "12px",
  border: "1px solid #ddd",
  borderRadius: "8px",
  fontSize: "14px",
  boxSizing: "border-box",
});

const MethodButton = styled("button")<{ active?: boolean; variant?: "cash" | "bank" }>(({ active, variant }) => ({
  flex: 1,
  padding: "14px",
  border: active ? (variant === "cash" ? "2px solid #f59e0b" : "2px solid #3b82f6") : "1px solid #ddd",
  borderRadius: "8px",
  background: active ? (variant === "cash" ? "#fef3c7" : "#eff6ff") : "white",
  cursor: "pointer",
  fontWeight: 600,
  color: active ? (variant === "cash" ? "#92400e" : "#2563eb") : "#374151",
}));

const ActionButton = styled("button")<{ variant?: "primary" | "secondary" }>(({ variant }) => ({
  flex: 1,
  padding: "14px",
  background: variant === "primary" ? "#10b981" : "#e5e7eb",
  color: variant === "primary" ? "white" : "#374151",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "14px",
}));

const AvailableBalance = styled("div")({
  marginTop: "8px",
  fontSize: "13px",
  color: "#059669",
  fontWeight: 600,
});

const getEntityLabel = (type: EntityType): string => {
  switch (type) {
    case "customer":
      return "Customer";
    case "company":
      return "Company";
    case "driver":
      return "Driver";
    default:
      return "Entity";
  }
};

export default function ReceivePaymentModal({ open, entity, banks, totalCash, onClose, onSubmit }: ReceivePaymentModalProps) {
  const [method, setMethod] = useState<"CASH" | "BANK">("CASH");
  const [amount, setAmount] = useState("");
  const [bankId, setBankId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMethod("CASH");
      setAmount("");
      setBankId(banks[0]?.id || "");
    }
  }, [open, banks]);

  useEffect(() => {
    if (method === "BANK" && !bankId) {
      setBankId(banks[0]?.id || "");
    }
    if (method === "CASH" && bankId) {
      setBankId("");
    }
  }, [method, banks, bankId]);

  if (!open || !entity) return null;

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!amount || Number.isNaN(amt) || amt <= 0) {
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
        entityId: entity.id,
        entityType: entity.type,
        amount: amt,
        method,
        bankId: method === "BANK" ? bankId : undefined,
      });
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to receive payment");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBank = banks.find((b) => b.id === bankId);

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalTitle>Receive Payment</ModalTitle>
        <ModalSubtitle>
          {getEntityLabel(entity.type)}: {entity.name} • Due ₹{Number(entity.balance).toLocaleString()}
        </ModalSubtitle>

        <Box sx={{ mb: "20px" }}>
          <Label>Method *</Label>
          <Box sx={{ display: "flex", gap: "12px" }}>
            <MethodButton active={method === "CASH"} variant="cash" onClick={() => setMethod("CASH")}>
              💵 Cash
            </MethodButton>
            <MethodButton active={method === "BANK"} variant="bank" onClick={() => setMethod("BANK")}>
              🏦 Bank
            </MethodButton>
          </Box>
          {method === "CASH" && <AvailableBalance>Available Cash: ₹{totalCash.toLocaleString()}</AvailableBalance>}
        </Box>

        {method === "BANK" && (
          <Box sx={{ mb: "20px" }}>
            <Label>Bank *</Label>
            <Select value={bankId} onChange={(e) => setBankId(e.target.value)}>
              {banks.length === 0 ? (
                <option value="">No banks available</option>
              ) : (
                banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name} ({bank.label})
                  </option>
                ))
              )}
            </Select>
            {selectedBank && <AvailableBalance>Available Balance: ₹{Number(selectedBank.balance || 0).toLocaleString()}</AvailableBalance>}
          </Box>
        )}

        <Box sx={{ mb: "24px" }}>
          <Label>Amount (₹) *</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" />
        </Box>

        <Box sx={{ display: "flex", gap: "12px" }}>
          <ActionButton variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Processing..." : "Receive"}
          </ActionButton>
          <ActionButton variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </ActionButton>
        </Box>
      </ModalContent>
    </ModalOverlay>
  );
}
