const COLORS = ['#f472b6', '#fbbf24', '#22c55e', '#38bdf8', '#a78bfa', '#fb7185'];

const TIERS = [
  { min: 100, confetti: 120, messages: ['💯 Perfect score!', '👑 Flawless!', '🥇 100%! Incredible!', '🎆 Absolutely perfect!'] },
  { min: 85, confetti: 80, messages: ['🏆 Nailed it!', '🌟 Amazing work!', '🎉 You crushed it!', '✨ Perfect practice!'] },
  { min: 30, confetti: 45, messages: ['🎉 Great work!', '👍 Nice job!', '🌟 Well done!', '💪 Solid effort!'] },
  { min: 0, confetti: 15, messages: ['🌱 Keep practicing!', '👏 Nice try!', '💪 Keep going!'] }
];

export function getTier(accuracy) {
  return TIERS.find(t => accuracy >= t.min) || TIERS[TIERS.length - 1];
}

export function pickCelebrationMessage(accuracy = 100) {
  const tier = getTier(accuracy);
  return tier.messages[Math.floor(Math.random() * tier.messages.length)];
}

export function celebrate(message, accuracy = 100) {
  const tier = getTier(accuracy);
  const pieceCount = tier.confetti;

  const overlay = document.createElement('div');
  overlay.className = 'celebration-overlay';

  let pieces = '';
  for (let i = 0; i < pieceCount; i++) {
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
