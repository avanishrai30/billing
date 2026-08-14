(function(global) {
  const VIEWS = [
    { id: "dashboard", group: "operations", label: "Dashboard" },
    { id: "billing", group: "operations", label: "POS" },
    { id: "inventory", group: "operations", label: "Inventory" },
    { id: "purchase", group: "operations", label: "Purchases" },
    { id: "invoices", group: "operations", label: "Invoices" },
    { id: "customers", group: "relationships", label: "Customers" },
    { id: "businesses", group: "relationships", label: "Suppliers / Stores" },
    { id: "settings", group: "control", label: "Settings" },
    { id: "permissions", group: "control", label: "Users / RBAC" },
    { id: "auditor", group: "control", label: "Audit" },
    { id: "scanner", group: "operations", label: "Scanner" }
  ];

  function getShell() {
    return document.querySelector('[data-component="AppShell"]');
  }

  function getViewElement(viewId) {
    return document.getElementById(`view-${viewId}`);
  }

  function setShellState(nextState) {
    const shell = getShell();
    if (!shell) return;
    shell.setAttribute("data-shell-state", nextState);
  }

  function setActiveView(viewId) {
    const target = getViewElement(viewId);
    if (!target) return false;

    document.querySelectorAll(".app-view").forEach(view => {
      const isTarget = view === target;
      view.classList.toggle("active", isTarget);
      view.setAttribute("data-view-state", isTarget ? "visible" : "hidden");
      view.setAttribute("aria-hidden", String(!isTarget));
    });

    document.querySelectorAll(".nav-menu .nav-item").forEach(item => item.classList.remove("active"));
    document.querySelectorAll(".nav-menu a").forEach(link => {
      const handler = link.getAttribute("onclick") || "";
      if (handler.includes(`'${viewId}'`) || handler.includes(`"${viewId}"`)) {
        link.classList.add("active");
      }
    });

    setShellState("ready");
    return true;
  }

  const DrawerManager = {
    activeDrawerId: null,
    sync() {
      document.querySelectorAll(".finance-drawer-backdrop, [id$='-drawer']").forEach(drawer => {
        if (!drawer.classList || !drawer.classList.contains("modal-backdrop")) return;
        const isOpen = drawer.classList.contains("active");
        drawer.setAttribute("data-component", "DrawerLayer");
        drawer.setAttribute("data-drawer-state", isOpen ? "open" : "closed");
        if (isOpen) this.activeDrawerId = drawer.id || null;
      });
    },
    open(id) {
      const drawer = typeof id === "string" ? document.getElementById(id) : id;
      if (!drawer) return;
      drawer.classList.add("active");
      this.sync();
      if (global.ModalManager) global.ModalManager.sync();
    },
    close(id) {
      const drawer = typeof id === "string" ? document.getElementById(id) : id;
      if (!drawer) return;
      drawer.classList.remove("active");
      this.sync();
      if (global.ModalManager) global.ModalManager.sync();
    }
  };

  function initialize() {
    const shell = getShell();
    if (shell) {
      shell.setAttribute("data-frontend-version", "2");
      shell.setAttribute("data-shell-state", shell.style.display === "none" ? "auth" : "ready");
    }

    VIEWS.forEach(view => {
      const element = getViewElement(view.id);
      if (!element) return;
      element.setAttribute("data-v2-view", view.id);
      element.setAttribute("data-v2-group", view.group);
      element.setAttribute("data-v2-label", view.label);
    });

    DrawerManager.sync();
  }

  global.AIAVROFrontendV2 = {
    featureFlag: true,
    views: VIEWS,
    shell: { setState: setShellState },
    navigation: { setActiveView },
    drawers: DrawerManager,
    initialize
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})(window);
