import { generateFact } from './problems.js';
import { playDing, playBuzz, setMuted, isMuted } from './sounds.js';
import { showScreen } from './nav.js';
import { initAdvancedSetup } from './advanced.js';
import { celebrate, pickCelebrationMessage } from './celebrate.js';

const speedConfig = {
  operation: 'mul',
  tables: [2,3,4,5,6,7,8,9,10,11,12],
  rangeMax: 10,
  timedMode: true,
  duration: 60,
  numQuestions: 10
};

let speedRun = null;
let answerBuffer = '';
let currentFact = null;
let tickInterval = null;
let inputLocked = false;

function initHome() {
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      const mode = card.dataset.mode;
      showScreen(mode === 'speed' ? 'screen-speed-setup' : 'screen-advanced-setup');
    });
  });
}

function initMute() {
  const btn = document.getElementById('btn-mute');
  btn.addEventListener('click', () => {
    setMuted(!isMuted());
    btn.textContent = isMuted() ? '🔇' : '🔊';
  });
}

function initTheme() {
  const btn = document.getElementById('btn-theme');
  const popover = document.getElementById('theme-popover');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    popover.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && e.target !== btn) {
      popover.classList.remove('open');
    }
  });

  document.querySelectorAll('.theme-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      const theme = swatch.dataset.theme;
      if (theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('mathdrills-theme', theme);
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.removeItem('mathdrills-theme');
      }
      popover.classList.remove('open');
    });
  });
}

function initSpeedSetup() {
  const opChips = document.querySelectorAll('#speed-op-chips .chip');
  const tablesWrap = document.getElementById('speed-tables-wrap');
  const rangeWrap = document.getElementById('speed-range-wrap');

  function refreshVisibility() {
    const op = speedConfig.operation;
    tablesWrap.style.display = (op === 'mul' || op === 'div' || op === 'mixed') ? 'block' : 'none';
    rangeWrap.style.display = (op === 'add' || op === 'sub' || op === 'mixed') ? 'block' : 'none';
  }

  opChips.forEach(chip => {
    chip.addEventListener('click', () => {
      opChips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      speedConfig.operation = chip.dataset.value;
      refreshVisibility();
    });
  });
  refreshVisibility();

  document.querySelectorAll('#speed-tables-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const val = parseInt(chip.dataset.value, 10);
      chip.classList.toggle('selected');
      if (chip.classList.contains('selected')) {
        if (!speedConfig.tables.includes(val)) speedConfig.tables.push(val);
      } else {
        speedConfig.tables = speedConfig.tables.filter(v => v !== val);
      }
    });
  });

  document.querySelectorAll('#speed-range-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#speed-range-chips .chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      speedConfig.rangeMax = parseInt(chip.dataset.value, 10);
    });
  });

  const modeChips = document.querySelectorAll('#speed-mode-chips .chip');
  const durationWrap = document.getElementById('speed-duration-wrap');
  const countWrap = document.getElementById('speed-count-wrap');
  modeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      modeChips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      speedConfig.timedMode = chip.dataset.value === 'timed';
      durationWrap.style.display = speedConfig.timedMode ? 'block' : 'none';
      countWrap.style.display = speedConfig.timedMode ? 'none' : 'block';
    });
  });

  document.querySelectorAll('#speed-duration-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#speed-duration-chips .chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      speedConfig.duration = parseInt(chip.dataset.value, 10);
    });
  });

  document.querySelectorAll('#speed-count-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#speed-count-chips .chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      speedConfig.numQuestions = parseInt(chip.dataset.value, 10);
    });
  });

  document.getElementById('btn-speed-start').addEventListener('click', startSpeedRun);
  document.getElementById('btn-speed-again').addEventListener('click', startSpeedRun);
}

function startSpeedRun() {
  speedRun = {
    score: 0,
    attempted: 0,
    streak: 0,
    bestStreak: 0,
    timeLeft: speedConfig.duration,
    elapsed: 0
  };
  showScreen('screen-speed-play');
  updateHud();
  clearInterval(tickInterval);
  tickInterval = setInterval(tick, 1000);
  nextSpeedQuestion();
}

function tick() {
  if (speedConfig.timedMode) {
    speedRun.timeLeft--;
    if (speedRun.timeLeft <= 0) {
      endSpeedRun();
      return;
    }
  } else {
    speedRun.elapsed++;
  }
  updateHud();
}

function updateHud() {
  updateStreakAndTimer();
  updateProgress();
}

