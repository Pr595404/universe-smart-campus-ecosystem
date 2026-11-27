/**
 * UniVerse API & Utility Layer
 * Handles JWT session storage, REST fetch calls, Intl formatting, and toasts.
 */
const UniVerseAPI = (() => {
  const TOKEN_KEY = 'universe_token';
  const USER_KEY = 'universe_user';
  const THEME_KEY = 'universe_theme';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'dark';
  }

  function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  async function request(endpoint, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(endpoint, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/api/auth/login')) {
        clearSession();
      }
      throw new Error(data.error || `Request failed (${response.status})`);
    }
    return data;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(d);
  }

  function formatNumber(num) {
    return new Intl.NumberFormat().format(Number(num) || 0);
  }

  function showToast(message, type = 'info') {
    let stack = document.getElementById('universe-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'universe-toast-stack';
      stack.className = 'toast-stack';
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    const colors = {
      success: 'var(--accent-emerald)',
      error: 'var(--accent-rose)',
      info: 'var(--accent-cyan)',
      xp: 'var(--accent-amber)'
    };
    const toast = document.createElement('div');
    toast.className = 'universe-toast';
    toast.innerHTML = `
      <span style="width:10px;height:10px;border-radius:50%;background:${colors[type] || colors.info};flex-shrink:0;"></span>
      <span class="small fw-medium">${escapeHtml(message)}</span>
    `;
    stack.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 250);
    }, 3600);
  }

  function handleRewardToast(reward) {
    if (!reward) return;
    if (reward.xpAwarded > 0) {
      showToast(`+${reward.xpAwarded} XP earned!`, 'xp');
    }
    if (Array.isArray(reward.unlockedBadges) && reward.unlockedBadges.length > 0) {
      showToast(`Badge Unlocked: ${reward.unlockedBadges.join(', ')}`, 'success');
    }
  }

  // Apply saved theme immediately
  setTheme(getTheme());

  return {
    getToken,
    getUser,
    setSession,
    clearSession,
    getTheme,
    setTheme,
    request,
    escapeHtml,
    formatDate,
    formatNumber,
    showToast,
    handleRewardToast
  };
})();
