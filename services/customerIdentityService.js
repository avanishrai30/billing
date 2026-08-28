function normalizeCustomerPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

async function findCustomersByCanonicalPhone(db, phone) {
  const phoneCanonical = normalizeCustomerPhone(phone);
  if (!phoneCanonical) return [];

  const candidates = await db.collection('customers').find({
    $or: [
      { phoneCanonical },
      { normalizedPhone: phoneCanonical },
      { phone: phoneCanonical }
    ]
  }).toArray();

  const unique = new Map();
  for (const customer of candidates) {
    if (normalizeCustomerPhone(customer.phoneCanonical || customer.normalizedPhone || customer.phone) === phoneCanonical) {
      unique.set(customer.id || customer._id || customer.phone, customer);
    }
  }
  return Array.from(unique.values());
}

async function resolveCustomerSnapshot(db, input = {}) {
  const phoneCanonical = normalizeCustomerPhone(input.phone || input.customerPhone);
  if (!phoneCanonical) {
    return {
      customerId: input.id || input.customerId || null,
      customerName: input.name || input.customerName || 'Walk-in Customer',
      customerPhone: input.phone || input.customerPhone || null,
      phoneCanonical: ''
    };
  }

  const matches = await findCustomersByCanonicalPhone(db, phoneCanonical);
  if (matches.length > 1) {
    const err = new Error(`Duplicate customer records found for phone ${phoneCanonical}`);
    err.code = 'DUPLICATE_CUSTOMER_PHONE';
    err.matches = matches.map(c => ({ id: c.id, name: c.name, phone: c.phone }));
    throw err;
  }

  if (matches.length === 1) {
    const customer = matches[0];
    return {
      customerId: customer.id || input.id || input.customerId || null,
      customerName: customer.name || input.name || input.customerName || 'Walk-in Customer',
      customerPhone: phoneCanonical,
      phoneCanonical,
      customer
    };
  }

  return {
    customerId: input.id === 'walk-in' ? null : (input.id || input.customerId || null),
    customerName: input.name || input.customerName || 'Walk-in Customer',
    customerPhone: phoneCanonical,
    phoneCanonical
  };
}

module.exports = {
  normalizeCustomerPhone,
  findCustomersByCanonicalPhone,
  resolveCustomerSnapshot
};