function updateStreakAndTimer() {
  document.getElementById('speed-streak').textContent = `🔥 ${speedRun.streak}`;
  document.getElementById('speed-timer').textContent = speedConfig.timedMode
    ? `⏱ ${speedRun.timeLeft}s`
    : `⏱ ${speedRun.elapsed}s`;
}

function updateProgress() {
  document.getElementById('speed-progress').textContent = speedConfig.timedMode
    ? `Score: ${speedRun.score}`
    : `Question ${Math.min(speedRun.attempted + 1, speedConfig.numQuestions)} / ${speedConfig.numQuestions}`;
}

function nextSpeedQuestion() {
  answerBuffer = '';
  currentFact = generateFact(speedConfig.operation, speedConfig);
  document.getElementById('speed-question-text').textContent = currentFact.text;
  document.getElementById('speed-answer-display').textContent = '';
  document.getElementById('speed-answer-display').classList.remove('wrong');
  document.getElementById('speed-correct-reveal').textContent = '';
  const card = document.getElementById('speed-question-card');
  card.classList.remove('wrong-shake', 'correct-pop');
  updateProgress();
  inputLocked = false;
}

function appendDigit(d) {
  if (inputLocked) return;
  if (answerBuffer.length >= 6) return;
  answerBuffer += d;
  document.getElementById('speed-answer-display').textContent = answerBuffer;
}

function backspace() {
  if (inputLocked) return;
  answerBuffer = answerBuffer.slice(0, -1);
  document.getElementById('speed-answer-display').textContent = answerBuffer;
}

function submitAnswer() {
  if (inputLocked || answerBuffer === '') return;
  const card = document.getElementById('speed-question-card');
  const display = document.getElementById('speed-answer-display');
  const correct = parseInt(answerBuffer, 10) === currentFact.answer;

  speedRun.attempted++;
  if (correct) {
    speedRun.score++;
    speedRun.streak++;
    speedRun.bestStreak = Math.max(speedRun.bestStreak, speedRun.streak);
    playDing();
    card.classList.add('correct-pop');
    updateHud();
    advanceOrEnd();
  } else {
    inputLocked = true;
    speedRun.streak = 0;
    playBuzz();
    card.classList.add('wrong-shake');
    display.classList.add('wrong');
    document.getElementById('speed-correct-reveal').textContent = currentFact.answer;
    updateStreakAndTimer();
    setTimeout(advanceOrEnd, 700);
  }
}

function advanceOrEnd() {
  if (speedConfig.timedMode) {
    if (speedRun.timeLeft > 0) nextSpeedQuestion();
  } else {
    if (speedRun.attempted < speedConfig.numQuestions) {
      nextSpeedQuestion();
    } else {
      endSpeedRun();
    }
  }
}

function endSpeedRun() {
  clearInterval(tickInterval);
  const accuracy = speedRun.attempted ? Math.round((speedRun.score / speedRun.attempted) * 100) : 0;
  document.getElementById('speed-results-body').innerHTML = `
    <div class="big-stat">${speedRun.score} / ${speedRun.attempted} correct</div>
    <div class="stat-row">
      <div class="stat"><div class="val">${accuracy}%</div><div class="lbl">Accuracy</div></div>
      <div class="stat"><div class="val">🔥 ${speedRun.bestStreak}</div><div class="lbl">Best streak</div></div>
    </div>
  `;
  const message = pickCelebrationMessage(accuracy);
  document.getElementById('speed-results-heading').textContent = message;
  showScreen('screen-speed-results');
  celebrate(message, accuracy);
}

function initNumpad() {
  document.querySelectorAll('#speed-numpad [data-digit]').forEach(btn => {
    btn.addEventListener('click', () => appendDigit(btn.dataset.digit));
  });
  document.getElementById('btn-backspace').addEventListener('click', backspace);
  document.getElementById('btn-submit').addEventListener('click', submitAnswer);

  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('screen-speed-play').classList.contains('active')) return;
    if (e.key >= '0' && e.key <= '9') appendDigit(e.key);
    else if (e.key === 'Backspace') backspace();
    else if (e.key === 'Enter') submitAnswer();
  });
}

document.querySelectorAll('.btn.secondary[data-home]').forEach(btn => {
  btn.addEventListener('click', () => showScreen('screen-home'));
});

initHome();
initMute();
initTheme();
initSpeedSetup();
initNumpad();
initAdvancedSetup();
