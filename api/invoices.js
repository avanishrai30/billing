api.invoices = {
  async list() {
    const res = await request('/api/v1/invoices');
    return Array.isArray(res) ? res : res?.invoices || [];
  },
  async save(invoiceData) {
    return await request('/api/v1/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData)
    });
  },
  async void(id) {
    return await request(`/api/v1/invoices/${id}/void`, {
      method: 'POST'
    });
  }
};
