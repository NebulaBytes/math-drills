const COLORS = ['#f472b6', '#fbbf24', '#22c55e', '#38bdf8', '#a78bfa', '#fb7185'];
const MESSAGES = ['🎉 Awesome job! 🎉', '🌟 You did it! 🌟', '🏆 Nailed it! 🏆', '🎊 Great work! 🎊'];

export function celebrate() {
  const overlay = document.createElement('div');
  overlay.className = 'celebration-overlay';

  let pieces = '';
  for (let i = 0; i < 60; i++) {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const duration = 2 + Math.random() * 1.4;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const width = 6 + Math.random() * 7;
    const height = width * 0.4;
    const rotate = Math.random() * 360;
    pieces += `<span class="confetti-piece" style="left:${left}%; background:${color}; width:${width}px; height:${height}px; animation-delay:${delay}s; animation-duration:${duration}s; transform:rotate(${rotate}deg);"></span>`;
  }

  const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  overlay.innerHTML = `
    <div class="confetti-field">${pieces}</div>
    <div class="celebration-banner">${message}</div>
  `;
  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 500);
  }, 2200);
}
