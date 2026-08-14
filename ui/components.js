/**
 * Shared Component Primitives JS (Stage 13 Phase B)
 * Declarative component rendering helpers & operational formatting utilities.
 */

(function (global) {
  const UI = {};

  /**
   * Currency formatter (INR Indian Comma Format)
   */
  UI.formatCurrency = function (amount) {
    const num = Number(amount) || 0;
    return '₹' + num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  /**
   * Weight/Volume unit formatter
   */
  UI.formatQuantityWithUnit = function (qty, unit = 'Unit', sellingMode = 'packaged') {
    const val = Number(qty) || 0;
    if (sellingMode === 'loose') {
      return `${val} ${unit}`;
    }
    return `${val} ${unit}`;
  };

  /**
   * Date formatter (DD MMM YYYY, HH:mm)
   */
  UI.formatDate = function (isoString) {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) + ' ' + d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return String(isoString);
    }
  };

  /**
   * Render Button HTML
   */
  UI.renderButton = function ({
    label = '',
    variant = 'secondary',
    size = 'md',
    icon = '',
    disabled = false,
    id = '',
    onClick = '',
    hotkey = ''
  } = {}) {
    const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
    const idAttr = id ? `id="${id}"` : '';
    const clickAttr = onClick ? `onclick="${onClick}"` : '';
    const disAttr = disabled ? 'disabled' : '';
    const iconHtml = icon ? `<span class="btn-icon-wrap">${icon}</span>` : '';
    const kbdHtml = hotkey ? `<span class="kbd-badge">${hotkey}</span>` : '';

    return `
      <button type="button" class="btn btn-${variant} ${sizeClass}" ${idAttr} ${clickAttr} ${disAttr}>
        ${iconHtml}
        <span>${label}</span>
        ${kbdHtml}
      </button>
    `.trim();
  };

  /**
   * Render Status Badge HTML
   */
  UI.renderStatusBadge = function ({ label = '', variant = 'neutral', mono = false } = {}) {
    const monoClass = mono ? 'badge-mono' : '';
    return `<span class="status-badge status-${variant} ${monoClass}">${label}</span>`;
  };

  /**
   * Render Metric Card HTML
   */
  UI.renderMetricCard = function ({
    label = '',
    value = '0',
    icon = '',
    trend = '',
    variant = 'default'
  } = {}) {
    const iconHtml = icon ? `<span style="font-size:20px">${icon}</span>` : '';
    const trendHtml = trend ? `<span style="font-size:11px; color:var(--text-secondary)">${trend}</span>` : '';

    return `
      <div class="metric-card-shell">
        <div style="display:flex; justify-content:space-between; align-items:center">
          <span class="metric-label">${label}</span>
          ${iconHtml}
        </div>
        <div class="metric-value-tabular">${value}</div>
        ${trendHtml}
      </div>
    `.trim();
  };

  /**
   * Render Sync Status Badge HTML
   */
  UI.renderSyncBadge = function (status = 'connected') {
    let dotClass = 'sync-dot-online';
    let label = 'Online';
    if (status === 'syncing') {
      dotClass = 'sync-dot-syncing';
      label = 'Syncing...';
    } else if (status === 'offline') {
      dotClass = 'sync-dot-offline';
      label = 'Offline (REST)';
    }

    return `
      <div class="sync-badge" title="Connection: ${label}">
        <span class="sync-dot ${dotClass}"></span>
        <span>${label}</span>
      </div>
    `.trim();
  };

  /**
   * Toast notification dispatch helper
   */
  UI.showToast = function ({ type = 'info', message = '', duration = 3500 } = {}) {
    let container = document.getElementById('global-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'global-toast-container';
      container.className = 'toast-container-shell';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `
      <span>${icon}</span>
      <span style="flex:1">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 150ms ease';
      setTimeout(() => toast.remove(), 150);
    }, duration);
  };

  /**
   * Export to global scope
   */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
  } else {
    global.AppUI = UI;
  }
})(typeof window !== 'undefined' ? window : global);
