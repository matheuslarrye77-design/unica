"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { INPUT_CLASS } from "@/lib/constants";

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-unica text-white hover:bg-unica-hover",
    secondary: "border border-line bg-white text-ink hover:bg-unica-wash",
    ghost: "text-ink hover:bg-unica-wash",
    danger: "border border-[#E7C4CB] bg-white text-danger hover:bg-[#FDF6F7]",
  }[variant];
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-mute">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(INPUT_CLASS, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(INPUT_CLASS, "min-h-28 py-2.5", props.className)} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(INPUT_CLASS, props.className)} />;
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const node = ref.current?.querySelector<HTMLElement>("input, textarea, select, button");
    node?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function trap(event: React.KeyboardEvent) {
    if (event.key !== "Tab" || !ref.current) return;
    const nodes = Array.from(
      ref.current.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"),
    ).filter((node) => !node.hasAttribute("disabled"));
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-[#1E1A24]/40" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trap}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-card sm:rounded-2xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-unica-wash">
            <X size={18} />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-white px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {text ? <p className="mx-auto mt-1 max-w-md text-sm text-mute">{text}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Avatar({
  name,
  id,
  hasAvatar,
  size = 32,
}: {
  name: string;
  id?: number;
  hasAvatar?: boolean;
  size?: number;
}) {
  if (hasAvatar && id) {
    return (
      <img
        src={`/api/media/avatar/${id}`}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-unica-wash font-semibold text-unica"
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}
    >
      {initials(name)}
    </span>
  );
}

export function PriorityBadge({ priority, label }: { priority: string; label: string }) {
  const styles: Record<string, string> = {
    low: "bg-[#F1F2F4] text-[#3F4A57]",
    normal: "bg-unica-wash text-unica",
    high: "bg-[#FBF3E4] text-warning",
    urgent: "bg-[#F8E8EB] text-danger",
  };
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", styles[priority])}>{label}</span>;
}

export function StatusText({ status, label }: { status: string; label: string }) {
  const styles: Record<string, string> = {
    todo: "text-[#5C5662]",
    doing: "text-[#5B3D99]",
    review: "text-unica",
    done: "text-success",
  };
  return <span className={cn("text-sm font-medium", styles[status])}>{label}</span>;
}

type ToastItem = { id: number; message: string; tone: "ok" | "error" };

let pushToast: ((message: string, tone?: "ok" | "error") => void) | null = null;

export function toast(message: string, tone: "ok" | "error" = "ok") {
  pushToast?.(message, tone);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<ToastItem | null>(null);
  useEffect(() => {
    pushToast = (message, tone = "ok") => setItem({ id: Date.now(), message, tone });
    return () => {
      pushToast = null;
    };
  }, []);
  useEffect(() => {
    if (!item) return;
    const timer = window.setTimeout(() => setItem(null), 3200);
    return () => window.clearTimeout(timer);
  }, [item]);
  return (
    <>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 md:bottom-6 md:justify-end md:px-6" aria-live="polite">
        {item ? (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto rounded-xl border bg-white px-4 py-3 text-sm shadow-card",
              item.tone === "error" ? "border-[#E7C4CB] text-danger" : "border-line text-ink",
            )}
          >
            {item.message}
          </div>
        ) : null}
      </div>
    </>
  );
}
