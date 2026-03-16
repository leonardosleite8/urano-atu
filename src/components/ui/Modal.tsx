import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** Se true, o header com título e X fica visível. Se false, só o botão X no canto. */
  showHeader?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className = '',
  showHeader = true,
}: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`relative max-h-[90vh] w-full overflow-hidden rounded-xl bg-white shadow-xl ${className}`}>
        {showHeader && (
          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
            {title != null && title !== '' ? (
              <h2 className="text-lg font-semibold text-urano-gray-dark">{title}</h2>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-urano-red"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {!showHeader && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-urano-red"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
