import { apiDelete, apiGet, apiPost } from "../config/httpClient.js";

export const getUsers = () => apiGet("/admin/users");

export const getAdminHealthDashboard = () => apiGet("/admin/dashboard/health");

export const getAdminLogs = (params = {}) => {
  const searchParams = new URLSearchParams();

  const entries = {
    level: params.level,
    module: params.module,
    q: params.q,
    from: params.from,
    to: params.to,
    page: params.page,
    page_size: params.pageSize,
  };

  Object.entries(entries).forEach(([key, value]) => {
    if (value != null && String(value).trim() !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return apiGet(query ? `/admin/logs?${query}` : "/admin/logs");
};

export const createUser = (data) => apiPost("/admin/users", data);

export const deleteUser = (email) =>
  apiDelete(`/admin/users/${encodeURIComponent(String(email || "").trim())}`);

export const getUserSubscriptions = (email) =>
  apiGet(`/admin/users/${encodeURIComponent(String(email || "").trim())}/subscriptions`);

export const removeKeyword = (subId, keyword) =>
  apiDelete(`/admin/subscriptions/${encodeURIComponent(String(subId))}/keywords`, {
    body: { keyword },
  });
