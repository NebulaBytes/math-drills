import { generateCarryAddition, generateBorrowSubtraction } from './problems.js';
import { playDing, playBuzz, playCelebration } from './sounds.js';
import { showScreen } from './nav.js';
import { celebrate } from './celebrate.js';

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
  const { digitLength, transferIn, resultDigit, digitsA } = problem;
  const steps = [];
  for (let i = 0; i < digitLength; i++) {
    if (transferIn[i] === 1) {
      steps.push({ type: 'reduce', col: i, expected: digitsA[i] - 1 });
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
  const { digitsA, digitsB, transferIn, transferOut } = problem;
  if (step.type === 'reduce') {
    return `Borrowing! This column lends 1, so ${digitsA[step.col]} becomes ${digitsA[step.col] - 1}.`;
  }
  const col = step.col;
  const base = transferIn[col] === 1 ? digitsA[col] - 1 : digitsA[col];
  if (transferOut[col] === 1) {
    return `Not enough here — borrow 10 from the next column! Now find ${base + 10} − ${digitsB[col]}.`;
  }
  return `Subtract this column: ${base} − ${digitsB[col]}`;
}

const OPERATIONS = {
  add: {
    generate: generateCarryAddition,
    operator: '+',
    hasExtraColumn: true,
    buildSteps: buildAdditionSteps,
    hint: additionHint
  },
  sub: {
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
    if (i === 0 || isExtra) carryBox.classList.add('placeholder');
    stack.appendChild(carryBox);
    if (!isExtra && i > 0) carryInputs[i] = carryBox;

    const digitA = document.createElement('div');
    digitA.className = 'digit-box' + (isExtra ? ' blank' : '');
    if (!isExtra) {
      const valueSpan = document.createElement('span');
      valueSpan.className = 'digit-value';
      valueSpan.textContent = digitsA[i];
      digitA.appendChild(valueSpan);
      digitACells[i] = valueSpan;
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

function activateStep(state, step, onReady) {
  const hintEl = document.getElementById('advanced-hint');
  const isBoost = step.type === 'result' && state.operationKey === 'sub' &&
    state.problem.transferOut[step.col] === 1;

  if (isBoost) {
    const { transferIn, digitsA, digitsB } = state.problem;
    const col = step.col;
    const base = transferIn[col] === 1 ? digitsA[col] - 1 : digitsA[col];
    hintEl.textContent = `${base} is smaller than ${digitsB[col]} — we need to borrow!`;
    setTimeout(() => {
      const effective = base + 10;
      const cell = state.digitACells[col];
      if (cell) {
        cell.textContent = effective;
        cell.classList.remove('struck');
        cell.classList.add('boosted');
      }
      hintEl.textContent = `Borrowed 10! Now find ${effective} − ${digitsB[col]}.`;
      onReady();
    }, 1100);
    return;
  }

  hintEl.textContent = state.opConfig.hint(state.problem, step);
  if (step.type === 'reduce') {
    const cell = state.digitACells[step.col];
    if (cell) cell.classList.add('struck');
  } else if (step.type === 'result' && state.operationKey === 'sub' && state.problem.transferIn[step.col] === 1) {
    const { digitsA } = state.problem;
    const cell = state.digitACells[step.col];
    if (cell) {
      cell.textContent = digitsA[step.col] - 1;
      cell.classList.remove('struck');
      cell.classList.add('boosted');
    }
  }
  onReady();
}

function wireStep(state) {
  const steps = state.steps;
  const idx = state.stepIndex;
  if (idx >= steps.length) {
    finishProblem(state);
    return;
  }
  const step = steps[idx];
  const input = step.type === 'result' ? state.resultInputs[step.col] : state.carryInputs[step.col];

  if (step.type === 'result' && step.col === state.problem.digitLength) {
    input.style.visibility = 'visible';
  }

  activateStep(state, step, () => {
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
  });
}

function finishProblem(state) {
  state.onComplete();
}

function startProblem(problemIndex) {
  const board = document.getElementById('advanced-board');
  board.innerHTML = '';
  document.getElementById('advanced-progress').textContent =
    `Problem ${problemIndex + 1} / ${config.numProblems}`;

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
  const accuracy = run.totalSteps
    ? Math.round((run.totalFirstTryCorrect / run.totalSteps) * 100)
    : 100;
  document.getElementById('advanced-results-body').innerHTML = `
    <div class="big-stat">${run.problemsCompleted} problems solved</div>
    <div class="stat-row">
      <div class="stat"><div class="val">${accuracy}%</div><div class="lbl">First-try accuracy</div></div>
      <div class="stat"><div class="val">${run.totalMistakes}</div><div class="lbl">Mistakes</div></div>
    </div>
  `;
  showScreen('screen-advanced-results');
  celebrate();
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

  document.getElementById('btn-advanced-start').addEventListener('click', () => {
    run = { problemsCompleted: 0, totalSteps: 0, totalFirstTryCorrect: 0, totalMistakes: 0 };
    showScreen('screen-advanced-play');
    startProblem(0);
  });

  document.getElementById('btn-advanced-again').addEventListener('click', () => {
    run = { problemsCompleted: 0, totalSteps: 0, totalFirstTryCorrect: 0, totalMistakes: 0 };
    showScreen('screen-advanced-play');
    startProblem(0);
  });

  document.querySelectorAll('#advanced-numpad [data-digit]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!activeInput || activeInput.disabled) return;
      activeInput.value = btn.dataset.digit;
      activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
}
