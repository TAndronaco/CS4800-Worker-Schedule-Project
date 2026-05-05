"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Image
          src="/logo.png"
          alt="ShiftSync - Simple Scheduling Made Easy"
          width={500}
          height={273}
          className={styles.logo}
          priority
        />
        <p className={styles.subtitle}>
          Employee shift scheduling made simple. Create schedules, manage swaps,
          and keep your team in sync.
        </p>
        <div className={styles.ctas}>
          <Link href="/register" className={styles.primary}>
            Get Started
          </Link>
          <Link href="/login" className={styles.secondary}>
            Sign In
          </Link>
        </div>
      </main>
    </div>
  );
}
