api.audit = {
  async list() {
    const res = await request('/api/v1/audit-logs');
    return Array.isArray(res) ? res : res?.auditLogs || [];
  }
};
