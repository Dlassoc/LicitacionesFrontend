import React from "react";
import SystemHealthDashboard from "./SystemHealthDashboard.jsx";

export default function DashboardView({ dashboard, loading, refreshing, error, onRefresh, stats }) {
  return (
    <div className="admin-view admin-dashboard-view">
      <div className="admin-view-header">
        <h2>Dashboard de Salud del Sistema</h2>
        <p className="admin-view-description">Monitoreo de métricas y rendimiento en tiempo real</p>
      </div>

      <SystemHealthDashboard
        dashboard={dashboard}
        loading={loading}
        refreshing={refreshing}
        error={error}
        onRefresh={onRefresh}
      />

      {stats && (
        <section className="admin-stats-row">
          <div className="admin-stat-card">
            <div className="label">Usuarios totales</div>
            <div className="value">{stats.totalUsers}</div>
            <div className="sub">Registrados en la plataforma</div>
          </div>

          <div className="admin-stat-card">
            <div className="label">Usuarios MiPyme</div>
            <div className="value">{stats.mipymeUsers}</div>
            <div className="sub">
              {stats.totalUsers > 0 ? ((stats.mipymeUsers / stats.totalUsers) * 100).toFixed(1) : "0.0"}% del total
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="label">Suscripciones activas</div>
            <div className="value">{stats.activeSubscriptions}</div>
            <div className="sub">Con keywords configuradas</div>
          </div>

          <div className="admin-stat-card">
            <div className="label">Palabras clave</div>
            <div className="value">{stats.totalKeywords}</div>
            <div className="sub">Total en el sistema</div>
          </div>
        </section>
      )}
    </div>
  );
}
