import { ReactNode, useState } from "react";

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({
  children,
  content,
  position = "top",
  className = "",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionStyles = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`
            absolute z-50 px-3 py-1.5
            bg-slate-900/95 backdrop-blur-sm
            text-white text-xs font-medium
            rounded-lg whitespace-nowrap
            shadow-lg
            ${positionStyles[position]}
            animate-in fade-in duration-200
          `}
        >
          {content}
          <div
            className={`
              absolute w-2 h-2 bg-slate-900/95 rotate-45
              ${position === "top" && "bottom-[-4px] left-1/2 -translate-x-1/2"}
              ${position === "bottom" && "top-[-4px] left-1/2 -translate-x-1/2"}
              ${position === "left" && "right-[-4px] top-1/2 -translate-y-1/2"}
              ${position === "right" && "left-[-4px] top-1/2 -translate-y-1/2"}
            `}
          />
        </div>
      )}
    </div>
  );
}
