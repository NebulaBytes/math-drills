const COLORS = ['#f472b6', '#fbbf24', '#22c55e', '#38bdf8', '#a78bfa', '#fb7185'];

const TIERS = [
  { min: 85, messages: ['🏆 Nailed it!', '🌟 Amazing work!', '🎉 You crushed it!', '✨ Perfect practice!'] },
  { min: 50, messages: ['🎉 Great work!', '👍 Nice job!', '🌟 Well done!', '💪 Solid effort!'] },
  { min: 0, messages: ['💪 Good effort!', '🌱 Keep practicing!', '👏 Nice try!', '🚀 You\'re improving!'] }
];

export function pickCelebrationMessage(accuracy = 100) {
  const tier = TIERS.find(t => accuracy >= t.min) || TIERS[TIERS.length - 1];
  return tier.messages[Math.floor(Math.random() * tier.messages.length)];
}

export function celebrate(message) {
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
