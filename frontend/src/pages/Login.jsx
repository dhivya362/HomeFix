
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import "../styles/Auth.css";

const LOGIN_API = "http://127.0.0.1:8000/api/accounts/login/";

function Login() {
  const [role, setRole] = useState("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleLogin(event) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(LOGIN_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          role,
        }),
      });

      // Handle JSON and non-JSON responses safely.
      const responseText = await response.text();
      let data = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(
            `Invalid server response (HTTP ${response.status}).`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.error ||
            data.message ||
            "Login failed. Please check your email and password."
        );
      }

      // Support common token response formats.
      const token =
        data.token ||
        data.key ||
        data.auth_token;

      if (!token) {
        console.error("Login response does not contain a token:", data);

        throw new Error(
          "Login API token return pannala. Backend login view-la token generation check pannunga."
        );
      }

      // Save token for authenticated API requests.
      localStorage.setItem("token", token);

      // Save user details if returned by backend.
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        localStorage.removeItem("user");
      }

      // Save selected role.
      localStorage.setItem("role", role);

      setMessage("Login successful!");

      // Redirect according to selected role.
      switch (role) {
        case "customer":
          navigate("/dashboard", { replace: true });
          break;

        case "technician":
          navigate("/technician-dashboard", { replace: true });
          break;

        case "admin":
          navigate("/admin-dashboard", { replace: true });
          break;

        default:
          navigate("/", { replace: true });
      }
    } catch (error) {
      console.error("Login error:", error);

      setMessage(
        error.message || "Unable to connect to the login server."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          HomeFix
        </Link>

        <h1>Welcome Back!</h1>

        <p>Login to continue to your HomeFix account.</p>

        {message && (
          <p
            role="alert"
            aria-live="polite"
            className="auth-message"
          >
            {message}
          </p>
        )}

        <form onSubmit={handleLogin}>
          <label htmlFor="role">Login as</label>

          <select
            id="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            disabled={loading}
          >
            <option value="customer">Customer</option>
            <option value="technician">Technician</option>
            <option value="admin">Admin</option>
          </select>

          <label htmlFor="email">Email Address</label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            required
            disabled={loading}
          />

          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            disabled={loading}
          />

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Sign Up</Link>
        </p>

        <Link to="/" className="back-home">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

export default Login;
