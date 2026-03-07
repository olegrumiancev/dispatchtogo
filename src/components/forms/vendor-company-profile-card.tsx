"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { Building2, MapPin, Phone, Mail, Star } from "lucide-react";
import VendorProfileForm from "@/components/forms/vendor-profile-form";

interface VendorCompanyProfileCardProps {
  vendorDisplay: {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    address: string | null;
    serviceRadiusKm: number | null;
    skills: Array<{ id: string; category: string }>;
  };
  vendorForm: {
    id: string;
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    address: string;
    serviceRadiusKm: number;
    categories: string[];
    multipleTeams: boolean;
  };
}

function getCategoryLabel(category: string) {
  return SERVICE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export default function VendorCompanyProfileCard({ vendorDisplay, vendorForm }: VendorCompanyProfileCardProps) {
  const [showEdit, setShowEdit] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Company Information</CardTitle>
          <Button
            type="button"
            variant={showEdit ? "secondary" : "primary"}
            size="sm"
            onClick={() => setShowEdit((prev) => !prev)}
          >
            {showEdit ? "Cancel" : "Edit"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showEdit ? (
          <VendorProfileForm vendor={vendorForm} onSaved={() => setShowEdit(false)} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Company Name</p>
                  <p className="text-sm font-medium text-gray-900">{vendorDisplay.companyName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Star className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Contact Name</p>
                  <p className="text-sm font-medium text-gray-900">{vendorDisplay.contactName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{vendorDisplay.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm text-gray-900">{vendorDisplay.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="text-sm text-gray-900">{vendorDisplay.address ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Service Radius</p>
                  <p className="text-sm text-gray-900">{vendorDisplay.serviceRadiusKm} km</p>
                </div>
              </div>
            </div>

            {vendorDisplay.skills.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Skills / Categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {vendorDisplay.skills.map((skill) => (
                    <Badge key={skill.id} variant="bg-blue-100 text-blue-700">
                      {getCategoryLabel(skill.category)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
