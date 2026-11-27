/**
 * UniVerse 3.0 Interaction Engineering
 * 3D Tilt Cards, Magnetic Buttons, Animated Counters, Desktop Custom Cursor
 */
const UniVerseInteractions = (() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  function initTiltCards() {
    if (prefersReducedMotion || isTouchDevice) return;
    document.querySelectorAll('.tilt-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rotateX = ((y / rect.height) - 0.5) * -8;
        const rotateY = ((x / rect.width) - 0.5) * 8;
        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  function initMagneticButtons() {
    if (prefersReducedMotion || isTouchDevice) return;
    document.querySelectorAll('.magnetic-btn').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const dx = (e.clientX - rect.left - rect.width / 2) * 0.22;
        const dy = (e.clientY - rect.top - rect.height / 2) * 0.22;
        btn.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  function initCustomCursor() {
    if (prefersReducedMotion || isTouchDevice) return;
    let cursor = document.getElementById('universe-cursor');
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.id = 'universe-cursor';
      cursor.className = 'custom-cursor';
      document.body.appendChild(cursor);
    }
    document.addEventListener('mousemove', (e) => {
      cursor.classList.add('active');
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
    });
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('a, button, .tilt-card')) {
        cursor.classList.add('hovering');
      } else {
        cursor.classList.remove('hovering');
      }
    });
  }

  function animateCounter(el, targetValue, duration = 900) {
    if (!el) return;
    const target = Number(targetValue) || 0;
    if (prefersReducedMotion) {
      el.textContent = UniVerseAPI.formatNumber(target);
      return;
    }
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = UniVerseAPI.formatNumber(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTiltCards();
    initMagneticButtons();
    initCustomCursor();
  });

  return { initTiltCards, animateCounter };
})();
