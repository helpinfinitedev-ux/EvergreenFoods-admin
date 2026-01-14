import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../api";

export default function Login() {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"password" | "otp">("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (step === "password") {
        const response = await authAPI.login(mobile, password);

        if (response.data.requiresOtp) {
          setStep("otp");
          return;
        }

        if (response.data.token) {
          localStorage.setItem("admin_token", response.data.token);
          navigate("/dashboard");
        }
      } else {
        const response = await authAPI.verifyOtp(mobile, otp);
        if (response.data.token) {
          localStorage.setItem("admin_token", response.data.token);
          navigate("/dashboard");
        }
      }
    } catch (err: any) {
      console.log(err);
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}>
      <div
        style={{
          background: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          width: "100%",
          maxWidth: "400px",
        }}>
        <h1 style={{ marginBottom: "30px", textAlign: "center", color: "#333" }}>Admin Panel</h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Mobile Number</label>
            <input
              type="number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "16px",
              }}
              required
              disabled={step === "otp"}
            />
          </div>

          {step === "password" ? (
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "16px",
                }}
                required
              />
            </div>
          ) : (
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>OTP</label>
              <input
                type="number"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "16px",
                  letterSpacing: "2px",
                }}
                placeholder="Enter 6-digit OTP"
                required
              />
              <div style={{ marginTop: "10px", fontSize: "13px", color: "#6b7280" }}>OTP has been sent to configured email.</div>
              <button
                type="button"
                onClick={() => {
                  setStep("password");
                  setOtp("");
                  setError("");
                }}
                style={{
                  marginTop: "12px",
                  background: "none",
                  border: "none",
                  color: "#667eea",
                  cursor: "pointer",
                  fontWeight: 600,
                  padding: 0,
                }}>
                ← Back
              </button>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "12px",
                background: "#fee",
                color: "#c33",
                borderRadius: "6px",
                marginBottom: "20px",
              }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: loading ? "#999" : "#667eea",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
            }}>
            {loading ? (step === "otp" ? "Verifying..." : "Logging in...") : step === "otp" ? "Verify OTP" : "Login"}
          </button>
        </form>

        <div style={{ marginTop: "20px", padding: "12px", background: "#f0f9ff", borderRadius: "6px", fontSize: "13px" }}>
          <strong>Demo Credentials:</strong>
          <br />
          Mobile: 9999999999
          <br />
          Password: admin123
        </div>
      </div>
    </div>
  );
}
