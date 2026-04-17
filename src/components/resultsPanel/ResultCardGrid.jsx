import React from 'react';
import ResultCard from '../../features/ResultCard.jsx';
import { getStatusForItem } from './classification.js';

export default function ResultCardGrid({ items, onItemClick, onDiscard, analysisStatus }) {
  return (
    <div className="rp-grid">
      {items.map((item, idx) => {
        const idPortafolio = item.ID_Portafolio || item.id_del_portafolio || item.referencia;
        const itemAnalysisStatus = getStatusForItem(idPortafolio, item, analysisStatus);

        return (
          <ResultCard
            key={`${item.Referencia_del_proceso || item.referencia || 'ref'}-${idx}`}
            item={item}
            onClick={() => onItemClick(item)}
            analysisStatus={itemAnalysisStatus}
            onDiscard={onDiscard}
          />
        );
      })}
    </div>
  );
}
