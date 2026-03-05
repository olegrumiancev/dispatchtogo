import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, MapPin, Plus, ChevronRight } from "lucide-react";

export const metadata = {
  title: "Properties | DispatchToGo",
};

export default async function PropertiesPage() {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "OPERATOR") redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { organization: true },
  });

  if (!dbUser?.organization) redirect("/app/onboarding");
  const org = dbUser.organization;

  const properties = await prisma.property.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { serviceRequests: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage the locations for {org.name}.
          </p>
        </div>
        <Link
          href="/app/operator/properties/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Property
        </Link>
      </div>

      {/* Properties List */}
      {properties.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No properties yet.</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Add your first property to start submitting service requests.
            </p>
            <Link
              href="/app/operator/properties/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Property
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/app/operator/properties/${property.id}`}
              className="block"
            >
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 mt-1" />
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1">{property.name}</h3>

                  {property.address && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{property.address}</span>
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                    <span>
                      {property._count.serviceRequests} service request
                      {property._count.serviceRequests !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
