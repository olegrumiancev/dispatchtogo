import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: string;
}

export function Badge({ children, className, variant }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variant || "bg-brand-mist text-brand-primary",
        className
      )}
    >
      {children}
    </span>
  );
}
