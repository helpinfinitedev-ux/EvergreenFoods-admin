import { useEffect, useState } from "react";
import { adminAPI } from "../api";

interface DriverForm {
  name: string;
  mobile: string;
  password: string;
  baseSalary: string;
}

const initialForm: DriverForm = {
  name: "",
  mobile: "",
  password: "",
  baseSalary: "",
};

export default function Drivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<DriverForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      const response = await adminAPI.getDrivers();
      setDrivers(response.data);
    } catch (err) {
      console.error("Failed to load drivers", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    try {
      await adminAPI.updateDriverStatus(id, newStatus);
      loadDrivers();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.mobile.trim() || !form.password.trim()) {
      setError("Name, mobile and password are required");
      return;
    }

    if (form.mobile.length !== 10 || !/^\d+$/.test(form.mobile)) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    if (form.password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setSubmitting(true);
    try {
      await adminAPI.createDriver({
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        password: form.password,
        baseSalary: form.baseSalary ? Number(form.baseSalary) : 0,
      });
      setShowModal(false);
      setForm(initialForm);
      loadDrivers();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create driver");
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(initialForm);
    setError("");
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>;

  return (
    <div style={{ padding: "30px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", margin: 0 }}>Driver Management</h1>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "12px 24px",
            background: "linear-gradient(135deg, #10b981, #059669)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.4)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(16, 185, 129, 0.3)";
          }}>
          <span style={{ fontSize: "18px" }}>+</span>
          Add Driver
        </button>
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
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Salary</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={tdStyle}>{driver.name}</td>
                <td style={tdStyle}>{driver.mobile}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "4px 12px",
                      background: driver.role === "ADMIN" ? "#fef3c7" : "#dbeafe",
                      color: driver.role === "ADMIN" ? "#92400e" : "#1e40af",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "500",
                    }}>
                    {driver.role}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "4px 12px",
                      background: driver.status === "ACTIVE" ? "#d1fae5" : "#fee2e2",
                      color: driver.status === "ACTIVE" ? "#065f46" : "#991b1b",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "500",
                    }}>
                    {driver.status}
                  </span>
                </td>
                <td style={tdStyle}>₹{driver.baseSalary || 0}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => toggleStatus(driver.id, driver.status)}
                    style={{
                      padding: "6px 16px",
                      background: driver.status === "ACTIVE" ? "#ef4444" : "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}>
                    {driver.status === "ACTIVE" ? "Block" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Driver Modal */}
      {showModal && (
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
          onClick={closeModal}>
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "32px",
              width: "100%",
              maxWidth: "440px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            }}
            onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#111827" }}>Add New Driver</h2>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#9ca3af",
                  padding: "4px",
                  lineHeight: 1,
                }}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Full Name *</label>
                <input type="text" name="name" value={form.name} onChange={handleInputChange} placeholder="Enter driver's full name" style={inputStyle} />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Mobile Number *</label>
                <input type="tel" name="mobile" value={form.mobile} onChange={handleInputChange} placeholder="10-digit mobile number" maxLength={10} style={inputStyle} />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Password *</label>
                <input type="password" name="password" value={form.password} onChange={handleInputChange} placeholder="Minimum 4 characters" style={inputStyle} />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={labelStyle}>Base Salary (₹)</label>
                <input type="number" name="baseSalary" value={form.baseSalary} onChange={handleInputChange} placeholder="Enter monthly salary" style={inputStyle} />
              </div>

              {error && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    marginBottom: "20px",
                    fontSize: "14px",
                  }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: "500",
                  }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    background: submitting ? "#9ca3af" : "linear-gradient(135deg, #10b981, #059669)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontSize: "15px",
                    fontWeight: "600",
                  }}>
                  {submitting ? "Creating..." : "Create Driver"}
                </button>
              </div>
            </form>
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

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  fontSize: "14px",
  fontWeight: "500",
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "15px",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
  boxSizing: "border-box",
};
