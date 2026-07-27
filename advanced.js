import { generateCarryAddition } from './problems.js';
import { playDing, playBuzz, playCelebration } from './sounds.js';
import { showScreen } from './nav.js';

let config = { digitLength: 3, numProblems: 5 };
let run = null;

function buildSteps(problem) {
  const { digitLength, carryOut, resultDigit, finalCarry } = problem;
  const steps = [];
  for (let i = 0; i < digitLength; i++) {
    steps.push({ type: 'result', col: i, expected: resultDigit[i] });
    if (carryOut[i] === 1 && i + 1 <= digitLength - 1) {
      steps.push({ type: 'carry', col: i + 1, expected: 1 });
    }
  }
  if (finalCarry === 1) {
    steps.push({ type: 'result', col: digitLength, expected: finalCarry });
  }
  return steps;
}

function renderColumnBoard(problem) {
  const { aDigits, bDigits, digitLength } = problem;
  const order = [digitLength, ...Array.from({ length: digitLength }, (_, k) => digitLength - 1 - k)];

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

  // operator column
  const opStack = document.createElement('div');
  opStack.className = 'col-stack op-col';
  opStack.innerHTML = `
    <div class="carry-box placeholder"></div>
    <div class="digit-box blank"></div>
    <div class="digit-box" style="background:transparent;">+</div>
  `;
  topBoard.appendChild(opStack);

  const opResultStack = document.createElement('div');
  opResultStack.className = 'col-stack op-col';
  opResultStack.innerHTML = `<div class="result-box" style="visibility:hidden;"></div>`;
  bottomBoard.appendChild(opResultStack);

  order.forEach(i => {
    const isExtra = i === digitLength;
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
    digitA.textContent = isExtra ? '' : aDigits[i];
    stack.appendChild(digitA);

    const digitB = document.createElement('div');
    digitB.className = 'digit-box' + (isExtra ? ' blank' : '');
    digitB.textContent = isExtra ? '' : bDigits[i];
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

  return { frame, resultInputs, carryInputs };
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

  input.disabled = false;
  input.classList.add('active');
  input.value = '';
  input.focus();
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

function startProblem(problemIndex) {
  const board = document.getElementById('advanced-board');
  board.innerHTML = '';
  document.getElementById('advanced-progress').textContent =
    `Problem ${problemIndex + 1} / ${config.numProblems}`;

  const problem = generateCarryAddition(config.digitLength);
  const { frame, resultInputs, carryInputs } = renderColumnBoard(problem);
  board.appendChild(frame);

  const state = {
    problem,
    steps: buildSteps(problem),
    stepIndex: 0,
    resultInputs,
    carryInputs,
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
}

export function initAdvancedSetup() {
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
}
