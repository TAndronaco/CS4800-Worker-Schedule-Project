"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./Navbar.module.css";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const router = useRouter();
  const user =
    typeof window === "undefined"
      ? null
      : (() => {
          const stored = localStorage.getItem("user");
          return stored && stored !== "undefined" && stored !== "null" ? JSON.parse(stored) : null;
        })();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.push("/");
  };

  return (
    <nav className={styles.navbar}>
      <Link href={user ? "/dashboard" : "/"} className={styles.logo}>
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
            <Link href="/pricing">Pricing</Link>
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
