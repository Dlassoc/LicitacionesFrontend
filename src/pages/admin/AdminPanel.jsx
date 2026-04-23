import React, { useCallback, useEffect, useMemo, useState } from "react";

import AdminLayout from "./AdminLayout.jsx";
import AdminSidebar from "./AdminSidebar.jsx";
import CreateUserModal from "./CreateUserModal.jsx";
import DashboardView from "./DashboardView.jsx";
import DeleteUserModal from "./DeleteUserModal.jsx";
import LogsView from "./LogsView.jsx";
import UsersView from "./UsersView.jsx";
import {
  createUser,
  deleteUser,
  getAdminHealthDashboard,
  getAdminLogs,
  getUserSubscriptions,
  getUsers,
  removeKeyword,
} from "../../services/adminService.js";

const PAGE_SIZE = 8;
const DASHBOARD_REFRESH_MS = 60000;
const LOGS_PAGE_SIZE = 40;

function getErrorMessage(error, fallback) {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error?.message) return error.message;
  return fallback;
}

function keywordActionKey(subscriptionId, keyword) {
  return `${subscriptionId}:${String(keyword || "").trim().toLowerCase()}`;
}

export default function AdminPanel() {
  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState("");

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedUser, setSelectedUser] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [subscriptionsError, setSubscriptionsError] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletingUser, setDeletingUser] = useState(false);

  const [removingKeywordKey, setRemovingKeywordKey] = useState("");

  const [notice, setNotice] = useState(null);

  const [dashboard, setDashboard] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [refreshingDashboard, setRefreshingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsStats, setLogsStats] = useState({ total: 0, levelCounts: {} });
  const [logsFilters, setLogsFilters] = useState({ level: "", module: "", q: "" });

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError("");

    try {
      const data = await getUsers();
      const nextUsers = Array.isArray(data?.users) ? data.users : [];
      setUsers(nextUsers);
    } catch (error) {
      setUsers([]);
      setUsersError(getErrorMessage(error, "No fue posible cargar usuarios."));
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshingDashboard(true);
    } else {
      setLoadingDashboard(true);
    }

    try {
      const data = await getAdminHealthDashboard();
      setDashboard(data?.dashboard || null);
      setDashboardError("");
    } catch (error) {
      setDashboardError(getErrorMessage(error, "No fue posible cargar el dashboard de salud."));
    } finally {
      if (silent) {
        setRefreshingDashboard(false);
      } else {
        setLoadingDashboard(false);
      }
    }
  }, []);

  const loadSubscriptionsForUser = useCallback(async (user) => {
    if (!user?.email) {
      setSubscriptions([]);
      return;
    }

    setSelectedUser(user);
    setLoadingSubscriptions(true);
    setSubscriptionsError("");

    try {
      const data = await getUserSubscriptions(user.email);
      setSubscriptions(Array.isArray(data?.subscriptions) ? data.subscriptions : []);
    } catch (error) {
      setSubscriptions([]);
      setSubscriptionsError(getErrorMessage(error, "No fue posible cargar las suscripciones."));
    } finally {
      setLoadingSubscriptions(false);
    }
  }, []);

  const loadLogs = useCallback(async ({ page = 1, filters = logsFilters } = {}) => {
    setLoadingLogs(true);
    setLogsError("");

    try {
      const data = await getAdminLogs({
        ...filters,
        page,
        pageSize: LOGS_PAGE_SIZE,
      });

      const nextItems = Array.isArray(data?.items) ? data.items : [];
      setLogs(nextItems);
      setLogsPage(Number(data?.pagination?.page || page));
      setLogsTotalPages(Math.max(1, Number(data?.pagination?.total_pages || 1)));
      setLogsStats({
        total: Number(data?.stats?.total || 0),
        levelCounts: data?.stats?.level_counts || {},
      });
    } catch (error) {
      setLogs([]);
      setLogsError(getErrorMessage(error, "No fue posible cargar logs del sistema."));
    } finally {
      setLoadingLogs(false);
    }
  }, [logsFilters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadDashboard({ silent: true });
    }, DASHBOARD_REFRESH_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadDashboard]);

  useEffect(() => {
    if (activeView === "logs" && !loadingLogs && !logsError && logs.length === 0) {
      loadLogs({ page: 1, filters: logsFilters });
    }
  }, [activeView, loadLogs, loadingLogs, logs.length, logsFilters, logsError]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredUsers = useMemo(() => {
    const term = String(search || "").trim().toLowerCase();
    if (!term) return users;

    return users.filter((user) => {
      const email = String(user?.email || "").toLowerCase();
      const name = String(user?.name || "").toLowerCase();
      return email.includes(term) || name.includes(term);
    });
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const mipymeUsers = users.filter((user) => user.is_mypyme).length;
    const activeSubscriptions = users.reduce(
      (sum, user) => sum + Number(user.active_subscriptions || 0),
      0
    );
    const totalKeywords = users.reduce((sum, user) => sum + Number(user.keyword_count || 0), 0);

    return {
      totalUsers,
      mipymeUsers,
      activeSubscriptions,
      totalKeywords,
    };
  }, [users]);

  const handleCreateUser = async (formData) => {
    setCreatingUser(true);
    setCreateError("");

    try {
      await createUser(formData);
      setCreateModalOpen(false);
      setNotice({ type: "success", text: "Usuario creado correctamente." });
      await loadUsers();
    } catch (error) {
      setCreateError(getErrorMessage(error, "No se pudo crear el usuario."));
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget?.email) return;

    setDeletingUser(true);
    setDeleteError("");

    try {
      await deleteUser(deleteTarget.email);
      setDeleteTarget(null);
      setNotice({ type: "success", text: "Usuario eliminado correctamente." });

      if (selectedUser?.email === deleteTarget.email) {
        setSelectedUser(null);
        setSubscriptions([]);
      }

      await loadUsers();
    } catch (error) {
      setDeleteError(getErrorMessage(error, "No se pudo eliminar el usuario."));
    } finally {
      setDeletingUser(false);
    }
  };

  const handleRemoveKeyword = async (subscriptionId, keyword) => {
    const actionKey = keywordActionKey(subscriptionId, keyword);
    setRemovingKeywordKey(actionKey);
    setNotice(null);

    try {
      await removeKeyword(subscriptionId, keyword);
      setNotice({ type: "success", text: "Keyword eliminada correctamente." });

      if (selectedUser) {
        await loadSubscriptionsForUser(selectedUser);
      }
      await loadUsers();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error, "No se pudo eliminar la keyword.") });
    } finally {
      setRemovingKeywordKey("");
    }
  };

  return (
    <AdminLayout>
      <div className="admin-layout-with-sidebar">
        <AdminSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className="admin-content-area">
          {notice ? (
            <div className={`admin-alert ${notice.type === "error" ? "error" : "success"}`}>
              {notice.text}
            </div>
          ) : null}

          {activeView === "dashboard" && (
            <DashboardView
              dashboard={dashboard}
              loading={loadingDashboard}
              refreshing={refreshingDashboard}
              error={dashboardError}
              onRefresh={() => loadDashboard({ silent: Boolean(dashboard) })}
              stats={stats}
            />
          )}

          {activeView === "usuarios" && (
            <UsersView
              users={filteredUsers}
              loading={loadingUsers}
              error={usersError}
              search={search}
              onSearchChange={setSearch}
              pagedUsers={pagedUsers}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onViewKeywords={loadSubscriptionsForUser}
              selectedUser={selectedUser}
              subscriptions={subscriptions}
              subscriptionsLoading={loadingSubscriptions}
              subscriptionsError={subscriptionsError}
              onRemoveKeyword={handleRemoveKeyword}
              removingKeywordKey={removingKeywordKey}
              onCreateClick={() => setCreateModalOpen(true)}
              onDeleteClick={(user) => {
                setDeleteTarget(user);
                setDeleteError("");
              }}
            />
          )}

          {activeView === "logs" && (
            <LogsView
              items={logs}
              loading={loadingLogs}
              error={logsError}
              filters={logsFilters}
              stats={logsStats}
              page={logsPage}
              totalPages={logsTotalPages}
              onApplyFilters={(nextFilters) => {
                const normalized = {
                  level: nextFilters?.level || "",
                  module: nextFilters?.module || "",
                  q: nextFilters?.q || "",
                };
                setLogsFilters(normalized);
                setLogsPage(1);
                loadLogs({ page: 1, filters: normalized });
              }}
              onRefresh={() => loadLogs({ page: logsPage, filters: logsFilters })}
              onPageChange={(nextPage) => {
                setLogsPage(nextPage);
                loadLogs({ page: nextPage, filters: logsFilters });
              }}
            />
          )}
        </main>
      </div>

      <CreateUserModal
        open={createModalOpen}
        onClose={() => {
          if (!creatingUser) {
            setCreateModalOpen(false);
            setCreateError("");
          }
        }}
        onSubmit={handleCreateUser}
        loading={creatingUser}
        error={createError}
      />

      <DeleteUserModal
        open={!!deleteTarget}
        user={deleteTarget}
        onClose={() => {
          if (!deletingUser) {
            setDeleteTarget(null);
            setDeleteError("");
          }
        }}
        onConfirm={handleDeleteUser}
        loading={deletingUser}
        error={deleteError}
      />
    </AdminLayout>
  );
}
