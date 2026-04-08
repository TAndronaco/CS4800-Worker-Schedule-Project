import styles from "./page.module.css";
import Link from "next/link";
import Image from "next/image";

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
        </div>
        <div className={styles.testButtons}>
          <p className={styles.testLabel}>Quick Test Access</p>
          <div className={styles.ctas}>
            <Link href="/dashboard?role=employee" className={styles.testBtn}>
              Employee View
            </Link>
            <Link href="/dashboard?role=manager" className={styles.testBtn}>
              Manager View
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}