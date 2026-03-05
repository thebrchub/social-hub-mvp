import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

const Modal = ({ isOpen, onClose, title, children, footer }: ModalProps) => {
  // Prevent scrolling on the body when the modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
      {/* Overlay backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      ></div>

      {/* Modal Box */}
      <div className="relative w-full max-w-md bg-[#1a1a1a] border border-[#272729] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#272729] bg-[#111]">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 text-gray-300 text-sm leading-relaxed">
          {children}
        </div>

        {/* Footer (Optional) */}
        {footer && (
          <div className="px-6 py-4 border-t border-[#272729] bg-[#111] flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;