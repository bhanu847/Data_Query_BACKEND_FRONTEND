import { useEffect, useRef } from "react";

export default function ConfirmModal({ open, title, message, confirmLabel = "Delete", cancelLabel = "Cancel", danger = true, onConfirm, onCancel }) {
  const confirmRef = useRef();

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <div
        className="w-full max-w-[400px] rounded-2xl border border-border bg-[rgba(12,16,28,0.97)] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-6 space-y-4 mx-4"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${danger ? "bg-accent-rose/10 border border-accent-rose/25" : "bg-brand/10 border border-brand/25"}`}>
            {danger ? (
              <svg className="h-5 w-5 text-accent-rose" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <h3 id="confirm-title" className="text-sm font-semibold text-ink">{title}</h3>
            <p id="confirm-message" className="mt-1 text-[13px] text-muted leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted hover:text-ink hover:bg-surface-2 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5 ${
              danger
                ? "bg-accent-rose text-white shadow-[0_4px_14px_rgba(251,113,133,0.3)]"
                : "bg-gradient-brand text-[#050710] shadow-glow-sm"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
