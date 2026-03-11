"use client";

import { useEffect, useState } from "react";
import {
  ORGANIZATION_TYPES,
  SERVICE_CATEGORIES,
  type OrganizationTypeOption,
  type ServiceCategoryOption,
} from "@/lib/constants";

type CatalogResponse = {
  serviceCategories: ServiceCategoryOption[];
  organizationTypes: OrganizationTypeOption[];
};

export function useCatalogOptions() {
  const [serviceCategories, setServiceCategories] =
    useState<ServiceCategoryOption[]>([...SERVICE_CATEGORIES]);
  const [organizationTypes, setOrganizationTypes] =
    useState<OrganizationTypeOption[]>([...ORGANIZATION_TYPES]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/catalog", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CatalogResponse | null) => {
        if (cancelled || !data) return;
        if (Array.isArray(data.serviceCategories) && data.serviceCategories.length > 0) {
          setServiceCategories(data.serviceCategories);
        }
        if (Array.isArray(data.organizationTypes) && data.organizationTypes.length > 0) {
          setOrganizationTypes(data.organizationTypes);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    serviceCategories,
    organizationTypes,
    loading,
  };
}
