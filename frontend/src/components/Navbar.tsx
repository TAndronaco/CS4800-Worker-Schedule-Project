"use client";

import Link from "next/link";
import { useMemo, useReducer } from "react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [logoutCount, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const user = useMemo<{ first_name: string; role: string } | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read localStorage on route change and logout
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
