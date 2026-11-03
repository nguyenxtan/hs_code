'use client';
import { useEffect, useRef, type ReactNode } from 'react';

export default function AssistantPanel({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    const scroll = window.scrollY;
    const overflow = document.body.style.overflow;
    const media = window.matchMedia('(min-width: 1280px)');
    let frame = 0;
    let pending = false;
    function display() {
      // Do not promote this panel above a detail/picker already in the top layer.
      if (Array.from(document.querySelectorAll('dialog:modal')).some((d) => d !== dialog)) {
        pending = true;
        return;
      }
      pending = false;
      if (dialog!.open && dialog!.matches(':modal') === !media.matches) return;
      if (dialog!.open) dialog!.close();
      if (media.matches) dialog!.show();
      else dialog!.showModal();
      document.body.style.overflow = media.matches ? overflow : 'hidden';
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        dialog!.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true }),
      );
    }
    display();
    media.addEventListener('change', display);
    const resume = (event: Event) => {
      if (pending && event.target !== dialog) display();
    };
    document.addEventListener('close', resume, true);
    // React may remove the other dialog before its close event reaches document.
    const observer = new MutationObserver(() => {
      if (pending) display();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener('change', display);
      document.removeEventListener('close', resume, true);
      observer.disconnect();
      dialog.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      if (!media.matches) window.scrollTo({ top: scroll, behavior: 'instant' });
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="assistant-panel"
      aria-label="Hỗ trợ tìm mã"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
