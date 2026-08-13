describe('Print Center & Invoice Data Integrity', () => {

  function normalizeInvoiceForPrint(inv) {
    if (!inv) return null;
    const items = (inv.items || inv.lineItems || inv.invoiceItems || []).map(item => ({
      productId: item.productId || item.id || '',
      variantId: item.variantId || null,
      name: item.name || item.productName || 'Unknown Item',
      sku: item.sku || '',
      barcode: item.barcode || '',
      unit: item.unit || 'unit',
      quantity: parseFloat(item.quantity) || 0,
      price: parseFloat(item.price || item.sellingPrice || item.unitPrice || item.rate || 0),
      unitPrice: parseFloat(item.price || item.sellingPrice || item.unitPrice || item.rate || 0),
      cost: parseFloat(item.cost || item.purchasePrice || 0),
      gstRate: parseFloat(item.gstRate !== undefined ? item.gstRate : (item.gst !== undefined ? item.gst : 0)),
      taxAmount: parseFloat(item.taxAmount || item.tax || 0),
      discount: parseFloat(item.discount || 0),
      lineTotal: parseFloat(item.lineTotal || (item.price || item.sellingPrice || 0) * (item.quantity || 0) || 0)
    }));

    return {
      ...inv,
      id: inv.id || inv.invoiceNumber || (inv._id ? inv._id.toString() : ''),
      invoiceNumber: inv.invoiceNumber || inv.id || '',
      date: inv.date || inv.createdAt || new Date().toISOString(),
      businessId: inv.businessId || inv.storeId || inv.locationId || '',
      storeId: inv.storeId || inv.locationId || inv.businessId || '',
      locationId: inv.locationId || inv.storeId || inv.businessId || '',
      customerId: inv.customerId || null,
      customerName: inv.customerName || '',
      items: items,
      subtotal: parseFloat(inv.subtotal) || 0,
      discount: parseFloat(inv.discount) || 0,
      tax: parseFloat(inv.tax) || 0,
      roundoff: parseFloat(inv.roundoff) || 0,
      grandtotal: parseFloat(inv.grandtotal || inv.grandTotal || inv.total || 0),
      grandTotal: parseFloat(inv.grandTotal || inv.grandtotal || inv.total || 0),
      paymentMode: (inv.paymentMode || inv.paymentMethod || 'CASH').toUpperCase(),
      status: inv.status || 'paid',
      createdBy: inv.createdBy || 'system',
      isArchived: !!inv.isArchived
    };
  }

  function resolveInvoiceBranding(inv, stores = [], businesses = []) {
    const fallback = { name: 'Store', subtitle: '', logo: null, address: '', phone: '', gstin: '', terms: 'Thank you for shopping!' };
    if (!inv) return fallback;
    const storeId = inv.storeId || inv.locationId || inv.businessId;
    let biz = null;
    if (storeId) {
      biz = stores.find(s => s.id === storeId);
      if (!biz) biz = businesses.find(b => b.id === storeId);
    }
    if (!biz && inv.businessId) {
      biz = businesses.find(b => b.id === inv.businessId);
    }
    if (!biz) {
      biz = businesses[0] || null;
    }
    if (!biz) return fallback;
    return {
      name: biz.name || fallback.name,
      subtitle: biz.subtitle || '',
      logo: biz.logo || null,
      address: biz.address || '',
      phone: biz.phone || '',
      gstin: biz.gstin || '',
      terms: biz.terms || fallback.terms
    };
  }

  test('1. Normalizes fresh POS invoice correctly with all 3 items', () => {
    const rawPosInvoice = {
      invoiceNumber: 'INV-2026-001',
      businessId: 'store-1',
      items: [
        { productId: 'prod-1', name: 'A2 Gir Cow Ghee', price: 850, quantity: 1, unit: '500ml', gst: 5 },
        { productId: 'prod-2', name: 'Cold Pressed Mustard Oil', price: 220, quantity: 2, unit: '1L', gst: 5 },
        { productId: 'prod-8', name: 'Loose Organic Paneer', price: 320, quantity: 0.5, unit: 'kg', gst: 0 }
      ],
      subtotal: 1450,
      tax: 64.5,
      discount: 0,
      grandTotal: 1514.5,
      paymentMode: 'UPI'
    };

    const normalized = normalizeInvoiceForPrint(rawPosInvoice);
    expect(normalized.items.length).toBe(3);
    expect(normalized.items[0].name).toBe('A2 Gir Cow Ghee');
    expect(normalized.items[0].lineTotal).toBe(850);
    expect(normalized.items[1].lineTotal).toBe(440);
    expect(normalized.items[2].quantity).toBe(0.5);
    expect(normalized.items[2].lineTotal).toBe(160);
    expect(normalized.grandtotal).toBe(1514.5);
    expect(normalized.paymentMode).toBe('UPI');
  });

  test('2. Normalizes legacy invoice with field aliases', () => {
    const legacyInvoice = {
      id: 'legacy-inv-99',
      storeId: 'outlet-blr',
      lineItems: [
        { id: 'p-1', productName: 'Raw Honey', unitPrice: 350, quantity: 1 }
      ],
      grandtotal: 350,
      paymentMethod: 'cash'
    };

    const normalized = normalizeInvoiceForPrint(legacyInvoice);
    expect(normalized.items.length).toBe(1);
    expect(normalized.items[0].name).toBe('Raw Honey');
    expect(normalized.items[0].price).toBe(350);
    expect(normalized.grandtotal).toBe(350);
    expect(normalized.paymentMode).toBe('CASH');
  });

  test('3. Resolves distinct store branding for multi-outlet billing', () => {
    const stores = [
      { id: 'store-banaswadi', name: 'VC Organic Banaswadi', logo: '/uploads/stores/banaswadi.png', address: 'Banaswadi, Bangalore', gstin: '29ABCDE1234F1Z5' },
      { id: 'store-indiranagar', name: 'VC Organic Indiranagar', logo: '/uploads/stores/indiranagar.png', address: 'Indiranagar, Bangalore', gstin: '29XYZAB5678C1Z2' }
    ];

    const invA = { id: 'INV-A', storeId: 'store-banaswadi' };
    const invB = { id: 'INV-B', storeId: 'store-indiranagar' };

    const brandA = resolveInvoiceBranding(invA, stores);
    const brandB = resolveInvoiceBranding(invB, stores);

    expect(brandA.name).toBe('VC Organic Banaswadi');
    expect(brandA.logo).toBe('/uploads/stores/banaswadi.png');
    expect(brandA.gstin).toBe('29ABCDE1234F1Z5');

    expect(brandB.name).toBe('VC Organic Indiranagar');
    expect(brandB.logo).toBe('/uploads/stores/indiranagar.png');
    expect(brandB.gstin).toBe('29XYZAB5678C1Z2');
  });
});
