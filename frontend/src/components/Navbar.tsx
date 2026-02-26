"use client";

import Link from "next/link";
import styles from "./Navbar.module.css";

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <Link href="/" className={styles.logo}>
        ShiftSync
      </Link>
      <div className={styles.links}>
        <Link href="/login">Sign In</Link>
        <Link href="/register" className={styles.registerBtn}>
          Sign Up
        </Link>
      </div>
    </nav>
  );
}
