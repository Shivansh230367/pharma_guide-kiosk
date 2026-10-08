import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  UserRound,
  LockKeyhole,
  PackageSearch,
  Search,
  Sparkles,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const QUICK_SEARCHES = ["Crocin Advance", "Moxikind-CV 625", "Lipitor 10"];

function currency(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

export default function KioskSearch() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const searchMedicine = async (value = query) => {
    const clean = value.trim();

    if (!clean) {
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setSuggestions([]);

    try {
      const response = await fetch(
        `${API_BASE}/api/search?query=${encodeURIComponent(clean)}`
      );
      const data = await response.json();

      if (!response.ok) {
        setSuggestions(data.suggestions || []);
        throw new Error(data.error || "Medicine not found.");
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Unable to search right now.");
    } finally {
      setLoading(false);
    }
  };

  const resetKiosk = () => {
    setQuery("");
    setResult(null);
    setSuggestions([]);
    setError("");
    inputRef.current?.focus();
  };

  // Browser fullscreen is user-gesture initiated because browsers restrict
  // automatic fullscreen requests. Call requestFullscreen() from a button.
  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen may be blocked by browser/device policy.
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <main className="kiosk-shell bg-slate-50 text-slate-950">
      <div className="mx-auto min-h-screen max-w-7xl px-6 py-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <button
            type="button"
            onClick={resetKiosk}
            className="flex min-h-12 items-center gap-3 rounded-2xl text-left"
            aria-label="Return to kiosk home"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-100 text-sky-700">
              <PackageSearch size={23} />
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight">
                PharmaGuide
              </span>
              <span className="block text-xs text-slate-500">
                Self-service medicine desk
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-slate-500 sm:block">
              Central Pharmacy · Entrance desk
            </span>
            <button
              type="button"
              onClick={() => { window.location.href = "/staff"; }}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm"
              title="Staff access"
            >
              <UserRound size={18} />
              <span className="hidden sm:inline">Staff</span>
            </button>
            <button
              type="button"
              onClick={enterFullscreen}
              className="grid min-h-12 min-w-12 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm"
              title="Enter kiosk fullscreen"
              aria-label="Enter fullscreen"
            >
              <LockKeyhole size={19} />
            </button>
          </div>
        </header>

        <section className="grid gap-8 pb-10 pt-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-sky-100 text-sky-600">
              <PackageSearch size={24} />
            </span>
            <h1 className="max-w-2xl text-4xl font-medium leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Find the right medicine,
              <span className="block text-sky-600">without the wait.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-500">
              Search a brand to check live stock and compare medicines with
              the same active composition.
            </p>
          </div>

          <div className="relative hidden min-h-52 overflow-hidden rounded-3xl bg-sky-100 lg:block">
            <div className="absolute -left-12 -top-16 h-44 w-44 rounded-full border-[22px] border-sky-200" />
            <div className="absolute bottom-8 right-7 flex w-[75%] items-center justify-between rounded-2xl bg-white p-5 shadow-kiosk">
              <div>
                <p className="font-semibold">Stock checked live</p>
                <p className="mt-1 text-sm text-slate-500">
                  Clear answers for every visit
                </p>
              </div>
              <CheckCircle2 className="text-emerald-600" size={30} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-kiosk sm:p-7">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              searchMedicine();
            }}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <label className="flex min-h-16 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100">
              <Search className="shrink-0 text-sky-600" size={25} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type a brand name, e.g. Crocin Advance"
                className="w-full bg-transparent text-lg outline-none placeholder:text-slate-400"
                autoComplete="off"
                inputMode="search"
                aria-label="Medicine brand search"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="min-h-16 min-w-40 rounded-2xl bg-sky-600 px-7 text-lg font-semibold text-white shadow-lg shadow-sky-200 transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? "Checking…" : "Search"}{" "}
              {!loading && <ArrowRight className="ml-1 inline" size={21} />}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-500">Try a quick search</span>
            {QUICK_SEARCHES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setQuery(item);
                  searchMedicine(item);
                }}
                className="min-h-11 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 active:scale-[0.98]"
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <section className="mx-auto mt-8 max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-7 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-amber-600">
              <Search size={24} />
            </div>
            <h2 className="mt-4 text-2xl font-medium">No exact brand match</h2>
            <p className="mt-2 text-slate-500">
              {error} Try a suggested brand below.
            </p>

            {suggestions.length > 0 && (
              <div className="mx-auto mt-5 max-w-xl space-y-3">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.brand_name}
                    type="button"
                    onClick={() => {
                      setQuery(suggestion.brand_name);
                      searchMedicine(suggestion.brand_name);
                    }}
                    className="flex min-h-14 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-5 text-left shadow-sm"
                  >
                    <span>{suggestion.brand_name}</span>
                    <ArrowRight size={20} />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {!result && !error && (
          <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.22fr_0.22fr]">
            <div className="rounded-3xl border border-sky-100 bg-sky-50 p-7">
              <Sparkles className="text-sky-600" size={24} />
              <h2 className="mt-4 text-xl font-medium">
                Know your options before you reach the counter.
              </h2>
              <p className="mt-2 text-slate-500">
                We’ll show the exact composition, current shelf stock, and
                lower-cost alternatives when available.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-7">
              <div className="text-3xl font-semibold text-sky-600">Live</div>
              <div className="mt-1 text-sm text-slate-500">inventory view</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-7">
              <div className="text-3xl font-semibold text-sky-600">₹</div>
              <div className="mt-1 text-sm text-slate-500">compare per pill</div>
            </div>
          </section>
        )}

        {result && (
          <section className="mt-10 space-y-7">
            <div className="border-l-4 border-sky-500 bg-sky-50 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Active composition
              </p>
              <p className="mt-1 text-lg font-semibold">
                {result.searched_item.chemical_name}
              </p>
            </div>

            <article className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-kiosk md:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Current brand
                </p>
                <h2 className="mt-3 text-2xl font-medium">
                  {result.searched_item.brand_name}
                </h2>
                <StockBadge
                  inStock={result.searched_item.in_stock}
                  quantity={result.searched_item.stock_quantity}
                />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Price per strip
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {currency(result.searched_item.price_per_strip)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {currency(result.searched_item.unit_price)} / pill ·{" "}
                  {result.searched_item.strip_size} pills
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Shelf location
                </p>
                <p className="mt-3 text-2xl font-semibold">
                  {result.searched_item.shelf_location}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {result.searched_item.in_stock
                    ? "Available now"
                    : "Ask counter staff for alternatives"}
                </p>
              </div>
            </article>

            {!result.searched_item.in_stock && (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-white p-3 text-red-600">
                    <PackageSearch size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-red-900">
                      This brand is currently out of stock
                    </h2>
                    <p className="mt-1 text-red-800/80">
                      The same active composition is available below. Show the
                      alternative list to the pharmacist before purchasing.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Alternative options & savings
                  </p>
                  <h2 className="mt-2 text-3xl font-medium">
                    {result.alternative_count} matching brands in stock
                  </h2>
                </div>
                <span className="text-sm text-slate-500">
                  Sorted by lowest price per pill
                </span>
              </div>

              {result.alternatives.length === 0 ? (
                <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                  No matching alternative is currently in stock.
                </div>
              ) : (
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {result.alternatives.map((alternative) => (
                    <AlternativeCard
                      key={alternative.substitute_brand}
                      alternative={alternative}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <footer className="mt-12 flex flex-col gap-2 border-t border-slate-200 py-6 text-xs text-slate-400 sm:flex-row sm:justify-between">
          <span>For medicine information only · Always follow your doctor’s advice.</span>
          <button type="button" onClick={resetKiosk} className="text-left sm:text-right">
            Start a new search
          </button>
        </footer>
      </div>
    </main>
  );
}

function StockBadge({ inStock, quantity }) {
  return (
    <span
      className={`mt-4 inline-flex min-h-9 items-center rounded-full px-3 py-1.5 text-sm font-semibold ${
        inStock
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {inStock ? `● ${quantity} available` : "● Out of stock"}
    </span>
  );
}

function AlternativeCard({ alternative }) {
  const isSaving = alternative.percentage_saved > 0;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-sky-700">
          Same composition
        </p>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            isSaving
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {isSaving
            ? `Save ${alternative.percentage_saved.toFixed(0)}%`
            : "No saving"}
        </span>
      </div>

      <h3 className="mt-7 text-xl font-medium">
        {alternative.substitute_brand}
      </h3>

      <div className="mt-5 grid grid-cols-3 gap-3 border-y border-slate-100 py-5">
        <Metric label="Per strip" value={currency(alternative.price_per_strip)} />
        <Metric label="Per pill" value={currency(alternative.unit_price)} />
        <Metric label="Available" value={alternative.stock_quantity} />
      </div>

      <div className="mt-5 flex items-center justify-between text-sm">
        <span className={isSaving ? "font-semibold text-emerald-700" : "text-slate-500"}>
          {isSaving
            ? `${currency(alternative.savings_per_pill)} saved / pill`
            : `${currency(Math.abs(alternative.savings_per_pill))} higher / pill`}
        </span>
        <span className="text-slate-400">{alternative.shelf_location}</span>
      </div>
    </article>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
