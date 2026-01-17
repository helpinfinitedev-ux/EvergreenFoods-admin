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
import MoneyLedger from "./pages/MoneyLedger";
import Payments from "./pages/Payments";
import PaymentsReceived from "./pages/PaymentsReceived";
import MyUdhaar from "./pages/MyUdhaar";
import Companies from "./pages/Companies";

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
    <div style={{ display: "flex", height: "100vh", background: "#f3f4f6" }}>
      {/* Sidebar */}
      <div
        style={{
          width: "250px",
          background: "#1f2937",
          color: "white",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "auto",
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
          <NavItem active={location.pathname === "/payments"} onClick={() => navigate("/payments")}>
            💳 Payments To Companies
          </NavItem>
          <NavItem active={location.pathname === "/companies"} onClick={() => navigate("/companies")}>
            🏢 My Companies
          </NavItem>
          <NavItem active={location.pathname === "/payments-received"} onClick={() => navigate("/payments-received")}>
            ✅ Payments Received
          </NavItem>
          <NavItem active={location.pathname === "/my-udhaar"} onClick={() => navigate("/my-udhaar")}>
            📒 My Udhaar
          </NavItem>
          <NavItem active={location.pathname === "/money-ledger"} onClick={() => navigate("/money-ledger")}>
            💳 Money Ledger
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
      <div style={{ flex: 1, height: "auto", overflow: "auto" }}>
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
          <Route path="/payments" element={<Payments />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/payments-received" element={<PaymentsReceived />} />
          <Route path="/my-udhaar" element={<MyUdhaar />} />
          <Route path="/money-ledger" element={<MoneyLedger />} />
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
        padding: "6px 8px",
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
