/**
 * Test-mode payment page (used when the server has no Razorpay keys and ALLOW_DEMO_PAYMENTS=true).
 * Looks and behaves like a real gateway: card / UPI / net banking / wallet, with validation.
 * Card numbers, CVV and expiry NEVER leave the browser — only the method and last 4 digits are sent.
 *
 * Test details:
 *   Card success : 4111 1111 1111 1111  (any future expiry, any CVV)
 *   Card decline : 4000 0000 0000 0002
 *   UPI success  : success@upi        UPI failure : failure@upi
 */
import { Building2, CheckCircle2, CreditCard, FlaskConical, Lock, ShieldCheck, Smartphone, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";
import { money } from "../utils/format";
import { Modal, Spinner } from "./ui";

const METHODS = [
  { id: "card", label: "Card", sub: "Visa, Mastercard, RuPay, Amex", icon: CreditCard },
  { id: "upi", label: "UPI", sub: "GPay, PhonePe, Paytm, BHIM", icon: Smartphone },
  { id: "netbanking", label: "Net Banking", sub: "All major banks", icon: Building2 },
  { id: "wallet", label: "Wallet", sub: "Paytm, Amazon Pay, Mobikwik", icon: Wallet },
];
const BANKS = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank", "Punjab National Bank", "Bank of Baroda", "Yes Bank"];
const WALLETS = ["Paytm Wallet", "Amazon Pay", "Mobikwik", "Freecharge"];
const DECLINE_CARD = "4000000000000002";

const digits = (s) => s.replace(/\D/g, "");

function cardBrand(num) {
  const n = digits(num);
  if (/^4/.test(n)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^(60|65|81|82|508)/.test(n)) return "RuPay";
  return "";
}

// Luhn checksum: the standard check every real card number passes.
function luhnValid(num) {
  const n = digits(num);
  if (n.length < 13 || n.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

const formatCard = (v) => {
  const n = digits(v).slice(0, 19);
  return cardBrand(n) === "Amex" ? n.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" ")) : n.replace(/(\d{4})(?=\d)/g, "$1 ");
};
const formatExpiry = (v) => {
  const n = digits(v).slice(0, 4);
  return n.length > 2 ? `${n.slice(0, 2)}/${n.slice(2)}` : n;
};

function validateCard(c) {
  const e = {};
  if (!luhnValid(c.number)) e.number = "Enter a valid card number";
  if (c.name.trim().length < 2) e.name = "Enter the name on the card";
  const m = /^(\d{2})\/(\d{2})$/.exec(c.expiry);
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) e.expiry = "Use MM/YY";
  else {
    const exp = new Date(2000 + Number(m[2]), Number(m[1]), 1); // first day after expiry month
    if (exp <= new Date()) e.expiry = "Card has expired";
  }
  const cvvLen = cardBrand(c.number) === "Amex" ? 4 : 3;
  if (digits(c.cvv).length !== cvvLen) e.cvv = `${cvvLen} digits`;
  return e;
}

