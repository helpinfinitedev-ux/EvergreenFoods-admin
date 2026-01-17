import { useEffect, useState } from "react";
import { vehicleAPI } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface VehicleForm {
  registration: string;
  currentKm: string;
  status: string;
}

interface Vehicle {
  id: string;
  registration: string;
  currentKm: number;
  status: string;
  imageUrl?: string;
  createdAt: string;
  drivers?: { id: string; name: string }[];
}

const initialForm: VehicleForm = {
  registration: "",
  currentKm: "",
  status: "ACTIVE",
};

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<VehicleForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const response = await vehicleAPI.getAll();
      setVehicles(response.data);
    } catch (err) {
      console.error("Failed to load vehicles", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.registration.trim()) {
      setError("Registration number is required");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await vehicleAPI.update(editingId, {
          registration: form.registration.trim().toUpperCase(),
          currentKm: form.currentKm ? Number(form.currentKm) : 0,
          status: form.status,
        });
      } else {
        await vehicleAPI.create({
          registration: form.registration.trim().toUpperCase(),
          currentKm: form.currentKm ? Number(form.currentKm) : 0,
          status: form.status,
        });
      }
      setShowModal(false);
      setForm(initialForm);
      setEditingId(null);
      loadVehicles();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save vehicle");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await vehicleAPI.delete(id);
      setDeleteConfirm(null);
      loadVehicles();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete vehicle");
      setDeleteConfirm(null);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setForm({
      registration: vehicle.registration,
      currentKm: String(vehicle.currentKm),
      status: vehicle.status,
    });
    setEditingId(vehicle.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(initialForm);
    setEditingId(null);
    setError("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return { bg: "#d1fae5", color: "#065f46" };
      case "MAINTENANCE":
        return { bg: "#fef3c7", color: "#92400e" };
      case "INACTIVE":
        return { bg: "#fee2e2", color: "#991b1b" };
      default:
        return { bg: "#e5e7eb", color: "#374151" };
    }
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>;

  const generateVehiclesPdf = () => {
    if (vehicles.length === 0) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Evergreen Foods", pageWidth / 2, 18, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Vehicles Report", pageWidth / 2, 26, { align: "center" });

    const headers = ["Registration", "Current KM", "Status", "Drivers"];
    const rows = vehicles.map((v) => [v.registration, String(v.currentKm || 0), v.status, v.drivers && v.drivers.length > 0 ? v.drivers.map((d) => d.name).join(", ") : "-"]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 36,
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
        1: { cellWidth: 24 },
        2: { cellWidth: 22 },
        3: { cellWidth: "auto" },
      },
      tableWidth: "auto",
      margin: { left: 14, right: 14 },
    });

    const fileName = "vehicles_" + new Date().toISOString().split("T")[0] + ".pdf";
    doc.save(fileName);
  };

  return (
    <div style={{ padding: "30px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", margin: 0 }}>Vehicle Management</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={generateVehiclesPdf}
            disabled={vehicles.length === 0}
            style={{
              padding: "10px 16px",
              background: vehicles.length === 0 ? "#e5e7eb" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
              color: vehicles.length === 0 ? "#9ca3af" : "white",
              border: "none",
              borderRadius: "8px",
              cursor: vehicles.length === 0 ? "not-allowed" : "pointer",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: vehicles.length === 0 ? "none" : "0 2px 8px rgba(139, 92, 246, 0.3)",
            }}>
            <span style={{ fontSize: "16px" }}>📄</span>
            Download PDF
          </button>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: "12px 24px",
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.4)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(59, 130, 246, 0.3)";
            }}>
            <span style={{ fontSize: "18px" }}>+</span>
            Add Vehicle
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search by registration or driver name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "15px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            outline: "none",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        />
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
              <th style={thStyle}>Registration</th>
              <th style={thStyle}>Current KM</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Last Fuel Slip</th>
              <th style={thStyle}>Assigned Drivers</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.filter((v) => {
              const query = searchQuery.toLowerCase();
              const matchesRegistration = v.registration.toLowerCase().includes(query);
              const matchesDriver = v.drivers?.some((d) => d.name.toLowerCase().includes(query));
              return matchesRegistration || matchesDriver;
            }).length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: "center", padding: "40px" }}>
                  {searchQuery ? "No vehicles found matching your search." : "No vehicles found. Add your first vehicle!"}
                </td>
              </tr>
            ) : (
              vehicles
                .filter((v) => {
                  const query = searchQuery.toLowerCase();
                  const matchesRegistration = v.registration.toLowerCase().includes(query);
                  const matchesDriver = v.drivers?.some((d) => d.name.toLowerCase().includes(query));
                  return matchesRegistration || matchesDriver;
                })
                .map((vehicle) => {
                  const statusColors = getStatusColor(vehicle.status);
                  return (
                    <tr key={vehicle.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: "600", color: "#111827" }}>{vehicle.registration}</span>
                      </td>
                      <td style={tdStyle}>{vehicle.currentKm.toLocaleString()} km</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: "4px 12px",
                            background: statusColors.bg,
                            color: statusColors.color,
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "500",
                          }}>
                          {vehicle.status}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {vehicle.imageUrl ? (
                          <img
                            src={vehicle.imageUrl}
                            alt="Last fuel slip"
                            style={{
                              width: "60px",
                              height: "60px",
                              objectFit: "cover",
                              borderRadius: "8px",
                              cursor: "pointer",
                              border: "1px solid #e5e7eb",
                            }}
                            onClick={() => window.open(vehicle.imageUrl, "_blank")}
                            title="Click to view full image"
                          />
                        ) : (
                          <span style={{ color: "#9ca3af", fontSize: "13px" }}>No image</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {vehicle.drivers && vehicle.drivers.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {vehicle.drivers.map((d) => (
                              <span
                                key={d.id}
                                style={{
                                  padding: "2px 8px",
                                  background: "#dbeafe",
                                  color: "#1e40af",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                }}>
                                {d.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "#9ca3af", fontSize: "13px" }}>None assigned</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {deleteConfirm === vehicle.id ? (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => handleDelete(vehicle.id)}
                              style={{
                                padding: "6px 12px",
                                background: "#ef4444",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "13px",
                              }}>
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              style={{
                                padding: "6px 12px",
                                background: "#e5e7eb",
                                color: "#374151",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "13px",
                              }}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => handleEdit(vehicle)}
                              style={{
                                padding: "6px 16px",
                                background: "#dbeafe",
                                color: "#2563eb",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: "500",
                              }}>
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(vehicle.id)}
                              style={{
                                padding: "6px 16px",
                                background: "#fee2e2",
                                color: "#dc2626",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: "500",
                              }}>
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Vehicle Modal */}
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
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#111827" }}>{editingId ? "Edit Vehicle" : "Add New Vehicle"}</h2>
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
                <label style={labelStyle}>Registration Number *</label>
                <input type="text" name="registration" value={form.registration} onChange={handleInputChange} placeholder="e.g. MH12AB1234" style={inputStyle} />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Current KM Reading</label>
                <input type="number" name="currentKm" value={form.currentKm} onChange={handleInputChange} placeholder="Enter odometer reading" style={inputStyle} />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={labelStyle}>Status</label>
                <select name="status" value={form.status} onChange={handleInputChange} style={inputStyle}>
                  <option value="ACTIVE">Active</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
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
                    background: submitting ? "#9ca3af" : "linear-gradient(135deg, #3b82f6, #2563eb)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontSize: "15px",
                    fontWeight: "600",
                  }}>
                  {submitting ? "Saving..." : editingId ? "Update Vehicle" : "Create Vehicle"}
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
