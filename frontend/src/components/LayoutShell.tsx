"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import EmployeeLayout from "./EmployeeLayout";

const EMPLOYEE_PATHS = [
  "/dashboard",
  "/employee/schedule",
  "/employee/requests",
  "/employee/join",
  "/employee/performance",
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
    return stored ? JSON.parse(stored) : null;
  }, []);

  const isEmployeePage =
    user?.role === "employee" &&
    EMPLOYEE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isEmployeePage) {
    return <EmployeeLayout>{children}</EmployeeLayout>;
  }

  return <main>{children}</main>;
}
