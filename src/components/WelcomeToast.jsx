import React, { useEffect, useState } from "react";
import "../styles/components/toast.css";

export default function WelcomeToast({ text = "Bienvenido", timeout = 2500 }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), timeout);
    return () => clearTimeout(t);
  }, [timeout]);
  if (!show) return null;

  return (
    <div className="toast">
      <div className="toast-dot" />
      <span className="toast-text">{text}</span>
    </div>
  );
}
