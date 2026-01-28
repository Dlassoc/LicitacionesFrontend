// src/layouts/RootLayout.jsx
import React from "react";
import Header from "../components/Header.jsx";
import "../styles/global/header.css";

export default function RootLayout({ children }) {
  return (
    <div className="min-h-screen main-bg">
      <Header />
      {children}
    </div>
  );
}
