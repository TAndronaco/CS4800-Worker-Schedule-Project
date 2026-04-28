"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import EmployeeLayout from "./EmployeeLayout";
import ManagerLayout from "./ManagerLayout";

const EMPLOYEE_PATHS = [
  "/dashboard",
  "/employee/schedule",
  "/employee/requests",
  "/employee/join",
  "/employee/time-off",
  "/employee/availability",
  "/messages",
  "/notifications",
];

const MANAGER_PATHS = [
  "/dashboard",
  "/manager/schedule",
  "/manager/requests",
  "/manager/teams",
  "/manager/analytics",
  "/manager/time-off",
  "/messages",
  "/notifications",
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
      } catch {
        // Silently fail, it's just a warmup ping
        console.log("Warmup ping failed (backend likely sleeping)");
      }
    };
    warmup();
  }, []);

  const [user, setUser] = useState<{ role: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    setUser(stored && stored !== "undefined" && stored !== "null" ? JSON.parse(stored) : null);
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
