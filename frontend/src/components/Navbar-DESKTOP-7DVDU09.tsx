"use client";

import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./Navbar.module.css";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [logoutCount, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const [user, setUser] = useState<{ first_name: string; role: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    setUser(stored && stored !== "undefined" && stored !== "null" ? JSON.parse(stored) : null);
  }, [pathname, logoutCount]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    forceUpdate();
    router.push("/");
  };

  return (
    <nav className={styles.navbar}>
      <Link href="/" className={styles.logo}>
        ShiftSync
      </Link>
      <div className={styles.links}>
        {user ? (
          <>
            <NotificationBell />
            <span style={{ color: "#555", fontSize: "0.9rem" }}>
              Hi, {user.first_name}
            </span>
            <button
              onClick={handleLogout}
              className={styles.registerBtn}
              style={{ cursor: "pointer", border: "none" }}
            >
              Log Out
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Sign In</Link>
            <Link href="/register" className={styles.registerBtn}>
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
