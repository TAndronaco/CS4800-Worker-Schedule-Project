"use client";

import { useMemo, useEffect } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
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

  // "Warm up" the backend and Neon database on app load
  useEffect(() => {
    const warmup = async () => {
      try {
        // Hitting the health endpoint (which now pings the DB) 
        // will wake up both Render and Neon if they are sleeping.
        await apiFetch("/health");
      } catch (e) {
        // Silently fail, it's just a warmup ping
        console.log("Warmup ping failed (backend likely sleeping)");
      }
    };
    warmup();
  }, []);

  const user = useMemo<{ role: string } | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    return stored && stored !== "undefined" && stored !== "null" ? JSON.parse(stored) : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read localStorage on route change
  }, [pathname]);

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
