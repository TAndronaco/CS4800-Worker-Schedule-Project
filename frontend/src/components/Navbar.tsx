"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ first_name: string; role: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      setUser(null);
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
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