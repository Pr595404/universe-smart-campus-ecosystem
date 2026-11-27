/**
 * Smart Buddy AI Assistant Widget
 * Floating chat drawer available across UniVerse with clearly labeled Demo Mode fallback.
 */
(() => {
  const SUGGESTED = [
    'What events are coming up?',
    'Recommend study resources',
    'How do I find hackathon teammates?',
    'Explain REST APIs briefly'
  ];

  function mountSmartBuddy() {
    if (document.getElementById('smart-buddy-fab')) return;

    const fab = document.createElement('button');
    fab.id = 'smart-buddy-fab';
    fab.className = 'smart-buddy-fab';
    fab.setAttribute('aria-label', 'Open Smart Buddy AI Assistant');
    fab.innerHTML = '<i class="bi bi-stars fs-4" aria-hidden="true"></i>';

    const drawer = document.createElement('aside');
    drawer.id = 'smart-buddy-drawer';
    drawer.className = 'smart-buddy-drawer glass-card';
    drawer.setAttribute('aria-label', 'Smart Buddy AI Assistant');
    drawer.innerHTML = `
      <div class="d-flex align-items-center justify-content-between px-3 py-2 border-bottom" style="border-color:var(--border-subtle) !important;">
        <div class="d-flex align-items-center gap-2">
          <span class="d-inline-flex align-items-center justify-content-center rounded-circle" style="width:32px;height:32px;background:linear-gradient(135deg,#6366f1,#06b6d4);color:#fff;">
            <i class="bi bi-robot" aria-hidden="true"></i>
          </span>
          <div>
            <div class="fw-bold small font-display">Smart Buddy</div>
            <div id="sb-mode-badge" class="text-info" style="font-size:0.7rem;">Campus AI Assistant</div>
          </div>
        </div>
        <button id="sb-close-btn" class="btn btn-sm btn-link text-secondary" aria-label="Close Smart Buddy">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </div>
      <div id="sb-messages" class="flex-grow-1 p-3 overflow-auto d-flex flex-column gap-2" style="font-size:0.88rem;">
        <div class="p-2 rounded-3" style="background:rgba(99,102,241,0.14);border:1px solid rgba(99,102,241,0.25);">
          Hi! I'm <strong>Smart Buddy</strong>. Ask me about upcoming campus events, StudyHub notes, SkillSphere teammates, or quick academic concepts.
        </div>
        <div class="d-flex flex-wrap gap-1" id="sb-suggestions">
          ${SUGGESTED.map((q) => `<button type="button" class="btn btn-sm btn-universe-ghost py-1 px-2 sb-prompt-chip" style="font-size:0.74rem;">${q}</button>`).join('')}
        </div>
      </div>
      <form id="sb-form" class="p-2 border-top d-flex gap-2" style="border-color:var(--border-subtle) !important;">
        <label for="sb-input" class="visually-hidden">Ask Smart Buddy</label>
        <input id="sb-input" type="text" class="form-control form-control-sm" placeholder="Ask Smart Buddy…" autocomplete="off" required />
        <button type="submit" class="btn btn-sm btn-universe px-3" aria-label="Send message">
          <i class="bi bi-send-fill" aria-hidden="true"></i>
        </button>
      </form>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(drawer);

    fab.addEventListener('click', () => {
      drawer.classList.toggle('open');
      if (drawer.classList.contains('open')) {
        document.getElementById('sb-input')?.focus();
      }
    });

    document.getElementById('sb-close-btn')?.addEventListener('click', () => {
      drawer.classList.remove('open');
    });

    drawer.querySelectorAll('.sb-prompt-chip').forEach((chip) => {
      chip.addEventListener('click', () => sendQuery(chip.textContent));
    });

    document.getElementById('sb-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('sb-input');
      const val = input.value.trim();
      if (!val) return;
      input.value = '';
      sendQuery(val);
    });
  }

  async function sendQuery(text) {
    const container = document.getElementById('sb-messages');
    const modeBadge = document.getElementById('sb-mode-badge');
    if (!container) return;

    const userMsg = document.createElement('div');
    userMsg.className = 'align-self-end p-2 rounded-3 text-white';
    userMsg.style.cssText = 'background:linear-gradient(135deg,#6366f1,#3b82f6);max-width:85%;';
    userMsg.textContent = text;
    container.appendChild(userMsg);

    const typing = document.createElement('div');
    typing.className = 'p-2 rounded-3 text-secondary small';
    typing.textContent = 'Smart Buddy is thinking…';
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;

    try {
      const data = await UniVerseAPI.request('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text })
      });
      typing.remove();
      if (modeBadge) {
        modeBadge.textContent = data.demoMode ? 'Demo Mode (No API Key)' : `Live AI (${data.provider})`;
      }
      const botMsg = document.createElement('div');
      botMsg.className = 'p-2 rounded-3';
      botMsg.style.cssText = 'background:rgba(148,163,184,0.12);border:1px solid var(--border-subtle);max-width:92%;white-space:pre-line;';
      botMsg.innerHTML = UniVerseAPI.escapeHtml(data.reply).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      container.appendChild(botMsg);
    } catch (err) {
      typing.textContent = `Error: ${err.message}`;
    }
    container.scrollTop = container.scrollHeight;
  }

  document.addEventListener('DOMContentLoaded', mountSmartBuddy);
})();
