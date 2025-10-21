import React from "react";

export default function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white border border-gray-200 rounded-xl p-4">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="mt-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
      <div className="mt-3 h-4 bg-gray-200 rounded w-1/4" />
      <div className="mt-2 h-3 bg-gray-200 rounded w-2/5" />
    </div>
  );
}
