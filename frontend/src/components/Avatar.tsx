"use client";

import { useRef } from "react";
import styles from "./Avatar.module.css";

interface AvatarProps {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  uploadable?: boolean;
  onUpload?: (base64: string) => void;
}

function getDiceBearUrl(firstName: string, lastName: string): string {
  const seed = `${firstName}${lastName}`.toLowerCase();
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=d4500a,b04008,ff8a50,e8652b&backgroundType=gradientLinear`;
}

export default function Avatar({
  firstName,
  lastName,
  avatarUrl,
  size = "md",
  uploadable = false,
  onUpload,
}: AvatarProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;

    // Max 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onUpload(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const imgSrc = avatarUrl || getDiceBearUrl(firstName, lastName);

  return (
    <div
      className={`${styles.avatar} ${styles[size]} ${uploadable ? styles.uploadable : ""}`}
      onClick={uploadable ? () => fileRef.current?.click() : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imgSrc} alt={`${firstName} ${lastName}`} />

      {uploadable && (
        <>
          <div className={styles.uploadOverlay}>📷</div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className={styles.hiddenInput}
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  );
}
