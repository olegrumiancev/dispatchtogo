import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SERVICE_CATEGORIES, VENDOR_AVAILABILITY_STATUSES } from "@/lib/constants";
import { Phone, Mail, Building2, CheckCircle, XCircle, Clock, Moon } from "lucide-react";
import { PaginationControls } from "@/components/ui/pagination-controls";

const PAGE_SIZE = 24;

function getCategoryLabel(category: string) {
  return SERVICE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

function getAvailabilityConfig(status: string) {
  return VENDOR_AVAILABILITY_STATUSES.find((s) => s.value === status) ?? VENDOR_AVAILABILITY_STATUSES[0];
}

const AVAILABILITY_ICONS: Record<string, React.ReactNode> = {
  AVAILABLE: <CheckCircle className="w-3 h-3 mr-1" />,
  BUSY: <Clock className="w-3 h-3 mr-1" />,
  OFF_DUTY: <Moon className="w-3 h-3 mr-1" />,
};

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [total, vendors] = await Promise.all([
    prisma.vendor.count(),
    prisma.vendor.findMany({
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        skills: true,
        _count: { select: { jobs: true } },
      },
      orderBy: { companyName: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Active job counts only for this page's vendor IDs
  const vendorIds = vendors.map((v) => v.id);
  const activeJobCounts = vendorIds.length > 0
    ? await prisma.job.groupBy({
        by: ["vendorId"],
        where: { completedAt: null, vendorId: { in: vendorIds } },
        _count: { id: true },
      })
    : [];
  const activeJobMap = new Map(activeJobCounts.map((j) => [j.vendorId, j._count.id]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
        <span className="text-sm text-gray-500">{total} vendors</span>
      </div>

      {vendors.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No vendors registered yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vendors.map((vendor) => {
            const availConfig = getAvailabilityConfig(vendor.availabilityStatus);
            const activeJobs = activeJobMap.get(vendor.id) ?? 0;

            return (
              <Card key={vendor.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{vendor.companyName}</CardTitle>
                    <div className="flex flex-col items-end gap-1">
                      {vendor.isActive ? (
                        <Badge variant={availConfig.color}>
                          {AVAILABILITY_ICONS[vendor.availabilityStatus]}
                          {availConfig.label}
                        </Badge>
                      ) : (
                        <Badge variant="bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Availability note */}
                  {vendor.availabilityNote && vendor.availabilityStatus !== "AVAILABLE" && (
                    <div className="text-xs text-gray-500 italic bg-gray-50 rounded-md px-2.5 py-1.5">
                      {vendor.availabilityNote}
                    </div>
                  )}

                  {/* Contact */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <a href={`tel:${vendor.phone}`} className="hover:text-blue-600">
                        {vendor.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{vendor.email}</span>
                    </div>
                  </div>

                  {/* Skills */}
                  {vendor.skills.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {vendor.skills.map((skill) => (
                          <Badge key={skill.id} className="bg-blue-50 text-blue-700 text-xs">
                            {getCategoryLabel(skill.category)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {vendor._count.jobs} job{vendor._count.jobs !== 1 ? "s" : ""} total
                    </p>
                    {activeJobs > 0 && (
                      <p className="text-xs font-medium text-blue-600">
                        {activeJobs} active
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        basePath="/app/admin/vendors"
        total={total}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
