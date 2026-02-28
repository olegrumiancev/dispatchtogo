import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SERVICE_CATEGORIES, URGENCY_LEVELS } from "@/lib/constants";
import {
  Briefcase,
  MapPin,
  Clock,
  Tag,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type JobStatus =
  | "PENDING"
  | "ASSIGNED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

const STATUS_LABELS: Record<JobStatus, string> = {
  PENDING: "Pending",
  ASSIGNED: "New Job",
  ACCEPTED: "Accepted",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  REJECTED: "Declined",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<JobStatus, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  ASSIGNED: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const STATUS_ICONS: Partial<Record<JobStatus, React.ComponentType<{ className?: string }>>> = {
  COMPLETED: CheckCircle,
  REJECTED: XCircle,
  IN_PROGRESS: Play,
};

function getCategoryLabel(category: string) {
  return SERVICE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

function getUrgencyColor(urgency: string) {
  return URGENCY_LEVELS.find((u) => u.value === urgency)?.color ?? "bg-gray-100 text-gray-800";
}

export default async function VendorJobsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const user = session.user as any;
  if (user.role !== "VENDOR") redirect("/");

  const jobs = await prisma.job.findMany({
    where: { vendorId: user.vendorId },
    include: {
      serviceRequest: {
        include: {
          property: { select: { name: true, address: true } },
        },
      },
      photos: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Split into active vs completed
  const activeJobs = jobs.filter((j) =>
    ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"].includes(j.status)
  );
  const pastJobs = jobs.filter((j) =>
    ["COMPLETED", "REJECTED", "CANCELLED"].includes(j.status)
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
            {activeJobs.length} active
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {pastJobs.length} past
          </span>
        </div>
      </div>

      {/* Active Jobs */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Active</h2>
        {activeJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No active jobs right now.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

      {/* Past Jobs */}
      {pastJobs.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">History</h2>
          <div className="space-y-3">
            {pastJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({
  job,
}: {
  job: any;
}) {
  const status = job.status as JobStatus;
  const sr = job.serviceRequest;
  const StatusIcon = STATUS_ICONS[status];

  return (
    <Link href={`/vendor/jobs/${job.id}`}>
      <Card className="hover:border-blue-200 hover:shadow-md transition-all cursor-pointer">
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-4">
            {/* Left */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900">
                  {sr.referenceNumber}
                </span>
                <Badge variant={STATUS_COLORS[status]}>
                  {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
                  {STATUS_LABELS[status]}
                </Badge>
                <Badge variant={getUrgencyColor(sr.urgency)}>
                  {sr.urgency === "EMERGENCY" && (
                    <AlertTriangle className="w-3 h-3 mr-1" />
                  )}
                  {sr.urgency}
                </Badge>
              </div>

              <p className="text-sm text-gray-700 line-clamp-2">
                {sr.description}
              </p>

              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {sr.property.name}
                  {sr.property.address && ` · ${sr.property.address}`}
                </span>
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {getCategoryLabel(sr.category)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(job.createdAt)}
                </span>
              </div>
            </div>

            {/* Right */}
            {job.photos?.length > 0 && (
              <span className="flex-shrink-0 text-xs text-gray-400">
                {job.photos.length} photo{job.photos.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
