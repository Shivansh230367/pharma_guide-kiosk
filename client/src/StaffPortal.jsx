import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, LogOut, Package, Search, ShieldCheck, UserRound } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const TOKEN_KEY = "pharma_staff_token";
const STAFF_KEY = "pharma_staff_user";

function currency(value) { return `₹${Number(value || 0).toFixed(2)}`; }

export default function StaffPortal() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [staff, setStaff] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STAFF_KEY) || "null"); } catch { return null; }
  });

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STAFF_KEY);
    setToken(null);
    setStaff(null);
  };

  if (!token || !staff) {
    return <StaffLogin onLogin={(data) => { setToken(data.token); setStaff(data.staff); }} />;
  }

  return <StaffDashboard token={token} staff={staff} onLogout={logout} />;
}

function StaffLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/api/staff/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to sign in.");
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(STAFF_KEY, JSON.stringify(data.staff));
      onLogin(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-950">
      <div className="mx-auto max-w-md">
        <button onClick={() => { window.location.href = "/"; }} className="mb-8 inline-flex min-h-12 items-center gap-2 rounded-xl text-sm font-semibold text-slate-600">
          <ArrowLeft size={18} /> Back to kiosk
        </button>
        <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-kiosk sm:p-9">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-100 text-sky-700"><ShieldCheck size={27} /></div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Staff access</h1>
          <p className="mt-2 text-slate-500">Authorized staff can update live stock, shelf location, and medicine price.</p>
          <form onSubmit={submit} className="mt-7 space-y-5">
            <label className="block"><span className="text-sm font-semibold">Username</span><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" className="mt-2 min-h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" placeholder="Staff username" /></label>
            <label className="block"><span className="text-sm font-semibold">Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="mt-2 min-h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" placeholder="Password" /></label>
            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
            <button disabled={loading} className="min-h-14 w-full rounded-xl bg-sky-600 px-5 text-base font-semibold text-white shadow-lg shadow-sky-200 disabled:opacity-60">{loading ? "Signing in…" : "Sign in securely"}</button>
          </form>
        </section>
      </div>
    </main>
  );
}

