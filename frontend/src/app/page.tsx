import styles from "./page.module.css";
import Link from "next/link";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>ShiftSync</h1>
        <p className={styles.subtitle}>
          Employee shift scheduling made simple. Create schedules, manage swaps,
          and keep your team in sync.
        </p>
        <div className={styles.ctas}>
          <Link href="/register" className={styles.primary}>
            Get Started
          </Link>
        </div>
      </main>
    </div>
  );
}