export default function PaymentGateway({ order, onSuccess, onFail, onClose }) {
  const [method, setMethod] = useState("card");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [upi, setUpi] = useState("");
  const [bank, setBank] = useState("");
  const [wallet, setWallet] = useState("");
  const [errors, setErrors] = useState({});
  // clear a field's error as soon as the user edits it
  const clearErrors = () => setErrors({});
  const [stage, setStage] = useState("form"); // form | processing | success
  const [stageText, setStageText] = useState("");

  useEffect(() => { setErrors({}); }, [method]);
  if (!order) return null;
  const amount = money((order.amount || 0) / 100);
  const brand = cardBrand(card.number);

  // Simulated gateway timing so the flow feels like a real payment.
  const process = async (details, shouldFail, failReason) => {
    setStage("processing");
    setStageText(method === "upi" ? "Waiting for you to approve the request in your UPI app…" : method === "card" ? "Contacting your bank…" : "Redirecting to secure payment…");
    await new Promise((r) => setTimeout(r, 1200));
    setStageText("Verifying payment…");
    await new Promise((r) => setTimeout(r, 900));
    if (shouldFail) {
      setStage("form");
      onFail(failReason);
      return;
    }
    setStage("success");
    await new Promise((r) => setTimeout(r, 700));
    onSuccess(details);
  };

  const submit = (e) => {
    e.preventDefault();
    if (method === "card") {
      const errs = validateCard(card);
      setErrors(errs);
      if (Object.keys(errs).length) return;
      const n = digits(card.number);
      process({ method: "card", label: `${brand || "Card"} •••• ${n.slice(-4)}` }, n === DECLINE_CARD, "Card declined by the issuing bank (test decline card)");
    } else if (method === "upi") {
      if (!/^[\w.-]{2,}@[a-z]{2,}$/i.test(upi.trim())) return setErrors({ upi: "Enter a valid UPI ID, e.g. name@okhdfc" });
      process({ method: "upi", label: `UPI ${upi.trim().toLowerCase()}` }, /^failure@/i.test(upi.trim()), "UPI payment was declined");
    } else if (method === "netbanking") {
      if (!bank) return setErrors({ bank: "Choose your bank" });
      process({ method: "netbanking", label: bank }, false);
    } else {
      if (!wallet) return setErrors({ wallet: "Choose a wallet" });
      process({ method: "wallet", label: wallet }, false);
    }
  };

  const busy = stage !== "form";
  const err = (k) => errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]}</p>;
  const inputCls = (k) => `w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15 ${errors[k] ? "border-red-400" : "border-slate-300"}`;

  return (
    <Modal open onClose={busy ? () => {} : onClose} className="max-w-3xl">
      <div className="overflow-hidden rounded-2xl bg-white text-slate-800 shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-rose-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10"><Lock className="h-5 w-5" /></span>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-300">Cinephile Pay · Secure checkout</p>
              <p className="font-display text-xl font-bold">{amount}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={busy} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10 disabled:opacity-40" aria-label="Close payment"><X className="h-5 w-5" /></button>
        </div>

        {busy ? (
          <div className="flex min-h-[380px] flex-col items-center justify-center gap-4 p-10 text-center">
            {stage === "success" ? (
              <>
                <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                <p className="text-lg font-semibold text-slate-900">Payment successful</p>
                <p className="text-sm text-slate-500">Confirming your booking…</p>
              </>
            ) : (
              <>
                <Spinner className="h-12 w-12 text-rose-600" />
                <p className="text-lg font-semibold text-slate-900">Processing {amount}</p>
                <p className="text-sm text-slate-500">{stageText}</p>
                <p className="text-xs text-slate-400">Please don't close this window or press back.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-[230px_1fr]">
            {/* methods */}
            <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 p-2 md:flex-col md:border-b-0 md:border-r" aria-label="Payment methods">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left transition ${method === m.id ? "bg-white shadow-sm ring-1 ring-rose-200" : "hover:bg-white/70"}`}
                  aria-pressed={method === m.id}
                >
                  <m.icon className={`h-5 w-5 ${method === m.id ? "text-rose-600" : "text-slate-500"}`} />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{m.label}</span>
                    <span className="hidden text-[11px] text-slate-500 md:block">{m.sub}</span>
                  </span>
                </button>
              ))}
            </nav>

            {/* form */}
            <form onSubmit={submit} className="space-y-4 p-6" noValidate>
              <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <FlaskConical className="h-4 w-4 shrink-0" />
                <p><b>Test mode, no real money is charged.</b> Card details stay in your browser and are never sent or stored. Add Razorpay test keys on the server for the real Razorpay checkout.</p>
              </div>

              {method === "card" && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="cc-number">Card number</label>
                    <div className="relative">
                      <input id="cc-number" inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456" value={card.number} onChange={(e) => { clearErrors(); setCard({ ...card, number: formatCard(e.target.value) }); }} className={`${inputCls("number")} pr-24 font-mono tracking-wider`} />
                      {brand && <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">{brand}</span>}
                    </div>
                    {err("number")}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="cc-name">Name on card</label>
                    <input id="cc-name" autoComplete="cc-name" placeholder="As printed on the card" value={card.name} onChange={(e) => { clearErrors(); setCard({ ...card, name: e.target.value }); }} className={inputCls("name")} />
                    {err("name")}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="cc-exp">Expiry (MM/YY)</label>
                      <input id="cc-exp" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" value={card.expiry} onChange={(e) => { clearErrors(); setCard({ ...card, expiry: formatExpiry(e.target.value) }); }} className={`${inputCls("expiry")} font-mono`} />
                      {err("expiry")}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="cc-cvv">CVV</label>
                      <input id="cc-cvv" type="password" inputMode="numeric" autoComplete="cc-csc" placeholder="•••" maxLength={4} value={card.cvv} onChange={(e) => { clearErrors(); setCard({ ...card, cvv: digits(e.target.value).slice(0, 4) }); }} className={`${inputCls("cvv")} font-mono`} />
                      {err("cvv")}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500">
                    <p className="font-semibold text-slate-600">Test cards</p>
                    <p>Success: <button type="button" className="font-mono text-rose-600 hover:underline" onClick={() => { clearErrors(); setCard({ number: "4111 1111 1111 1111", name: "Test User", expiry: "12/30", cvv: "123" }); }}>4111 1111 1111 1111</button> · Declined: <button type="button" className="font-mono text-rose-600 hover:underline" onClick={() => { clearErrors(); setCard({ number: "4000 0000 0000 0002", name: "Test User", expiry: "12/30", cvv: "123" }); }}>4000 0000 0000 0002</button> · any future expiry, any CVV</p>
                  </div>
                </>
              )}

              {method === "upi" && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="upi-id">UPI ID</label>
                  <input id="upi-id" placeholder="yourname@okhdfc" value={upi} onChange={(e) => { clearErrors(); setUpi(e.target.value); }} className={inputCls("upi")} />
                  {err("upi")}
                  <p className="mt-2 text-[11px] text-slate-500">Test IDs: <button type="button" className="font-mono text-rose-600 hover:underline" onClick={() => setUpi("success@upi")}>success@upi</button> · <button type="button" className="font-mono text-rose-600 hover:underline" onClick={() => setUpi("failure@upi")}>failure@upi</button></p>
                </div>
              )}

              {method === "netbanking" && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-600">Choose your bank</p>
                  <div className="grid grid-cols-2 gap-2">
                    {BANKS.map((b) => (
                      <button type="button" key={b} onClick={() => setBank(b)} className={`rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition ${bank === b ? "border-rose-500 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>{b}</button>
                    ))}
                  </div>
                  {err("bank")}
                </div>
              )}

              {method === "wallet" && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-600">Choose a wallet</p>
                  <div className="grid grid-cols-2 gap-2">
                    {WALLETS.map((w) => (
                      <button type="button" key={w} onClick={() => setWallet(w)} className={`rounded-lg border px-3 py-3 text-left text-sm font-medium transition ${wallet === w ? "border-rose-500 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>{w}</button>
                    ))}
                  </div>
                  {err("wallet")}
                </div>
              )}

              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 font-semibold text-white shadow-lg shadow-rose-600/25 transition hover:bg-rose-500">
                <ShieldCheck className="h-4 w-4" /> Pay {amount}
              </button>
              <p className="text-center text-[11px] text-slate-400">Booking {order.booking?.bookingId} · Order {order.orderId}</p>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
}
