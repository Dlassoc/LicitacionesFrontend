import React from "react";
import ResultCardGrid from "./ResultCardGrid.jsx";
import CategorySection from "./CategorySection.jsx";

function CategoryFilters({
  preferredKeywords,
  showOnlyMatching,
  setShowOnlyMatching,
  resultadosFiltrados,
  filterCategory,
  setFilterCategory,
  allResultados,
  cumple,
  noCumple,
  sinDocumentos,
}) {
  return (
    <div className="rp-category-filters">
      {preferredKeywords && preferredKeywords.length > 0 && (
        <button
          className={`rp-filter-btn ${showOnlyMatching ? "active" : ""}`}
          onClick={() => setShowOnlyMatching(!showOnlyMatching)}
          title={showOnlyMatching ? "Mostrando solo coincidencias" : "Mostrar solo coincidencias con tus palabras clave"}
        >
          <span className="rp-filter-icon">✓</span>
          {showOnlyMatching ? `Coincidencias (${resultadosFiltrados.length})` : `Ver coincidencias (${resultadosFiltrados.length})`}
        </button>
      )}

      <button
        className={`rp-filter-btn ${filterCategory === "all" ? "active" : ""}`}
        onClick={() => setFilterCategory("all")}
      >
        Todos ({allResultados.length})
      </button>
      <button
        className={`rp-filter-btn ${filterCategory === "cumple" ? "active" : ""}`}
        onClick={() => setFilterCategory("cumple")}
      >
        Cumple ({cumple.length})
      </button>
      <button
        className={`rp-filter-btn ${filterCategory === "no-cumple" ? "active" : ""}`}
        onClick={() => setFilterCategory("no-cumple")}
      >
        No Cumple ({noCumple.length})
      </button>
      <button
        className={`rp-filter-btn ${filterCategory === "sin-documentos" ? "active" : ""}`}
        onClick={() => setFilterCategory("sin-documentos")}
      >
        Sin documentos ({sinDocumentos.length})
      </button>
    </div>
  );
}

function SingleCategoryGrid({ items, emptyMessage, onItemClick, onDiscard, analysisStatus }) {
  if (items.length > 0) {
    return (
      <ResultCardGrid
        items={items}
        onItemClick={onItemClick}
        onDiscard={onDiscard}
        analysisStatus={analysisStatus}
      />
    );
  }

  return (
    <div className="rp-empty" style={{ gridColumn: "1 / -1" }}>
      {emptyMessage}
    </div>
  );
}

export default function ResultsCategoryContent({
  preferredKeywords,
  showOnlyMatching,
  setShowOnlyMatching,
  resultadosFiltrados,
  filterCategory,
  setFilterCategory,
  allResultados,
  cumple,
  noCumple,
  sinDocumentos,
  sinRequisitos,
  sinAnalizar,
  expandedSections,
  setExpandedSections,
  onItemClick,
  onDiscard,
  analysisStatus,
}) {
  return (
    <>
      <CategoryFilters
        preferredKeywords={preferredKeywords}
        showOnlyMatching={showOnlyMatching}
        setShowOnlyMatching={setShowOnlyMatching}
        resultadosFiltrados={resultadosFiltrados}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        allResultados={allResultados}
        cumple={cumple}
        noCumple={noCumple}
        sinDocumentos={sinDocumentos}
      />

      {filterCategory === "all" && (
        <div className="rp-all-categories">
          <CategorySection
            items={cumple}
            title="CUMPLE REQUISITOS"
            count={cumple.length}
            sectionKey="cumple"
            expandedSections={expandedSections}
            setExpandedSections={setExpandedSections}
            onItemClick={onItemClick}
            onDiscard={onDiscard}
            analysisStatus={analysisStatus}
          />
          <CategorySection
            items={noCumple}
            title="NO CUMPLE REQUISITOS"
            count={noCumple.length}
            sectionKey="noCumple"
            expandedSections={expandedSections}
            setExpandedSections={setExpandedSections}
            onItemClick={onItemClick}
            onDiscard={onDiscard}
            analysisStatus={analysisStatus}
          />
          <CategorySection
            items={sinDocumentos}
            title="SIN DOCUMENTOS"
            count={sinDocumentos.length}
            sectionKey="sinDocumentos"
            expandedSections={expandedSections}
            setExpandedSections={setExpandedSections}
            onItemClick={onItemClick}
            onDiscard={onDiscard}
            analysisStatus={analysisStatus}
          />
          <CategorySection
            items={sinRequisitos}
            title="ANÁLISIS SIN REQUISITOS"
            count={sinRequisitos.length}
            sectionKey="sinRequisitos"
            expandedSections={expandedSections}
            setExpandedSections={setExpandedSections}
            onItemClick={onItemClick}
            onDiscard={onDiscard}
            analysisStatus={analysisStatus}
          />
          <CategorySection
            items={sinAnalizar}
            title="EN ANÁLISIS"
            count={sinAnalizar.length}
            sectionKey="sinAnalizar"
            expandedSections={expandedSections}
            setExpandedSections={setExpandedSections}
            onItemClick={onItemClick}
            onDiscard={onDiscard}
            analysisStatus={analysisStatus}
          />
        </div>
      )}

      {filterCategory === "cumple" && (
        <SingleCategoryGrid
          items={cumple}
          emptyMessage="No hay licitaciones que cumplan los requisitos."
          onItemClick={onItemClick}
          onDiscard={onDiscard}
          analysisStatus={analysisStatus}
        />
      )}

      {filterCategory === "no-cumple" && (
        <SingleCategoryGrid
          items={noCumple}
          emptyMessage="No hay licitaciones que no cumplan los requisitos en esta página."
          onItemClick={onItemClick}
          onDiscard={onDiscard}
          analysisStatus={analysisStatus}
        />
      )}

      {filterCategory === "sin-documentos" && (
        <SingleCategoryGrid
          items={sinDocumentos}
          emptyMessage="No hay licitaciones sin documentos en esta página."
          onItemClick={onItemClick}
          onDiscard={onDiscard}
          analysisStatus={analysisStatus}
        />
      )}
    </>
  );
}
