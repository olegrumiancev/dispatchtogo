"use client";

import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  layout?: "horizontal" | "stacked";
  theme?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  subtitle?: string;
  hideWordmarkOnMobile?: boolean;
  className?: string;
};

const SIZE_MAP = {
  sm: {
    wordmark: "text-xl",
    subtitle: "text-xs",
    horizontalIcon: { width: 30, height: 20 },
    stackedIcon: { width: 72, height: 48 },
    gap: "gap-2",
  },
  md: {
    wordmark: "text-2xl",
    subtitle: "text-sm",
    horizontalIcon: { width: 36, height: 24 },
    stackedIcon: { width: 88, height: 59 },
    gap: "gap-2.5",
  },
  lg: {
    wordmark: "text-[1.8rem]",
    subtitle: "text-sm",
    horizontalIcon: { width: 42, height: 28 },
    stackedIcon: { width: 108, height: 72 },
    gap: "gap-3",
  },
} as const;

export function BrandLogo({
  href = "/",
  layout = "horizontal",
  theme = "light",
  size = "md",
  subtitle,
  hideWordmarkOnMobile = false,
  className = "",
}: BrandLogoProps) {
  const scale = SIZE_MAP[size];
  const wordmarkColor = theme === "dark" ? "text-white" : "text-slate-900";
  const accentColor = theme === "dark" ? "text-blue-300" : "text-blue-700";
  const subtitleColor = theme === "dark" ? "text-slate-400" : "text-slate-500";
  const isStacked = layout === "stacked";
  const iconSize = scale.horizontalIcon;
  const imageClass = subtitle ? "h-auto w-[64px]" : "h-auto w-[48px]";

  const content = (
    <div
      className={[
        "inline-flex",
        "items-center",
        hideWordmarkOnMobile ? "gap-0 sm:gap-2" : scale.gap,
        className,
      ].join(" ")}
    >
      <Image
        src="/brand/dispatch-van-source.svg"
        alt="DispatchToGo service van"
        width={iconSize.width}
        height={iconSize.height}
        unoptimized
        className={imageClass}
      />
      <div
        className={[
          isStacked ? "text-left" : "leading-none",
          hideWordmarkOnMobile ? "hidden sm:block" : "",
        ].join(" ")}
      >
        <div
          className={`brand-wordmark ${scale.wordmark} whitespace-nowrap font-bold tracking-tight ${wordmarkColor}`}
          style={{ letterSpacing: "-0.04em" }}
        >
          Dispatch <span className={accentColor}>ToGo</span>
        </div>
        {subtitle ? (
          <p className={`mt-1 ${scale.subtitle} ${subtitleColor}`}>{subtitle}</p>
        ) : null}
      </div>
      {hideWordmarkOnMobile ? <span className="sr-only">Dispatch ToGo</span> : null}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
