import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AccountPageShellProps {
  title: string;
  description: string;
  children: ReactNode;
  maxWidthClassName?: string;
}

export function AccountPageShell({
  title,
  description,
  children,
  maxWidthClassName = "max-w-4xl",
}: AccountPageShellProps) {
  return (
    <div className={cn("space-y-6", maxWidthClassName)}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      {children}
    </div>
  );
}
