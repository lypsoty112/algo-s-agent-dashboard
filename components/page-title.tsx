"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

const PAGE_NAMES: Record<string, string> = {
  "/": "Overview",
  "/performance": "Performance",
  "/positions": "Positions",
  "/knowledge-base": "Knowledge Base",
  "/strategies": "Strategies",
};

export function PageTitle() {
  const pathname = usePathname();
  const name = PAGE_NAMES[pathname] ?? "Dashboard";

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>{name}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
