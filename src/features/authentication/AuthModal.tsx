import React, { useState } from "react";
import { X, Lock, Mail, User, Building, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";

export function AuthModal() {
  const { authModalOpen, closeAuthModal, authMode, setAuthMode, login, register, isLoading } = useAuth();
  const { notify } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (authMode === "login") {
        await login(email, password);
        notify("Logged in successfully");
      } else {
        await register({ firstName, lastName, email, password, organizationName });
        notify("Account and organization provisioned successfully!");
      }
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr?.message || "Authentication failed. Please check your credentials.");
    }
  };

  return (
    <div className="modal-backdrop" onClick={closeAuthModal}>
      <div className="modal-card auth-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div>
            <h3>{authMode === "login" ? "Sign In to Studio" : "Create Studio Account"}</h3>
            <p className="modal-desc">
              {authMode === "login"
                ? "Enter your credentials to access your workspaces."
                : "Register your account and provision your organization."}
            </p>
          </div>
          <button className="icon-button" onClick={closeAuthModal} aria-label="Close modal" type="button">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ margin: "12px 20px", padding: "10px 14px", backgroundColor: "#FEF2F2", color: "#B91C1C", borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: "0 20px 20px 20px" }}>
          {authMode === "register" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>First Name</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      className="input"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jane"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Last Name</label>
                  <input
                    type="text"
                    className="input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Organization Name</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="text"
                    className="input"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Acme Academy (Optional)"
                  />
                </div>
              </div>
            </>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Email Address</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
            {authMode === "register" && (
              <span style={{ fontSize: 11, color: "#6B7280", marginTop: 4, display: "block" }}>
                Min 8 characters with at least one uppercase, lowercase, and number.
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ width: "100%", justifyContent: "center", padding: "10px 16px", marginTop: 8 }}
          >
            {isLoading ? "Processing…" : authMode === "login" ? "Sign In" : "Register & Provision Organization"}
            <ArrowRight size={16} />
          </button>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#6B7280" }}>
            {authMode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setError(null); setAuthMode("register"); }}
                  style={{ color: "var(--brand-primary, #6366F1)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
                >
                  Create one now
                </button>
              </>
            ) : (
              <>
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => { setError(null); setAuthMode("login"); }}
                  style={{ color: "var(--brand-primary, #6366F1)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
