import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Drivers from "./pages/Drivers";
import Vehicles from "./pages/Vehicles";
import Customers from "./pages/Customers";
import Transactions from "./pages/Transactions";
import Bought from "./pages/Bought";
import Sold from "./pages/Sold";
import Expenses from "./pages/Expenses";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

function ProtectedLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/login");
  };

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f3f4f6" }}>
      {/* Sidebar */}
      <div
        style={{
          width: "250px",
          background: "#1f2937",
          color: "white",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
        }}>
        <h2 style={{ marginBottom: "30px", fontSize: "20px", fontWeight: "700" }}>Admin Panel</h2>

        <nav style={{ flex: 1 }}>
          <NavItem active={location.pathname === "/" || location.pathname === "/dashboard"} onClick={() => navigate("/dashboard")}>
            📊 Dashboard
          </NavItem>
          <NavItem active={location.pathname === "/drivers"} onClick={() => navigate("/drivers")}>
            👥 Drivers
          </NavItem>
          <NavItem active={location.pathname === "/vehicles"} onClick={() => navigate("/vehicles")}>
            🚛 Vehicles
          </NavItem>
          <NavItem active={location.pathname === "/customers"} onClick={() => navigate("/customers")}>
            💰 Customers
          </NavItem>

          <NavItem active={location.pathname === "/bought"} onClick={() => navigate("/bought")}>
            🛒 Bought
          </NavItem>
          <NavItem active={location.pathname === "/sold"} onClick={() => navigate("/sold")}>
            💰 Sold
          </NavItem>
          <NavItem active={location.pathname === "/transactions"} onClick={() => navigate("/transactions")}>
            📝 Transactions
          </NavItem>
          <NavItem active={location.pathname === "/expenses"} onClick={() => navigate("/expenses")}>
            💸 Expenses
          </NavItem>
        </nav>

        <div style={{ marginTop: "auto" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "12px",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "500",
            }}>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/bought" element={<Bought />} />
          <Route path="/sold" element={<Sold />} />
          <Route path="/expenses" element={<Expenses />} />
        </Routes>
      </div>
    </div>
  );
}

function NavItem({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "12px 16px",
        marginBottom: "8px",
        background: active ? "#374151" : "transparent",
        borderRadius: "6px",
        cursor: "pointer",
        transition: "background 0.2s",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "#374151";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}>
      {children}
    </div>
  );
}

export default App;
