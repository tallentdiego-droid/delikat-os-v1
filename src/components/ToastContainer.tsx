import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { type ToastItem, subscribeToasts, toast } from '../lib/toast';

const icons = {
  success: <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-px" />,
  error: <XCircle size={15} className="text-red-500 shrink-0 mt-px" />,
  info: <Info size={15} className="text-blue-500 shrink-0 mt-px" />,
};

const borderColors = {
  success: 'border-l-emerald-400',
  error: 'border-l-red-400',
  info: 'border-l-blue-400',
};

export default function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-80 pointer-events-none">
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-start gap-3 bg-white border border-slate-200 border-l-4 ${borderColors[item.type]} rounded-xl shadow-xl px-4 py-3 pointer-events-auto`}
          style={{ animation: 'slideUp 0.25s ease-out' }}
        >
          {icons[item.type]}
          <p className="text-sm text-slate-700 flex-1 leading-snug">{item.message}</p>
          <button
            onClick={() => toast.dismiss(item.id)}
            className="text-slate-300 hover:text-slate-500 transition-colors mt-px"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
