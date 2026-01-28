// src/components/Toast.jsx
import React, { useEffect } from 'react';
import '../styles/components/toast.css';

export default function Toast({ message, type = 'info', duration = 3000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'info': return 'ℹ';
      default: return 'ℹ';
    }
  };

  return (
    <div className={`notification-toast notification-toast-${type}`}>
      <span className="notification-toast-icon">{getIcon()}</span>
      <span className="notification-toast-message">{message}</span>
    </div>
  );
}
