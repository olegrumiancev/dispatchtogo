import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { Phone, Mail, Building2, CheckCircle, XCircle } from "lucide-react";

function getCategoryLabel(category: string) {
  return SERVICE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export default async function AdminVendorsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  const vendors = await prisma.vendor.findMany({
    include: {
      skills: true,
      _count: {
        select: {
          jobs: true,
        },
      },
    },
    orderBy: { companyName: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
        <span className="text-sm text-gray-500">{vendors.length} vendors</span>
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
          {vendors.map((vendor) => (
            <Card key={vendor.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{vendor.companyName}</CardTitle>
                  <Badge
                    variant={
                      vendor.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {vendor.isActive ? (
                      <><CheckCircle className="w-3 h-3 mr-1" />Active</>
                    ) : (
                      <><XCircle className="w-3 h-3 mr-1" />Inactive</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
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
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    {vendor._count.jobs} job{vendor._count.jobs !== 1 ? "s" : ""} total
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
