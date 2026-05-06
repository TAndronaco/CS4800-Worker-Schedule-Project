"use client";

import Link from "next/link";
import styles from "./Navbar.module.css";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const user =
    typeof window === "undefined"
      ? null
      : (() => {
          const stored = localStorage.getItem("user");
          return stored && stored !== "undefined" && stored !== "null" ? JSON.parse(stored) : null;
        })();

  return (
    <nav className={styles.navbar}>
      <Link href={user ? "/dashboard" : "/"} className={styles.logo}>
        ShiftSync
      </Link>
      <div className={styles.links}>
        {user ? (
          <NotificationBell />
        ) : (
          <>
            <Link href="/features">Features</Link>
            <Link href="/about">About</Link>
            <Link href="/pricing">Pricing</Link>
          </>
        )}
      </div>
    </nav>
  );
}
