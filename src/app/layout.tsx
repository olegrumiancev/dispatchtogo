import type { Metadata } from "next";
import "./globals.css";

const isDev = process.env.NODE_ENV !== "production";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: isDev ? "[DEV] DispatchToGo" : "DispatchToGo",
    description: "Managed vendor network for tourism operators",
    icons: isDev
      ? { icon: "/favicon-dev.svg" }
      : undefined,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
