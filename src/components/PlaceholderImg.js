import React from "react";

/**
 * Placeholder image component for documentation screenshots.
 * Replace with actual screenshots when available.
 */
export default function PlaceholderImg({ caption, aspect = "9 / 16" }) {
  return (
    <figure style={{ margin: "1rem 0" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          border: "2px dashed var(--ifm-color-emphasis-300)",
          borderRadius: "12px",
          backgroundColor: "var(--ifm-color-emphasis-100)",
          aspectRatio: aspect,
          maxWidth: "260px",
          width: "100%",
          margin: "0 auto",
          padding: "1rem",
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ color: "var(--ifm-color-emphasis-400)", marginBottom: "0.5rem" }}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--ifm-color-emphasis-500)",
            textAlign: "center",
          }}
        >
          {caption}
        </span>
      </div>
      <figcaption
        style={{
          marginTop: "0.5rem",
          textAlign: "center",
          fontSize: "0.8rem",
          color: "var(--ifm-color-emphasis-600)",
          fontStyle: "italic",
        }}
      >
        {caption}
      </figcaption>
    </figure>
  );
}
