"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import EmployeeLayout from "./EmployeeLayout";
import ManagerLayout from "./ManagerLayout";

const EMPLOYEE_PATHS = [
  "/dashboard",
  "/employee/schedule",
  "/employee/requests",
  "/employee/join",
  "/employee/performance",
  "/messages",
];

const MANAGER_PATHS = [
  "/dashboard",
  "/manager/schedule",
  "/manager/requests",
  "/manager/teams",
  "/manager/performance",
  "/messages",
];

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const user = useMemo<{ role: string } | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    return stored && stored !== "undefined" && stored !== "null" ? JSON.parse(stored) : null;
  }, []);

  const isEmployeePage =
    user?.role === "employee" &&
    EMPLOYEE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const isManagerPage =
    user?.role === "manager" &&
    MANAGER_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isEmployeePage) {
    return <EmployeeLayout>{children}</EmployeeLayout>;
  }

  if (isManagerPage) {
    return <ManagerLayout>{children}</ManagerLayout>;
  }

  return <main>{children}</main>;
}
