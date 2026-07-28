import { generateCarryAddition, generateBorrowSubtraction } from './problems.js';
import { playDing, playBuzz, playCelebration } from './sounds.js';
import { showScreen } from './nav.js';
import { celebrate, pickCelebrationMessage } from './celebrate.js';

function buildAdditionSteps(problem) {
  const { digitLength, transferOut, resultDigit } = problem;
  const steps = [];
  for (let i = 0; i < digitLength; i++) {
    steps.push({ type: 'result', col: i, expected: resultDigit[i] });
    if (transferOut[i] === 1 && i + 1 <= digitLength - 1) {
      steps.push({ type: 'carry', col: i + 1, expected: 1 });
    }
  }
  if (problem.finalTransfer === 1) {
    steps.push({ type: 'result', col: digitLength, expected: problem.finalTransfer });
  }
  return steps;
}

function buildSubtractionSteps(problem) {
  const { digitLength, transferOut, resultDigit } = problem;
  const steps = [];
  for (let i = 0; i < digitLength; i++) {
    if (transferOut[i] === 1) {
      steps.push({ type: 'select-borrow', col: i, borrowFromCol: i + 1 });
    }
    steps.push({ type: 'result', col: i, expected: resultDigit[i] });
  }
  return steps;
}

function additionHint(problem, step) {
  const { digitsA, digitsB, transferIn } = problem;
  if (step.type === 'carry') {
    return `Carry the 1! Write it above the next column.`;
  }
  const carried = transferIn[step.col] === 1;
  return carried
    ? `Add this column, plus the 1 you carried: ${digitsA[step.col]} + ${digitsB[step.col]} + 1`
    : `Add this column: ${digitsA[step.col]} + ${digitsB[step.col]}`;
}

function subtractionHint(problem, step) {
  const { digitsA, digitsB, transferIn } = problem;
  if (step.type === 'select-borrow') {
    return `Not enough here! Click the digit you can borrow 10 from.`;
  }
  const col = step.col;
  const base = transferIn[col] === 1 ? digitsA[col] - 1 : digitsA[col];
  const wasBoosted = problem.transferOut[col] === 1;
  const top = wasBoosted ? base + 10 : base;
  return `Subtract this column: ${top} − ${digitsB[col]}`;
}

const OPERATIONS = {
  add: {
    label: 'Carry-over Addition',
    generate: generateCarryAddition,
    operator: '+',
    hasExtraColumn: true,
    buildSteps: buildAdditionSteps,
    hint: additionHint
  },
  sub: {
    label: 'Borrow Subtraction',
    generate: generateBorrowSubtraction,
    operator: '−',
    hasExtraColumn: false,
    buildSteps: buildSubtractionSteps,
    hint: subtractionHint
  }
};

let config = { operation: 'add', digitLength: 3, numProblems: 5 };
let run = null;
let activeInput = null;
let hintShown = false;
let timerInterval = null;
let runStartTime = null;
let problemStartTime = null;

function formatTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
  const now = Date.now();
  const totalStr = formatTime(now - runStartTime);
  const problemStr = formatTime(now - problemStartTime);
  document.getElementById('advanced-timer').textContent = `⏱ ${totalStr} · this problem ${problemStr}`;
}

function startRunTimer() {
  runStartTime = Date.now();
  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimerDisplay, 500);
}

function stopRunTimer() {
  clearInterval(timerInterval);
}

function renderProgressDots() {
  const container = document.getElementById('advanced-progress-dots');
  container.innerHTML = '';
  for (let i = 0; i < config.numProblems; i++) {
    const dot = document.createElement('div');
    dot.className = 'progress-dot';
    container.appendChild(dot);
  }
}

function markCurrentDot(problemIndex) {
  const dots = document.querySelectorAll('.progress-dot');
  if (dots[problemIndex]) dots[problemIndex].classList.add('current');
}

