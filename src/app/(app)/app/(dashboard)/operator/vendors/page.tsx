"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SERVICE_CATEGORIES } from "@/lib/constants";

interface Vendor {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  serviceCategories: string[];
  coverageRadius: number;
  isActive: boolean;
  user: {
    isApproved: boolean;
  };
}

function getCategoryLabel(value: string) {
  return SERVICE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export default function OperatorVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    const res = await fetch(`/api/operator/vendors?${params.toString()}`);
    const data = await res.json();
    setVendors(data.vendors ?? []);
    setLoading(false);
  }, [search, category]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
        <p className="text-sm text-gray-500 mt-1">Browse approved vendors in your network</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">All Categories</option>
          {SERVICE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <Button variant="outline" onClick={fetchVendors} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading vendors...</div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No vendors found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vendors.map((vendor) => (
            <Card key={vendor.id} className="p-4">
              <CardHeader className="p-0 pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{vendor.companyName}</CardTitle>
                  <Badge
                    variant={vendor.isActive && vendor.user.isApproved ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}
                  >
                    {vendor.isActive && vendor.user.isApproved ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Contact</p>
                    <p className="text-gray-700">{vendor.contactName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <a href={`tel:${vendor.phone}`} className="text-blue-600 text-sm">{vendor.phone}</a>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="text-gray-700 truncate">{vendor.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Coverage</p>
                    <p className="text-gray-700">{vendor.coverageRadius} km</p>
                  </div>
                </div>
                {vendor.serviceCategories.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Services</p>
                    <div className="flex flex-wrap gap-1">
                      {vendor.serviceCategories.map((cat) => (
                        <span key={cat} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                          {getCategoryLabel(cat)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
