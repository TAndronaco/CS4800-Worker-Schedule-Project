"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./Navbar.module.css";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = localStorage.getItem("user");
    setLoggedIn(!!stored && stored !== "undefined" && stored !== "null");
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <nav className={styles.navbar}>
      <Link href={loggedIn ? "/dashboard" : "/"} className={styles.logo}>
        ShiftSync
      </Link>
      <div className={styles.links}>
        {loggedIn ? (
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
