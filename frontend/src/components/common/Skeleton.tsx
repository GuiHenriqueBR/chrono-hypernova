interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({
  variant = "rectangular",
  width = "100%",
  height,
  className = "",
}: SkeletonProps) {
  const variantStyles = {
    text: "rounded-md h-4 w-full animate-pulse",
    circular: "rounded-full animate-pulse",
    rectangular: "rounded-xl animate-pulse",
  };

  const style = {
    width: typeof width === "number" ? `${width}px` : width,
    height: height || (variant === "text" ? "1rem" : "100%"),
  };

  return (
    <div
      className={`
        bg-slate-200
        ${variantStyles[variant]}
        ${className}
      `}
      style={style}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200">
      <div className="flex items-start justify-between mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 ml-4">
          <Skeleton variant="text" width="60%" className="mb-2" />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
      <Skeleton variant="text" className="mb-2" />
      <Skeleton variant="text" className="mb-2" />
      <Skeleton variant="text" width="80%" />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