function markDotResult(problemIndex, hadMistakes) {
  const dots = document.querySelectorAll('.progress-dot');
  if (dots[problemIndex]) {
    dots[problemIndex].classList.remove('current');
    dots[problemIndex].classList.add(hadMistakes ? 'dot-red' : 'dot-green');
  }
}

function renderColumnBoard(problem, operatorSymbol, hasExtraColumn) {
  const { digitsA, digitsB, digitLength } = problem;
  const realColumns = Array.from({ length: digitLength }, (_, k) => digitLength - 1 - k);
  const order = hasExtraColumn ? [digitLength, ...realColumns] : realColumns;

  const frame = document.createElement('div');
  frame.className = 'problem-frame';
  frame.style.display = 'inline-block';

  const topBoard = document.createElement('div');
  topBoard.className = 'column-board';
  const bottomBoard = document.createElement('div');
  bottomBoard.className = 'column-board';
  const dividerWrap = document.createElement('div');
  dividerWrap.className = 'divider-line';

  const resultInputs = {};
  const carryInputs = {};
  const digitACells = {};

  // operator column
  const opStack = document.createElement('div');
  opStack.className = 'col-stack op-col';
  opStack.innerHTML = `
    <div class="carry-box placeholder"></div>
    <div class="digit-box blank"></div>
    <div class="digit-box" style="background:transparent;">${operatorSymbol}</div>
  `;
  topBoard.appendChild(opStack);

  const opResultStack = document.createElement('div');
  opResultStack.className = 'col-stack op-col';
  opResultStack.innerHTML = `<div class="result-box" style="visibility:hidden;"></div>`;
  bottomBoard.appendChild(opResultStack);

  order.forEach(i => {
    const isExtra = hasExtraColumn && i === digitLength;
    const stack = document.createElement('div');
    stack.className = 'col-stack';

    const carryBox = document.createElement('input');
    carryBox.className = 'carry-box';
    carryBox.maxLength = 1;
    carryBox.inputMode = 'numeric';
    carryBox.disabled = true;
    const boxNeverUsed = isExtra || (operatorSymbol !== '−' && i === 0);
    if (boxNeverUsed) carryBox.classList.add('placeholder');
    stack.appendChild(carryBox);
    if (!isExtra) carryInputs[i] = carryBox;

    const digitA = document.createElement('div');
    digitA.className = 'digit-box' + (isExtra ? ' blank' : '');
    if (!isExtra) {
      digitA.textContent = digitsA[i];
      digitACells[i] = digitA;
    }
    stack.appendChild(digitA);

    const digitB = document.createElement('div');
    digitB.className = 'digit-box' + (isExtra ? ' blank' : '');
    digitB.textContent = isExtra ? '' : digitsB[i];
    stack.appendChild(digitB);

    topBoard.appendChild(stack);

    const resultStack = document.createElement('div');
    resultStack.className = 'col-stack';
    const resultBox = document.createElement('input');
    resultBox.className = 'result-box';
    resultBox.maxLength = 1;
    resultBox.inputMode = 'numeric';
    resultBox.disabled = true;
    if (isExtra) resultBox.style.visibility = 'hidden';
    resultStack.appendChild(resultBox);
    bottomBoard.appendChild(resultStack);
    resultInputs[i] = resultBox;
  });

  frame.appendChild(topBoard);
  frame.appendChild(dividerWrap);
  frame.appendChild(bottomBoard);

  return { frame, resultInputs, carryInputs, digitACells };
}

function updateHintText(state, step) {
  document.getElementById('advanced-hint-text').textContent = state.opConfig.hint(state.problem, step);
}

function revealBox(box, value) {
  box.value = value;
  box.classList.remove('active', 'wrong');
  box.classList.add('correct');
  box.disabled = true;
}

