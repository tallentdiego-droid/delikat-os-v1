import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = {
    sm: 'modalSm',
    md: 'modalMd',
    lg: 'modalLg',
    xl: 'modalXl',
  }[size];

  return (
    <div className="modalOverlay">
      <div className="modalBackdrop" onClick={onClose} />
      <div className={`modalShell ${sizeClass}`}>
        <div className="modalHeader">
          <h3>{title}</h3>
          <button onClick={onClose} className="modalCloseButton" type="button" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="modalBody">{children}</div>
      </div>
    </div>
  );
}
