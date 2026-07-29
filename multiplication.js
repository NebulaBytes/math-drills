import { generateLongMultiplication } from './problems.js';
import { playDing, playBuzz } from './sounds.js';
import { setActiveInput } from './input-router.js';

function setHint(text) {
  document.getElementById('advanced-hint-text').textContent = text;
}

function makeBox(cls) {
  const input = document.createElement('input');
  input.className = cls;
  input.maxLength = 1;
  input.inputMode = 'numeric';
  input.disabled = true;
  return input;
}

function ppDigitAt(pp, mLen, col) {
  const i = col - pp.shift;
  if (i >= 0 && i < pp.digits.length) return pp.digits[i];
  if (i === pp.digits.length && pp.finalCarry > 0) return pp.finalCarry;
  return 0;
}

export function startMultiplicationProblem(board, multiplicandLength, onComplete) {
  const problem = generateLongMultiplication(multiplicandLength);
  const {
    multiplicandDigits, multiplierDigits, mLen, totalCols,
    partialProducts, sumTransferIn, sumTransferOut, sumResultDigit
  } = problem;

  // Right-aligned like addition/subtraction: logical column 0 = ones,
  // rendered as the rightmost track.
  function gridCol(c) { return totalCols - c + 1; }
  function place(el, col, row) {
    el.style.gridColumn = String(col);
    el.style.gridRow = String(row);
    board.querySelector('.mult-board').appendChild(el);
    return el;
  }

  board.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'mult-board';
  grid.style.gridTemplateColumns = `56px repeat(${totalCols}, 44px)`;
  board.appendChild(grid);

  let row = 1;

  const multiplicandRow = row++;
  multiplicandDigits.forEach((d, i) => {
    const cell = document.createElement('div');
    cell.className = 'digit-box';
    cell.textContent = d;
    place(cell, gridCol(i), multiplicandRow);
  });

  const multiplierRow = row++;
  const timesSign = document.createElement('div');
  timesSign.className = 'op-sign';
  timesSign.textContent = '×';
  place(timesSign, 1, multiplierRow);
  multiplierDigits.forEach((d, i) => {
    const cell = document.createElement('div');
    cell.className = 'digit-box';
    cell.textContent = d;
    place(cell, gridCol(i), multiplierRow);
  });

  function addDivider() {
    const dividerRow = row++;
    const divider = document.createElement('div');
    divider.className = 'mult-divider';
    divider.style.gridColumn = `${gridCol(totalCols - 1)} / span ${totalCols}`;
    divider.style.gridRow = String(dividerRow);
    grid.appendChild(divider);
  }
  addDivider();

  const ppCarryBoxes = [];
  const ppResultBoxes = [];

  partialProducts.forEach((pp, k) => {
    const carryRowIdx = row++;
    const resultRowIdx = row++;
    const carryBoxes = {};
    const resultBoxes = {};

    for (let i = 0; i < mLen - 1; i++) {
      const col = pp.shift + i + 1;
      const box = makeBox('carry-box');
      place(box, gridCol(col), carryRowIdx);
      carryBoxes[col] = box;
    }
    for (let i = 0; i < mLen; i++) {
      const col = pp.shift + i;
      const box = makeBox('result-box');
      place(box, gridCol(col), resultRowIdx);
      resultBoxes[col] = box;
    }
    const extraCol = pp.shift + mLen;
    const extraBox = makeBox('result-box');
    extraBox.style.visibility = 'hidden';
    place(extraBox, gridCol(extraCol), resultRowIdx);
    resultBoxes[extraCol] = extraBox;

    ppCarryBoxes[k] = carryBoxes;
    ppResultBoxes[k] = resultBoxes;
  });

  addDivider();

  const sumCarryBoxes = {};
  const sumResultBoxes = {};
  const sumCarryRowIdx = row++;
  const sumResultRowIdx = row++;
  for (let c = 1; c < totalCols; c++) {
    const box = makeBox('carry-box');
    place(box, gridCol(c), sumCarryRowIdx);
    sumCarryBoxes[c] = box;
  }
  for (let c = 0; c < totalCols; c++) {
    const box = makeBox('result-box');
    place(box, gridCol(c), sumResultRowIdx);
    sumResultBoxes[c] = box;
  }

  function buildPPSteps(pp) {
    const steps = [];
    for (let i = 0; i < mLen; i++) {
      steps.push({ phase: 'pp', shift: pp.shift, col: pp.shift + i, expected: pp.digits[i] });
      if (pp.carryOut[i] > 0 && i + 1 <= mLen - 1) {
        steps.push({ phase: 'pp-carry', shift: pp.shift, col: pp.shift + i + 1, expected: pp.carryOut[i] });
      }
    }
    if (pp.finalCarry > 0) {
      steps.push({ phase: 'pp', shift: pp.shift, col: pp.shift + mLen, expected: pp.finalCarry });
    }
    return steps;
  }
  function buildSumSteps() {
    const steps = [];
    for (let c = 0; c < totalCols; c++) {
      steps.push({ phase: 'sum', col: c, expected: sumResultDigit[c] });
      if (sumTransferOut[c] === 1 && c + 1 <= totalCols - 1) {
        steps.push({ phase: 'sum-carry', col: c + 1, expected: 1 });
      }
    }
    return steps;
  }

  const allSteps = [
    ...buildPPSteps(partialProducts[0]),
    ...buildPPSteps(partialProducts[1]),
    ...buildSumSteps()
  ];
  const stats = { correctSteps: 0, firstTryCorrect: 0, mistakes: 0, totalSteps: allSteps.length };

  function boxFor(step) {
    if (step.phase === 'pp') return ppResultBoxes[step.shift][step.col];
    if (step.phase === 'pp-carry') return ppCarryBoxes[step.shift][step.col];
    if (step.phase === 'sum') return sumResultBoxes[step.col];
    return sumCarryBoxes[step.col];
  }

  function hintFor(step) {
    if (step.phase === 'pp') {
      const pp = partialProducts[step.shift];
      const i = step.col - step.shift;
      if (i < mLen) {
        const carryIn = pp.carryIn[i];
        return carryIn > 0
          ? `Multiply: ${multiplicandDigits[i]} × ${pp.multiplierDigit}, plus carry ${carryIn}`
          : `Multiply: ${multiplicandDigits[i]} × ${pp.multiplierDigit}`;
      }
      return `Write the final carry: ${pp.finalCarry}`;
    }
    if (step.phase === 'pp-carry') return `Carry the ${step.expected}!`;
    if (step.phase === 'sum') {
      const d0 = ppDigitAt(partialProducts[0], mLen, step.col);
      const d1 = ppDigitAt(partialProducts[1], mLen, step.col);
      return sumTransferIn[step.col] > 0
        ? `Add this column: ${d0} + ${d1} + 1`
        : `Add this column: ${d0} + ${d1}`;
    }
    return `Carry the 1!`;
  }

  function wireInput(input, expected, onSuccess) {
    let missed = false;
    input.disabled = false;
    input.classList.add('active');
    input.value = '';
    input.focus();
    setActiveInput(input);

    input.oninput = () => {
      const val = input.value.replace(/[^0-9]/g, '');
      input.value = val;
      if (val === '') return;
      const num = parseInt(val, 10);
      if (num === expected) {
        input.classList.remove('active', 'wrong');
        input.classList.add('correct');
        input.disabled = true;
        playDing();
        stats.correctSteps++;
        if (!missed) stats.firstTryCorrect++;
        onSuccess();
      } else {
        input.classList.add('wrong');
        playBuzz();
        stats.mistakes++;
        missed = true;
        setTimeout(() => {
          input.classList.remove('wrong');
          input.value = '';
        }, 400);
      }
    };
  }

  function runStep(idx) {
    if (idx >= allSteps.length) {
      setTimeout(() => onComplete(stats), 500);
      return;
    }
    const step = allSteps[idx];
    setHint(hintFor(step));
    const box = boxFor(step);
    if (step.phase === 'pp' && step.col === step.shift + mLen) {
      box.style.visibility = 'visible';
    }
    wireInput(box, step.expected, () => runStep(idx + 1));
  }

  runStep(0);
}
