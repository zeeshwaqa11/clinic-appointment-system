import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";
import { ApiError } from "../../api/client.js";

const DEMO_ACCOUNTS = [
  { label: "Patient demo", email: "alice.morgan@example.com" },
  { label: "Doctor demo", email: "sarah.chen@clinic.local" },
  { label: "Admin demo", email: "admin@clinic.local" },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function doLogin(loginEmail: string, loginPassword: string) {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to log in");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void doLogin(email, password);
  }

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Log in</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        New patient?{" "}
        <Link to="/register" className="font-medium text-brand-600 hover:underline">
          Create an account
        </Link>
      </p>

      <div className="mt-8">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
          Demo logins (local only)
        </p>
        <div className="grid grid-cols-3 gap-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => void doLogin(acc.email, "password123")}
              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
