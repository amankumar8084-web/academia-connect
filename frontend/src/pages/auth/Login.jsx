import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      login(data);
      toast.success("Login successful!");
      const role = data.role;
      const roleRoutes = {
        "super-admin": "/dashboard/admin",
        "admin": "/dashboard/faculty",
        "student": "/dashboard/student"
      };
      navigate(roleRoutes[role] || "/dashboard/student");
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      {/* Navbar */}
      <nav className="login-navbar">
        <div className="login-navbar-inner">
          <a className="login-navbar-logo" href="/">
            <div className="login-navbar-logo-icon">
              <i className="fas fa-map"></i>
            </div>
            <div className="login-navbar-logo-text">
              <span className="login-navbar-logo-main">
                Project<span className="login-navbar-logo-accent">Mayaa</span>
              </span>
              <span className="login-navbar-logo-tagline">
                Engineering • Business • Innovation
              </span>
            </div>
          </a>
        </div>
      </nav>

      {/* Login Card */}
      <div className="login-container">
        <div className="login-card">
          <div className="login-card-header">
            <h1 className="login-card-title">Access Your Dashboard</h1>
            <p className="login-card-subtitle">Project Mayaa · Secure Engineering Portal</p>
          </div>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <label className="login-label" htmlFor="login-email">Email</label>
            <div className="login-input-group">
              <span className="material-symbols-outlined login-input-icon">mail</span>
              <input
                type="email"
                id="login-email"
                className="login-input-field"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <label className="login-label" htmlFor="login-password">Password</label>
            <div className="login-input-group">
              <span className="material-symbols-outlined login-input-icon">lock</span>
              <input
                type={showPassword ? "text" : "password"}
                id="login-password"
                className="login-input-field"
                placeholder="• • • • • • • •"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>

            {/* Forgot password */}
            <div className="login-helper-row">
              <button type="button" className="login-helper-link">Forgot password?</button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="login-spinner"></span>
                  Signing in…
                </>
              ) : "Log in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}