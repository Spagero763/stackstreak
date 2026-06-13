import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { explorerTx } from "../config";
import { waitForTx } from "../stacks";
import Icon from "./Icon.jsx";

// Lightweight toast system with built-in transaction tracking. The key feature
// is `txToast(txid, label)`: it shows a "submitted" toast, polls the chain in
// the background, then flips the same toast to "confirmed" or "failed" — the
// feedback that makes each on-chain move feel responsive.

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const tm = timers.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timers.current.delete(id);
    }
  }, []);

  const upsert = useCallback(
    (toast) => {
      setToasts((list) => {
        const i = list.findIndex((t) => t.id === toast.id);
        if (i === -1) return [...list, toast];
        const next = list.slice();
        next[i] = { ...next[i], ...toast };
        return next;
      });
      if (toast.autoDismiss) {
        const prev = timers.current.get(toast.id);
        if (prev) clearTimeout(prev);
        timers.current.set(
          toast.id,
          setTimeout(() => dismiss(toast.id), toast.autoDismiss),
        );
      }
    },
    [dismiss],
  );

  // Generic toast.
  const toast = useCallback(
    (message, { status = "info", autoDismiss = 4500 } = {}) => {
      const id = nextId++;
      upsert({ id, message, status, autoDismiss });
      return id;
    },
    [upsert],
  );

  // Transaction toast: shows "submitted", then resolves on-chain.
  const txToast = useCallback(
    async (txid, label = "Move") => {
      const id = nextId++;
      upsert({ id, status: "pending", message: `${label} submitted`, txid, autoDismiss: 0 });
      const result = await waitForTx(txid);
      const map = {
        success: { status: "success", message: `${label} confirmed`, autoDismiss: 6000 },
        failed: { status: "error", message: `${label} failed on-chain`, autoDismiss: 8000 },
        dropped: { status: "error", message: `${label} was dropped`, autoDismiss: 8000 },
        timeout: { status: "info", message: `${label} still pending — check the explorer`, autoDismiss: 8000 },
      };
      upsert({ id, txid, ...map[result] });
      return result;
    },
    [upsert],
  );

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (
    <ToastContext.Provider value={{ toast, txToast, dismiss }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              className={`toast toast-${t.status}`}
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
            >
              <span className="toast-icon">
                {t.status === "pending" ? (
                  <span className="toast-spinner" />
                ) : (
                  <Icon name={ICONS[t.status] || "quest"} size={16} strokeWidth={2.4} />
                )}
              </span>
              <div className="toast-body">
                <span className="toast-msg">{t.message}</span>
                {t.txid && (
                  <a href={explorerTx(t.txid)} target="_blank" rel="noreferrer">
                    View transaction ↗
                  </a>
                )}
              </div>
              <button className="toast-x" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

const ICONS = { success: "check", error: "x", info: "info" };

export function useToast() {
  const ctx = useContext(ToastContext);
  // Safe no-op fallback if a component renders outside the provider.
  return ctx || { toast: () => {}, txToast: async () => {}, dismiss: () => {} };
}
