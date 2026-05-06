"use client";

import styles from "./page.module.css";

const team = [
  { name: "Nicolas Tran", role: "Full-Stack Developer", github: "chablades" },
  { name: "Thaimas Andronaco", role: "Full-Stack Developer", github: "TAndronaco" },
  { name: "Khine Zar Hein", role: "Full-Stack Developer", github: "Khine12" },
];

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>About ShiftSync</h1>
        <p className={styles.heroSub}>
          Built by students, designed for real teams.
        </p>
      </section>

      <section className={styles.story}>
        <div className={styles.storyContent}>
          <h2 className={styles.sectionTitle}>Our Story</h2>
          <p className={styles.text}>
            ShiftSync was born out of a CS4800 Software Engineering course project at Cal Poly Pomona.
            We noticed that many small businesses still rely on spreadsheets, group texts, and sticky
            notes to manage employee schedules — leading to missed shifts, confusion, and frustration.
          </p>
          <p className={styles.text}>
            We set out to build a modern, intuitive platform that makes shift scheduling effortless.
            From auto-generating schedules based on availability to real-time swap requests and
            performance tracking, ShiftSync brings everything together in one place.
          </p>
        </div>
      </section>

      <section className={styles.values}>
        <h2 className={styles.sectionTitle}>What We Believe</h2>
        <div className={styles.valueGrid}>
          <div className={styles.valueCard}>
            <span className={styles.valueIcon}>⚡</span>
            <h3>Simplicity First</h3>
            <p>Scheduling shouldn&apos;t require a manual. We design for clarity and speed.</p>
          </div>
          <div className={styles.valueCard}>
            <span className={styles.valueIcon}>🤝</span>
            <h3>Team Empowerment</h3>
            <p>Give employees ownership of their schedule with self-service tools.</p>
          </div>
          <div className={styles.valueCard}>
            <span className={styles.valueIcon}>📐</span>
            <h3>Thoughtful Design</h3>
            <p>Every feature is crafted to reduce friction and save time for managers and staff alike.</p>
          </div>
        </div>
      </section>

      <section className={styles.teamSection}>
        <h2 className={styles.sectionTitle}>The Team</h2>
        <div className={styles.teamGrid}>
          {team.map((member) => (
            <div key={member.name} className={styles.teamCard}>
              <div className={styles.avatar}>
                {member.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <h3 className={styles.memberName}>{member.name}</h3>
              <p className={styles.memberRole}>{member.role}</p>
              <a
                href={`https://github.com/${member.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.github}
              >
                @{member.github}
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.tech}>
        <h2 className={styles.sectionTitle}>Built With</h2>
        <div className={styles.techGrid}>
          {["Next.js", "React", "TypeScript", "Express", "PostgreSQL", "Vercel", "Render", "Neon"].map(
            (t) => (
              <span key={t} className={styles.techBadge}>
                {t}
              </span>
            )
          )}
        </div>
      </section>
    </div>
  );
}
