"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const features = [
  {
    icon: "📅",
    title: "Smart Scheduling",
    description:
      "Create and manage employee schedules with drag-and-drop simplicity. Auto-generate optimal schedules based on availability and preferences.",
  },
  {
    icon: "🔄",
    title: "Shift Swaps",
    description:
      "Employees can propose shift swaps directly. Managers approve with one click — no more back-and-forth emails.",
  },
  {
    icon: "⏱️",
    title: "Clock In/Out",
    description:
      "Built-in time tracking with live timers. Employees clock in and out from any device, and hours are logged automatically.",
  },
  {
    icon: "📊",
    title: "Analytics & Insights",
    description:
      "Track coverage gaps, overtime hours, and headcount trends. Make data-driven decisions about your workforce.",
  },
  {
    icon: "💬",
    title: "Team Messaging",
    description:
      "Direct messages and group chats keep your team connected. No need for separate communication tools.",
  },
  {
    icon: "🏖️",
    title: "Time-Off Management",
    description:
      "Employees submit time-off requests in seconds. Managers review and approve without leaving the platform.",
  },
  {
    icon: "📈",
    title: "Performance Tracking",
    description:
      "Monitor on-time rates, shifts completed, and attendance. Identify top performers and address issues early.",
  },
  {
    icon: "🔔",
    title: "Real-Time Notifications",
    description:
      "Stay informed with instant notifications for schedule changes, swap requests, and approvals.",
  },
  {
    icon: "📋",
    title: "Schedule Templates",
    description:
      "Save your best schedules as templates. Load and apply them in one click for recurring weekly patterns.",
  },
];

export default function FeaturesPage() {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
    );

    cardsRef.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Everything you need to
          <span className={styles.highlight}> manage shifts</span>
        </h1>
        <p className={styles.heroSub}>
          Powerful features designed for teams of all sizes. From scheduling to
          analytics, ShiftSync has you covered.
        </p>
      </section>

      <section className={styles.grid}>
        {features.map((feature, i) => (
          <div
            key={feature.title}
            ref={(el) => { cardsRef.current[i] = el; }}
            className={styles.card}
            style={{ transitionDelay: `${(i % 3) * 100}ms` }}
          >
            <span className={styles.icon}>{feature.icon}</span>
            <h3 className={styles.cardTitle}>{feature.title}</h3>
            <p className={styles.cardDesc}>{feature.description}</p>
          </div>
        ))}
      </section>

      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Ready to simplify scheduling?</h2>
        <p className={styles.ctaSub}>
          Join teams already using ShiftSync to save time and reduce scheduling headaches.
        </p>
        <Link href="/" className={styles.ctaBtn}>
          Get Started Free
        </Link>
      </section>
    </div>
  );
}
