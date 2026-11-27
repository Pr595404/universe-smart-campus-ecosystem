/**
 * UniVerse App Shell & Navigation Controller
 * Renders the collapsible sidebar, topbar, notification center, and role guards.
 */
const UniVerseApp = (() => {
  const NAV_ITEMS = [
    { href: 'dashboard.html', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
    { href: 'campus-pulse.html', label: 'Campus Pulse', icon: 'bi-broadcast' },
    { href: 'events.html', label: 'Campus Events', icon: 'bi-calendar-event' },
    { href: 'studyhub.html', label: 'StudyHub', icon: 'bi-book-half' },
    { href: 'skillsphere.html', label: 'SkillSphere', icon: 'bi-people-fill' },
    { href: 'campus-quest.html', label: 'Campus Quest', icon: 'bi-trophy-fill' },
    { href: 'lost-found.html', label: 'Lost & Found', icon: 'bi-search-heart' },
    { href: 'marketplace.html', label: 'Marketplace', icon: 'bi-bag-check-fill' },
    { href: 'feedback.html', label: 'Anonymous Voice', icon: 'bi-chat-square-quote-fill' },
    { href: 'admin.html', label: 'Admin Panel', icon: 'bi-shield-lock-fill', roles: ['admin'] }
  ];

  async function initShell(options = {}) {
    const { requireAuth = true, allowedRoles = null } = options;
    let user = UniVerseAPI.getUser();
    const token = UniVerseAPI.getToken();

    if (requireAuth && !token) {
      window.location.href = 'login.html';
      return null;
    }

    if (token) {
      try {
        const res = await UniVerseAPI.request('/api/auth/me');
        user = res.user;
        UniVerseAPI.setSession(token, user);
      } catch {
        if (requireAuth) {
          window.location.href = 'login.html';
          return null;
        }
      }
    }

    if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
      UniVerseAPI.showToast('Access restricted to authorized roles.', 'error');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 900);
      return null;
    }

    renderSidebar(user);
    renderTopbar(user);
    if (user) loadNotifications();
    return user;
  }

  function renderSidebar(user) {
    const sidebar = document.getElementById('app-sidebar');
    if (!sidebar) return;
    const currentPath = window.location.pathname;

    const linksHtml = NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role)))
      .map((item) => {
        const isActive = currentPath.endsWith(item.href);
        return `
          <a href="${item.href}" class="sidebar-link ${isActive ? 'active' : ''}">
            <i class="bi ${item.icon}" aria-hidden="true"></i>
            <span class="nav-label">${item.label}</span>
          </a>
        `;
      })
      .join('');

    const initials = user ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'UV';

    sidebar.innerHTML = `
      <div class="d-flex align-items-center justify-content-between p-3 border-bottom" style="border-color: var(--border-subtle) !important; height: var(--topbar-height);">
        <a href="index.html" class="d-flex align-items-center gap-2 text-decoration-none text-reset">
          <span class="d-inline-flex align-items-center justify-content-center rounded-3" style="width:36px;height:36px;background:linear-gradient(135deg,#376b55,#c9aa71);color:#fff;font-weight:700;">U</span>
          <span class="brand-text fw-bold fs-5 font-display">UniVerse</span>
        </a>
        <button id="sidebar-collapse-btn" class="btn btn-sm btn-link text-secondary p-1" aria-label="Toggle sidebar">
          <i class="bi bi-layout-sidebar-inset" aria-hidden="true"></i>
        </button>
      </div>
      <nav class="sidebar-nav" aria-label="Main Navigation">
        ${linksHtml}
      </nav>
      <div class="p-3 border-top" style="border-color: var(--border-subtle) !important;">
        ${
          user
            ? `<div class="d-flex align-items-center gap-2">
                 <div class="avatar-circle" style="background:${UniVerseAPI.escapeHtml(user.avatar_color || '#6366f1')}">${initials}</div>
                 <div class="sidebar-user-meta min-w-0 flex-grow-1">
                   <div class="fw-semibold small text-truncate">${UniVerseAPI.escapeHtml(user.name)}</div>
                   <div class="text-secondary" style="font-size:0.75rem;">${UniVerseAPI.escapeHtml(user.role.toUpperCase())} · <span class="tabular-nums">${user.xp} XP</span></div>
                 </div>
               </div>`
            : `<a href="login.html" class="btn-universe w-100 btn-sm">Sign In</a>`
        }
      </div>
    `;

    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    collapseBtn?.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  function renderTopbar(user) {
    const topbar = document.getElementById('app-topbar');
    if (!topbar) return;
    const isLight = UniVerseAPI.getTheme() === 'light';

    topbar.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <button id="mobile-menu-btn" class="btn btn-sm btn-universe-ghost d-lg-none" aria-label="Open navigation menu">
          <i class="bi bi-list fs-5" aria-hidden="true"></i>
        </button>
        <span class="small text-secondary d-none d-sm-inline">Smart Campus Ecosystem · <strong class="text-info">Localhost</strong></span>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button id="theme-toggle-btn" class="btn btn-sm btn-universe-ghost" aria-label="Toggle color theme">
          <i class="bi ${isLight ? 'bi-moon-stars-fill' : 'bi-sun-fill'}" aria-hidden="true"></i>
        </button>
        ${
          user
            ? `<div class="dropdown">
                 <button class="btn btn-sm btn-universe-ghost position-relative" data-bs-toggle="dropdown" aria-label="Notifications" id="notif-bell-btn">
                   <i class="bi bi-bell-fill" aria-hidden="true"></i>
                   <span id="notif-dot" class="position-absolute top-0 start-100 translate-middle p-1 bg-info rounded-circle d-none"></span>
                 </button>
                 <div class="dropdown-menu dropdown-menu-end p-2 glass-card" style="width:310px;" id="notif-dropdown">
                   <div class="d-flex justify-content-between align-items-center px-2 py-1 border-bottom mb-2" style="border-color:var(--border-subtle) !important;">
                     <span class="fw-semibold small">Notifications</span>
                     <button class="btn btn-link btn-sm p-0 text-info text-decoration-none" id="mark-read-btn">Mark all read</button>
                   </div>
                   <div id="notif-list" class="small text-secondary px-2 py-1">Loading…</div>
                 </div>
               </div>
               <button id="logout-btn" class="btn btn-sm btn-universe-ghost" aria-label="Sign out">
                 <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
                 <span class="d-none d-md-inline">Logout</span>
               </button>`
            : `<a href="login.html" class="btn btn-sm btn-universe">Sign In</a>`
        }
      </div>
    `;

    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
      document.getElementById('app-sidebar')?.classList.toggle('mobile-open');
    });

    document.getElementById('theme-toggle-btn')?.addEventListener('click', (e) => {
      const next = UniVerseAPI.getTheme() === 'dark' ? 'light' : 'dark';
      UniVerseAPI.setTheme(next);
      const icon = e.currentTarget.querySelector('i');
      if (icon) icon.className = `bi ${next === 'light' ? 'bi-moon-stars-fill' : 'bi-sun-fill'}`;
    });

    document.getElementById('logout-btn')?.addEventListener('click', () => {
      UniVerseAPI.clearSession();
      UniVerseAPI.showToast('Signed out successfully.', 'info');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 450);
    });

    document.getElementById('mark-read-btn')?.addEventListener('click', async () => {
      await UniVerseAPI.request('/api/community/notifications/read', { method: 'POST' });
      document.getElementById('notif-dot')?.classList.add('d-none');
      UniVerseAPI.showToast('All notifications marked as read.', 'success');
    });
  }

  async function loadNotifications() {
    try {
      const { notifications } = await UniVerseAPI.request('/api/community/notifications');
      const list = document.getElementById('notif-list');
      const dot = document.getElementById('notif-dot');
      if (!list) return;
      const unread = notifications.some((n) => !n.is_read);
      if (unread) dot?.classList.remove('d-none');
      if (!notifications.length) {
        list.innerHTML = '<p class="mb-0 text-secondary">No notifications yet.</p>';
        return;
      }
      list.innerHTML = notifications
        .slice(0, 5)
        .map(
          (n) => `
          <div class="py-2 border-bottom" style="border-color:var(--border-subtle) !important;">
            <div class="fw-semibold text-reset">${UniVerseAPI.escapeHtml(n.title)}</div>
            <div class="text-secondary" style="font-size:0.78rem;">${UniVerseAPI.escapeHtml(n.message)}</div>
          </div>`
        )
        .join('');
    } catch {
      // Ignore notification fetch failures
    }
  }

  return { initShell };
})();