function flyTen(fromEl, toEl, onArrive) {
  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();

  const flyer = document.createElement('div');
  flyer.className = 'fly-digit';
  flyer.textContent = '1';
  flyer.style.left = `${fromRect.left + fromRect.width / 2 - 16}px`;
  flyer.style.top = `${fromRect.top + fromRect.height / 2 - 16}px`;
  document.body.appendChild(flyer);

  requestAnimationFrame(() => {
    flyer.classList.add('grown');
    flyer.textContent = '10';
    requestAnimationFrame(() => {
      const dx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
      const dy = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);
      flyer.style.transform = `translate(${dx}px, ${dy}px) scale(0.9)`;
    });
  });

  setTimeout(() => {
    flyer.classList.add('landed');
    setTimeout(() => {
      flyer.remove();
      onArrive();
    }, 220);
  }, 650);
}

function resolveBorrow(state, step) {
  const { problem, carryInputs, digitACells } = state;
  const lendCol = step.borrowFromCol;
  const recvCol = step.col;

  digitACells[lendCol].classList.add('crossed');
  revealBox(carryInputs[lendCol], problem.digitsA[lendCol] - 1);

  flyTen(digitACells[lendCol], digitACells[recvCol], () => {
    digitACells[recvCol].classList.add('crossed');
    const base = problem.transferIn[recvCol] === 1 ? problem.digitsA[recvCol] - 1 : problem.digitsA[recvCol];
    revealBox(carryInputs[recvCol], base + 10);

    state.stepIndex++;
    setTimeout(() => wireStep(state), 400);
  });
}

function wireSelectBorrow(state, step) {
  activeInput = null;
  let missed = false;
  const cells = state.digitACells;

  Object.keys(cells).forEach(key => {
    const col = parseInt(key, 10);
    const cell = cells[col];
    cell.classList.add('selectable');
    cell.onclick = () => {
      if (col === step.borrowFromCol) {
        Object.keys(cells).forEach(k => {
          cells[k].classList.remove('selectable');
          cells[k].onclick = null;
        });
        playDing();
        state.correctSteps++;
        if (!missed) state.firstTryCorrect++;
        resolveBorrow(state, step);
      } else {
        playBuzz();
        state.mistakes++;
        missed = true;
        cell.classList.add('shake-wrong');
        setTimeout(() => cell.classList.remove('shake-wrong'), 400);
      }
    };
  });
}

function wireStep(state) {
  const steps = state.steps;
  const idx = state.stepIndex;
  if (idx >= steps.length) {
    finishProblem(state);
    return;
  }
  const step = steps[idx];
  updateHintText(state, step);

  if (step.type === 'select-borrow') {
    wireSelectBorrow(state, step);
    return;
  }

  const input = step.type === 'result' ? state.resultInputs[step.col] : state.carryInputs[step.col];

  if (step.type === 'result' && step.col === state.problem.digitLength) {
    input.style.visibility = 'visible';
  }

  input.disabled = false;
  input.classList.add('active');
  input.value = '';
  input.focus();
  activeInput = input;
  let missedThisStep = false;

  input.oninput = () => {
    const val = input.value.replace(/[^0-9]/g, '');
    input.value = val;
    if (val === '') return;
    const digit = parseInt(val, 10);
    if (digit === step.expected) {
      input.classList.remove('active', 'wrong');
      input.classList.add('correct');
      input.disabled = true;
      playDing();
      state.correctSteps++;
      if (!missedThisStep) state.firstTryCorrect++;
      state.stepIndex++;
      setTimeout(() => wireStep(state), 200);
    } else {
      input.classList.add('wrong');
      playBuzz();
      state.mistakes++;
      missedThisStep = true;
      setTimeout(() => {
        input.classList.remove('wrong');
        input.value = '';
      }, 400);
    }
  };
}

function finishProblem(state) {
  state.onComplete();
}

function resetHint() {
  hintShown = false;
  document.getElementById('advanced-hint-text').style.display = 'none';
  document.getElementById('advanced-hint-btn').textContent = '💡 Hint';
}

