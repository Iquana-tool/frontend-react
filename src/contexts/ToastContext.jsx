import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle, XCircle, X, Info } from 'lucide-react';

const ToastContext = createContext(null);

// Visual treatment per toast type. Toasts sit on the raised panel surface so
// they read as chrome rather than as page content, with the semantic colour
// carried by the icon and left border only.
const TOAST_STYLES = {
  success: 'bg-p2 border-okLn text-t1',
  error: 'bg-p2 border-errLn text-t1',
  info: 'bg-p2 border-acLn text-t1',
};

const TOAST_ICONS = {
  success: <CheckCircle className="w-[15px] h-[15px] text-ok flex-shrink-0 mt-[1px]" />,
  error: <XCircle className="w-[15px] h-[15px] text-err flex-shrink-0 mt-[1px]" />,
  info: <Info className="w-[15px] h-[15px] text-ac flex-shrink-0 mt-[1px]" />,
};

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = 'success', duration = 4000 }) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-slide-up pointer-events-auto flex items-start gap-[8px] px-[14px] py-[11px] rounded-9 shadow-bar border max-w-sm w-full
              ${TOAST_STYLES[toast.type] || TOAST_STYLES.success}`}
          >
            {TOAST_ICONS[toast.type] || TOAST_ICONS.success}
            <p className="text-btn font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-t3 hover:text-t1 transition-colors duration-150 flex-shrink-0"
            >
              <X className="w-[14px] h-[14px]" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
