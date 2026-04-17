import React from 'react';
import ResultCardGrid from './ResultCardGrid.jsx';

export default function CategorySection({
  items,
  title,
  count,
  sectionKey,
  expandedSections,
  setExpandedSections,
  onItemClick,
  onDiscard,
  analysisStatus,
}) {
  if (!items || items.length === 0) return null;

  const isExpanded = expandedSections[sectionKey];

  return (
    <div className="rp-category-section">
      <h3
        className="rp-category-title rp-category-title-collapsible"
        onClick={() =>
          setExpandedSections((prev) => ({
            ...prev,
            [sectionKey]: !prev[sectionKey],
          }))
        }
        style={{ cursor: 'pointer' }}
      >
        <span className="rp-collapse-icon">{isExpanded ? '▼' : '▶'}</span>
        {title} ({count})
      </h3>
      {isExpanded && (
        <ResultCardGrid
          items={items}
          onItemClick={onItemClick}
          onDiscard={onDiscard}
          analysisStatus={analysisStatus}
        />
      )}
    </div>
  );
}
