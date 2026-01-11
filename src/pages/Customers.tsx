import { useEffect, useState } from "react";
import { customerAPI, adminAPI, notificationAPI } from "../api";

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteType, setNoteType] = useState<"DEBIT_NOTE" | "CREDIT_NOTE">("DEBIT_NOTE");
  const [noteAmount, setNoteAmount] = useState("");
  const [noteReason, setNoteReason] = useState("");

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await customerAPI.getAll();
      setCustomers(response.data);
    } catch (err) {
      console.error("Failed to load customers", err);
    }
  };

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
        reason: noteReason,
      });

      // Create notification for debit/credit
      const noteTypeLabel = noteType === "DEBIT_NOTE" ? "Debit" : "Credit";
      const notificationMessage = `${noteTypeLabel} of ₹${parseFloat(noteAmount).toFixed(2)} done on ${selectedCustomer.name}`;
      await notificationAPI.create(notificationMessage);

      alert("Note created successfully");
      setShowNoteModal(false);
      setNoteAmount("");
      setNoteReason("");
      loadCustomers();
    } catch (err) {
      alert("Failed to create note");
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <h1 style={{ marginBottom: "30px", fontSize: "28px", fontWeight: "700" }}>Udhaar Balance</h1>

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
            {customers.map((customer) => (
              <tr key={customer.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={tdStyle}>{customer.name}</td>
                <td style={tdStyle}>{customer.mobile}</td>
                <td style={tdStyle}>{customer.address || "-"}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      color: Number(customer.balance) > 0 ? "#dc2626" : "#059669",
                      fontWeight: "600",
                    }}>
                    ₹{Number(customer.balance).toFixed(2)}
                  </span>
                </td>
                <td style={tdStyle}>
                  <button
                    onClick={() => {
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
                    onClick={() => {
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
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Amount (₹)</label>
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
