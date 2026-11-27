// Motion's standalone JavaScript API works with this project's vanilla HTML frontend.
import { animate, inView } from 'https://cdn.jsdelivr.net/npm/motion@14.14.0/+esm';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;
const cards = document.querySelectorAll('#features .spotlight-card');

if (!reducedMotion && cards.length) {
  inView('#features .spotlight-card', (card) => {
    const index = [...cards].indexOf(card);
    animate(card, { opacity: [0.72, 1], y: [14, 0] }, {
      duration: 0.55,
      delay: index * 0.07,
      ease: [0.22, 1, 0.36, 1],
    });
  }, { amount: 0.12 });
}

if (!reducedMotion && finePointer) {
  cards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty('--spotlight-x', `${event.clientX - bounds.left}px`);
      card.style.setProperty('--spotlight-y', `${event.clientY - bounds.top}px`);
      card.classList.add('is-spotlit');
    });
    card.addEventListener('pointerleave', () => card.classList.remove('is-spotlit'));
  });
}
