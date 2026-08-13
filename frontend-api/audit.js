window.api = window.api || {};

window.api.audit = {
  async list(limit = 1000) {
    const res = await window.api.request(`/api/v1/audit-logs?limit=${encodeURIComponent(limit)}`);
    return Array.isArray(res) ? res : res?.auditLogs || [];
  }
};
