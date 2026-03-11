import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const isDev = process.env.NODE_ENV !== "production";
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});
const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: isDev ? "[DEV] DispatchToGo" : "DispatchToGo",
    description: "Dispatch with confidence.",
    icons: isDev ? { icon: "/favicon-dev.svg" } : { icon: "/favicon.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: "#1557C8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${sora.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