function StaffDashboard({ token, staff, onLogout }) {
  const [query, setQuery] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ price_per_strip: "", stock_quantity: "", shelf_location: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [audit, setAudit] = useState([]);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const search = async (value = query) => {
    const clean = value.trim();
    if (!clean) return;
    setLoading(true); setError(""); setMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/staff/medicines?query=${encodeURIComponent(clean)}`, { headers });
      const data = await response.json();
      if (response.status === 401) { onLogout(); return; }
      if (!response.ok) throw new Error(data.error || "Search failed.");
      setMedicines(data.medicines || []);
      if (!data.medicines?.length) setError("No matching medicine found.");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const selectMedicine = (medicine) => {
    setSelected(medicine);
    setForm({ price_per_strip: medicine.price_per_strip, stock_quantity: medicine.stock_quantity, shelf_location: medicine.shelf_location });
    setMessage(""); setError("");
  };

  const save = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/staff/medicines/${selected.id}`, {
        method: "PATCH", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ price_per_strip: Number(form.price_per_strip), stock_quantity: Number(form.stock_quantity), shelf_location: form.shelf_location })
      });
      const data = await response.json();
      if (response.status === 401) { onLogout(); return; }
      if (!response.ok) throw new Error(data.error || "Update failed.");
      setSelected(data.medicine);
      setForm({ price_per_strip: data.medicine.price_per_strip, stock_quantity: data.medicine.stock_quantity, shelf_location: data.medicine.shelf_location });
      setMedicines((items) => items.map((item) => item.id === data.medicine.id ? { ...item, ...data.medicine } : item));
      setMessage("Medicine updated successfully. The kiosk will now show the new values.");
      loadAudit();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const loadAudit = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/staff/audit`, { headers });
      if (response.status === 401) { onLogout(); return; }
      const data = await response.json();
      if (response.ok) setAudit(data.audit || []);
    } catch { /* dashboard remains usable if audit refresh fails */ }
  };

  useEffect(() => { loadAudit(); }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-sky-100 text-sky-700"><Package size={22} /></div><div><p className="text-lg font-semibold">PharmaGuide Staff</p><p className="text-xs text-slate-500">Inventory administration</p></div></div>
          <div className="flex items-center gap-2"><div className="hidden items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm sm:flex"><UserRound size={17} className="text-sky-600" />{staff.full_name} · <span className="capitalize">{staff.role}</span></div><button onClick={onLogout} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold"><LogOut size={17} /> Sign out</button></div>
        </header>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-kiosk sm:p-7">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Find medicine to update</p><h1 className="mt-2 text-2xl font-semibold">Search by brand name</h1></div>
          <form onSubmit={(e) => { e.preventDefault(); search(); }} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <label className="flex min-h-14 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100"><Search size={21} className="text-sky-600" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Crocin Advance or Crocin Advnce" className="w-full bg-transparent outline-none" autoComplete="off" /></label>
            <button disabled={loading} className="min-h-14 rounded-xl bg-sky-600 px-7 font-semibold text-white disabled:opacity-60">{loading ? "Searching…" : "Search"}</button>
          </form>
        </section>

        {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
        {message && <div className="mt-5 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700"><CheckCircle2 size={20} />{message}</div>}

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-kiosk sm:p-6">
            <h2 className="font-semibold">Search results</h2>
            <div className="mt-4 space-y-3">
              {medicines.map((medicine) => (
                <button key={medicine.id} onClick={() => selectMedicine(medicine)} className={`w-full rounded-2xl border p-4 text-left ${selected?.id === medicine.id ? "border-sky-400 bg-sky-50" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{medicine.brand_name}</p><p className="mt-1 text-sm text-slate-500">{medicine.chemical_name}</p></div><span className="text-xs font-semibold text-slate-400">{medicine.match_score.toFixed(0)}%</span></div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-slate-100 px-2.5 py-1">{currency(medicine.price_per_strip)}/strip</span><span className={`rounded-full px-2.5 py-1 ${medicine.stock_quantity > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{medicine.stock_quantity} in stock</span><span className="rounded-full bg-slate-100 px-2.5 py-1">Shelf {medicine.shelf_location}</span></div>
                </button>
              ))}
              {!medicines.length && <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Search for a medicine to begin.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-kiosk sm:p-6">
            {!selected ? <div className="grid min-h-80 place-items-center text-center text-slate-500"><div><ShieldCheck className="mx-auto text-sky-500" size={35} /><p className="mt-3 font-semibold text-slate-700">Select a medicine</p><p className="mt-1 text-sm">Only authorized staff can change these values.</p></div></div> : (
              <form onSubmit={save}>
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Editing medicine</p><h2 className="mt-2 text-2xl font-semibold">{selected.brand_name}</h2><p className="mt-1 text-sm text-slate-500">{selected.chemical_name} · {selected.strip_size} pills per strip</p></div><span className="rounded-full bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-700">Authorized</span></div>
                <div className="mt-7 grid gap-5 sm:grid-cols-3">
                  <label><span className="text-sm font-semibold">Price / strip (₹)</span><input type="number" min="0" step="0.01" value={form.price_per_strip} onChange={(e) => setForm({ ...form, price_per_strip: e.target.value })} className="mt-2 min-h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
                  <label><span className="text-sm font-semibold">Stock quantity</span><input type="number" min="0" step="1" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} className="mt-2 min-h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
                  <label><span className="text-sm font-semibold">Shelf location</span><input maxLength="50" value={form.shelf_location} onChange={(e) => setForm({ ...form, shelf_location: e.target.value })} className="mt-2 min-h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
                </div>
                <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">The public kiosk will immediately use the updated price, stock status, and shelf location after this save.</div>
                <button disabled={saving} className="mt-5 min-h-14 w-full rounded-xl bg-sky-600 font-semibold text-white shadow-lg shadow-sky-200 disabled:opacity-60">{saving ? "Saving changes…" : "Save inventory changes"}</button>
              </form>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-kiosk sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Recent update history</h2><p className="mt-1 text-sm text-slate-500">Changes are recorded with the staff account that made them.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">Last 50</span></div>
          <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-3">Time</th><th className="px-3 py-3">Medicine</th><th className="px-3 py-3">Staff</th><th className="px-3 py-3">Price</th><th className="px-3 py-3">Stock</th><th className="px-3 py-3">Shelf</th></tr></thead><tbody>{audit.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="px-3 py-3 whitespace-nowrap">{new Date(row.changed_at).toLocaleString()}</td><td className="px-3 py-3 font-semibold">{row.brand_name}</td><td className="px-3 py-3">{row.full_name}</td><td className="px-3 py-3">{currency(row.old_price_per_strip)} → {currency(row.new_price_per_strip)}</td><td className="px-3 py-3">{row.old_stock_quantity} → {row.new_stock_quantity}</td><td className="px-3 py-3">{row.old_shelf_location} → {row.new_shelf_location}</td></tr>)}</tbody></table></div>
        </section>
      </div>
    </main>
  );
}
