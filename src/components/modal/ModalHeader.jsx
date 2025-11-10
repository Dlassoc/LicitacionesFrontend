/**
 * ModalHeader - Encabezado del modal de resultado
 * Muestra título y línea divisoria
 */

import "../../styles/components/modal-header.css";

export default function ModalHeader({ title }) {
  return (
    <div className="modal-header-container">
      <h2
        id="modal-title"
        className="modal-header-title"
      >
        <span className="modal-header-title-text">
          {title}
        </span>
      </h2>

      <div className="modal-header-divider" />
    </div>
  );
}
