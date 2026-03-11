import { cn } from "@/lib/utils";
import React from "react";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export function Textarea({
  label,
  error,
  id,
  wrapperClassName,
  className,
  ...props
}: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={cn("flex flex-col gap-1", wrapperClassName)}>
      {label && (
        <label
          htmlFor={textareaId}
          className="text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={4}
        className={cn(
          "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm",
          "placeholder:text-slate-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-[rgba(21,87,200,0.2)]",
          "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed resize-y",
          error
            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
            : "",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
