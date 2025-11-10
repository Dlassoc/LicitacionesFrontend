import React from "react";
import "../styles/features/skeleton-card.css";

export default function SkeletonCard() {
  return (
    <div className="skeleton-card-container">
      <div className="skeleton-card-title" />
      <div className="skeleton-card-lines">
        <div className="skeleton-card-line-1" />
        <div className="skeleton-card-line-2" />
        <div className="skeleton-card-line-3" />
      </div>
      <div className="skeleton-card-footer" />
      <div className="skeleton-card-footer-meta" />
    </div>
  );
}
