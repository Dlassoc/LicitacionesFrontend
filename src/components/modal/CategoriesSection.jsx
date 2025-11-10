/**
 * CategoriesSection - Sección de categorías del proceso
 * Muestra código de categoría principal y categorías adicionales
 */

import "../../styles/components/categories-section.css";

export default function CategoriesSection({ codigoPrincipal, categoriasAdicionales }) {
  // Si no hay categorías, no renderizar nada
  if (!codigoPrincipal && !categoriasAdicionales) return null;

  return (
    <div className="categories-section-container">
      <div className="categories-section-box">
        {/* Código Principal */}
        {codigoPrincipal && (
          <div className="categories-section-group">
            <h5 className="categories-section-label">
              📁 Categoría Principal
            </h5>
            <div className="categories-section-primary">
              {codigoPrincipal}
            </div>
          </div>
        )}

        {/* Categorías Adicionales */}
        {categoriasAdicionales && (
          <div className="categories-section-group">
            <h5 className="categories-section-label">
              🏷️ Categorías Adicionales
            </h5>
            <div className="categories-section-additional-list">
              {typeof categoriasAdicionales === "string" 
                ? categoriasAdicionales.split(",").map((cat, idx) => (
                    <span
                      key={idx}
                      className="categories-section-additional-item"
                    >
                      {cat.trim()}
                    </span>
                  ))
                : Array.isArray(categoriasAdicionales) 
                  ? categoriasAdicionales.map((cat, idx) => (
                      <span
                        key={idx}
                        className="categories-section-additional-item"
                      >
                        {String(cat).trim()}
                      </span>
                    ))
                  : (
                    <span className="categories-section-text">
                      {String(categoriasAdicionales)}
                    </span>
                  )
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
