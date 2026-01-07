import { useState } from "react";

interface ChipProps {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Chip({ children, onClose, className = "" }: ChipProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <div
      className={`
        inline-flex items-center gap-2
        px-3 py-1.5
        bg-white/80 backdrop-blur-sm
        border border-slate-200
        rounded-full
        text-sm text-slate-700
        transition-all
        hover:border-slate-300
        ${className}
      `}
    >
      <span>{children}</span>
      {onClose && (
        <button
          onClick={handleClose}
          className="w-4 h-4 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors"
        >
          <svg
            className="w-3 h-3 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
