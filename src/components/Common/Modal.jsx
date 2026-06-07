import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

/**
 * Modal Component
 * Displays a floating window with an overlay.
 * Uses React Portal to append to document.body avoiding z-index stacking issues.
 */
const Modal = ({ isOpen, onClose, title, children, uiTheme }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="modal-overlay" onClick={onClose} data-testid="modal-overlay">
      <div 
        className={`modal-container theme-${uiTheme || 'vintage'}`} 
        onClick={(e) => e.stopPropagation()} /* Prevent click through to overlay */
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
