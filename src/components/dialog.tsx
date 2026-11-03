'use client';
import { useEffect, useId, useRef, type ReactNode, type KeyboardEventHandler } from 'react';
import { X } from 'lucide-react';

export default function Dialog({
  title,
  onClose,
  children,
  className = '',
  onKeyDown,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  onKeyDown?: KeyboardEventHandler<HTMLDialogElement>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" aria-label="Đóng" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
