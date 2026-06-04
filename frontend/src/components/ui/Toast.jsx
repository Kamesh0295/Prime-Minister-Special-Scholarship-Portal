import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { removeToast } from '../../store/slices/toastSlice';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />,
  error:   <XCircle    className="h-5 w-5 text-red-500   flex-shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />,
  info:    <Info       className="h-5 w-5 text-blue-500  flex-shrink-0" />,
};

const BG = {
  success: 'bg-green-50 border-green-200',
  error:   'bg-red-50   border-red-200',
  warning: 'bg-amber-50 border-amber-200',
  info:    'bg-blue-50  border-blue-200',
};

const Toast = ({ toast }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const timer = setTimeout(() => dispatch(removeToast(toast.id)), toast.duration);
    return () => clearTimeout(timer);
  }, [toast, dispatch]);

  return (
    <div
      className={`toast-enter flex items-start gap-3 px-4 py-3 rounded-xl border shadow-card-md min-w-[280px] max-w-[360px] ${BG[toast.type]}`}
    >
      {ICONS[toast.type]}
      <p className="text-sm text-gray-800 flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => dispatch(removeToast(toast.id))}
        className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

const ToastContainer = () => {
  const { toasts } = useSelector((s) => s.toast);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} />
        </div>
      ))}
    </div>
  );
};

export { ToastContainer };
export default Toast;