function startProblem(problemIndex) {
  const board = document.getElementById('advanced-board');
  board.innerHTML = '';
  document.getElementById('advanced-progress').textContent =
    `Problem ${problemIndex + 1} / ${config.numProblems}`;
  resetHint();
  problemStartTime = Date.now();
  markCurrentDot(problemIndex);

  const opConfig = OPERATIONS[config.operation];
  const problem = opConfig.generate(config.digitLength);
  const { frame, resultInputs, carryInputs, digitACells } = renderColumnBoard(problem, opConfig.operator, opConfig.hasExtraColumn);
  board.appendChild(frame);

  const state = {
    problem,
    opConfig,
    operationKey: config.operation,
    steps: opConfig.buildSteps(problem),
    stepIndex: 0,
    resultInputs,
    carryInputs,
    digitACells,
    correctSteps: 0,
    firstTryCorrect: 0,
    mistakes: 0,
    onComplete: () => {
      run.totalFirstTryCorrect += state.firstTryCorrect;
      run.totalSteps += state.steps.length;
      run.totalMistakes += state.mistakes;
      run.problemsCompleted++;
      markDotResult(problemIndex, state.mistakes > 0);
      playCelebration();
      setTimeout(() => {
        if (problemIndex + 1 < config.numProblems) {
          startProblem(problemIndex + 1);
        } else {
          showAdvancedResults();
        }
      }, 500);
    }
  };
  wireStep(state);
}

function showAdvancedResults() {
  stopRunTimer();
  const accuracy = run.totalSteps
    ? Math.round((run.totalFirstTryCorrect / run.totalSteps) * 100)
    : 100;
  const totalTime = formatTime(Date.now() - runStartTime);
  document.getElementById('advanced-results-activity').textContent = OPERATIONS[config.operation].label;
  document.getElementById('advanced-results-body').innerHTML = `
    <div class="big-stat">${run.problemsCompleted} problems solved</div>
    <div class="stat-row">
      <div class="stat"><div class="val">${accuracy}%</div><div class="lbl">First-try accuracy</div></div>
      <div class="stat"><div class="val">${run.totalMistakes}</div><div class="lbl">Mistakes</div></div>
      <div class="stat"><div class="val">${totalTime}</div><div class="lbl">Time</div></div>
    </div>
  `;
  const message = pickCelebrationMessage(accuracy);
  document.getElementById('advanced-results-heading').textContent = message;
  showScreen('screen-advanced-results');
  celebrate(message);
}

export function initAdvancedSetup() {
  const opChips = document.querySelectorAll('#advanced-op-chips .chip[data-value]');
  opChips.forEach(chip => {
    chip.addEventListener('click', () => {
      opChips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      config.operation = chip.dataset.value;
    });
  });

  const digitChips = document.querySelectorAll('#advanced-digit-chips .chip');
  digitChips.forEach(chip => {
    chip.addEventListener('click', () => {
      digitChips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      config.digitLength = parseInt(chip.dataset.value, 10);
    });
  });

  const countChips = document.querySelectorAll('#advanced-count-chips .chip');
  countChips.forEach(chip => {
    chip.addEventListener('click', () => {
      countChips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      config.numProblems = parseInt(chip.dataset.value, 10);
    });
  });

  function beginRun() {
    run = { problemsCompleted: 0, totalSteps: 0, totalFirstTryCorrect: 0, totalMistakes: 0 };
    document.getElementById('advanced-activity-name').textContent = OPERATIONS[config.operation].label;
    renderProgressDots();
    startRunTimer();
    showScreen('screen-advanced-play');
    startProblem(0);
  }

  document.getElementById('btn-advanced-start').addEventListener('click', beginRun);
  document.getElementById('btn-advanced-again').addEventListener('click', beginRun);

  document.getElementById('advanced-hint-btn').addEventListener('click', () => {
    hintShown = !hintShown;
    document.getElementById('advanced-hint-text').style.display = hintShown ? 'block' : 'none';
    document.getElementById('advanced-hint-btn').textContent = hintShown ? '✕ Hide hint' : '💡 Hint';
  });

  document.querySelectorAll('#advanced-numpad [data-digit]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!activeInput || activeInput.disabled) return;
      activeInput.value = btn.dataset.digit;
      activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
}
