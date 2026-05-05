"use client";

import Link from "next/link";
import styles from "./page.module.css";

interface PricingTier {
  name: string;
  price: number | "Free";
  description: string;
  memberLimit: number | string;
  features: string[];
  highlighted?: boolean;
}

const tiers: PricingTier[] = [
  {
    name: "Basic",
    price: "Free",
    description: "Perfect for small teams just getting started",
    memberLimit: "Up to 6 members",
    features: [
      "Basic shift scheduling",
      "Employee roster",
      "Message communication",
      "Clock in/out tracking",
      "Performance metrics",
    ],
  },
  {
    name: "Team",
    price: 10,
    description: "Great for growing teams",
    memberLimit: "Up to 50 members",
    features: [
      "Everything in Basic",
      "Advanced scheduling",
      "Shift templates & auto-generate",
      "Shift swap requests",
      "Time-off management",
      "Schedule export (CSV)",
    ],
  },
  {
    name: "Pro",
    price: 20,
    description: "Ideal for established companies",
    memberLimit: "Up to 300 members",
    features: [
      "Everything in Team",
      "Team analytics & coverage gaps",
      "Overtime tracking",
      "Custom team settings",
      "Advanced reporting",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: 50,
    description: "For large-scale operations",
    memberLimit: "300+ members",
    features: [
      "Everything in Pro",
      "Unlimited scaling",
      "Multi-team management",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className={styles.page}>
      {/* Header */}
      <section className={styles.header}>
        <h1>Simple, Transparent Pricing</h1>
        <p>Choose the perfect plan for your team's needs</p>
      </section>

      {/* Pricing Cards */}
      <section className={styles.cardsContainer}>
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`${styles.card} ${tier.highlighted ? styles.highlighted : ""}`}
          >
            {tier.highlighted && (
              <div className={styles.badge}>Most Popular</div>
            )}

            <h2 className={styles.tierName}>{tier.name}</h2>
            <p className={styles.tierDescription}>{tier.description}</p>

            <div className={styles.priceSection}>
              <span className={styles.price}>
                {typeof tier.price === "number" ? "$" : ""}
                {tier.price}
              </span>
              {typeof tier.price === "number" && (
                <span className={styles.billingPeriod}>/month</span>
              )}
            </div>

            <p className={styles.memberLimit}>{tier.memberLimit}</p>

            <button
              className={`${styles.cta} ${
                tier.highlighted ? styles.ctaPrimary : styles.ctaSecondary
              }`}
            >
              Get Started
            </button>

            <ul className={styles.featuresList}>
              {tier.features.map((feature, idx) => (
                <li key={idx} className={styles.featureItem}>
                  <span className={styles.checkmark}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* FAQ / Bottom CTA */}
      <section className={styles.cta_section}>
        <h2>Questions about pricing?</h2>
        <p>
          Start with a free Basic plan and upgrade whenever you're ready. No credit
          card required.
        </p>
        <Link href="/register" className={styles.ctaLink}>
          Create Your Team
        </Link>
      </section>
    </div>
  );
}
