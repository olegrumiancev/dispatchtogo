"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Home, AlertTriangle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Page not found</h2>

        <p className="text-gray-500 text-sm mb-2">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {pathname && (
          <div className="my-5 px-4 py-3 bg-gray-100 rounded-lg text-left">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
              Attempted URL
            </p>
            <p className="text-sm text-gray-700 font-mono break-all">{pathname}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          <Link href="/">
            <Button variant="primary" className="w-full sm:w-auto">
              <Home className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
