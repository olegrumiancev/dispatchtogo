import Link from "next/link";
import { ArrowRight, Mail, ShieldCheck, UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface PersonalAccountCardProps {
  name: string | null;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: Date | string;
  linkedEntity?: {
    label: string;
    value: string;
  };
  relatedSettings?: {
    href: string;
    label: string;
    description: string;
  };
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  OPERATOR: "Operator",
  VENDOR: "Vendor",
};

export function PersonalAccountCard({
  name,
  email,
  role,
  emailVerified,
  createdAt,
  linkedEntity,
  relatedSettings,
}: PersonalAccountCardProps) {
  const displayName = name?.trim() || "Not set";
  const roleLabel = ROLE_LABELS[role] ?? role;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircle className="h-5 w-5" />
          Personal Account
        </CardTitle>
        <p className="text-sm text-gray-500">
          This area is for your personal sign-in identity. Organization and company records are managed separately.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Full Name</p>
          <p className="mt-2 text-sm font-medium text-gray-900">{displayName}</p>
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Login Email</p>
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-900">
            <Mail className="h-4 w-4 text-gray-400" />
            <span className="truncate">{email}</span>
          </div>
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Role</p>
          <div className="mt-2">
            <Badge variant="bg-brand-mist text-brand-primary">{roleLabel}</Badge>
          </div>
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Email Status</p>
          <div className="mt-2">
            <Badge
              variant={
                emailVerified
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-800"
              }
            >
              <ShieldCheck className="mr-1 h-3 w-3" />
              {emailVerified ? "Verified" : "Pending Verification"}
            </Badge>
          </div>
        </div>

        {linkedEntity && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{linkedEntity.label}</p>
            <p className="mt-2 text-sm font-medium text-gray-900">{linkedEntity.value}</p>
          </div>
        )}

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Member Since</p>
          <p className="mt-2 text-sm font-medium text-gray-900">{formatDate(createdAt)}</p>
        </div>
      </CardContent>

      {relatedSettings && (
        <CardFooter className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-gray-500">{relatedSettings.description}</p>
          <Link
            href={relatedSettings.href}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            {relatedSettings.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
