import { generateLongDivision } from './problems.js';
import { playDing, playBuzz } from './sounds.js';
import { setActiveInput } from './input-router.js';

function setHint(text) {
  document.getElementById('advanced-hint-text').textContent = text;
}

function makeDigitInput(cls) {
  const input = document.createElement('input');
  input.className = `step-input ${cls}`;
  input.maxLength = 1;
  input.inputMode = 'numeric';
  input.disabled = true;
  return input;
}

function flyArrowDown(fromEl, toEl, digitText, onArrive) {
  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();

  const flyer = document.createElement('div');
  flyer.className = 'fly-arrow';
  flyer.textContent = '↓';
  flyer.style.left = `${fromRect.left + fromRect.width / 2 - 14}px`;
  flyer.style.top = `${fromRect.top + fromRect.height / 2 - 14}px`;
  document.body.appendChild(flyer);

  requestAnimationFrame(() => {
    const dx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
    const dy = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);
    flyer.style.transform = `translate(${dx}px, ${dy}px)`;
  });

  setTimeout(() => {
    flyer.remove();
    toEl.textContent = digitText;
    toEl.classList.add('landed-pop');
    onArrive();
  }, 500);
}

function revealZeroDrop(toEl, onArrive) {
  toEl.textContent = '0';
  toEl.classList.add('landed-pop');
  setTimeout(onArrive, 350);
}

export function startDivisionProblem(board, dividendLength, onComplete) {
  const problem = generateLongDivision(dividendLength);
  const { divisor, dividendDigits, steps, hasDecimalPoint, decimalDigitCount } = problem;
  const totalColumns = dividendLength + decimalDigitCount;

  // Whole-part digit columns are 2..dividendLength+1. When there's a decimal
  // part, the point gets its own dedicated (slim) column right after, and
  // every decimal-step column shifts one further right to make room for it.
  function colFor(stepIndex) {
    return stepIndex < dividendLength ? stepIndex + 2 : stepIndex + 3;
  }

  board.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'division-board';
  grid.style.gridTemplateColumns = hasDecimalPoint
    ? `56px repeat(${dividendLength}, 40px) 14px repeat(${decimalDigitCount}, 40px)`
    : `56px repeat(${totalColumns}, 40px)`;
  board.appendChild(grid);

  if (hasDecimalPoint) {
    const pointEl = document.createElement('div');
    pointEl.className = 'decimal-point';
    pointEl.textContent = '.';
    pointEl.style.gridColumn = String(dividendLength + 2);
    pointEl.style.gridRow = '1';
    grid.appendChild(pointEl);
  }

  // Row 1: one quotient box per column (whole + decimal places)
  const quotientBoxes = steps.map((step, i) => {
    const box = document.createElement('input');
    box.className = 'quotient-box';
    box.maxLength = 1;
    box.inputMode = 'numeric';
    box.disabled = true;
    box.style.gridColumn = String(colFor(i));
    box.style.gridRow = '1';
    grid.appendChild(box);
    return box;
  });

  // Row 2: divisor + dividend digits (bracket) - decimal columns stay empty here
  const divisorEl = document.createElement('div');
  divisorEl.className = 'divisor-value';
  divisorEl.textContent = divisor;
  divisorEl.style.gridColumn = '1';
  divisorEl.style.gridRow = '2';
  grid.appendChild(divisorEl);

  const dividendCells = dividendDigits.map((d, i) => {
    const cell = document.createElement('div');
    cell.className = 'dividend-digit' + (i === 0 ? ' dividend-first' : '');
    cell.textContent = d;
    cell.style.gridColumn = String(colFor(i));
    cell.style.gridRow = '2';
    grid.appendChild(cell);
    return cell;
  });

  const stats = { correctSteps: 0, firstTryCorrect: 0, mistakes: 0, totalSteps: steps.length * 3 };
  let gridRow = 3;

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

  // Sequentially solves each digit of a (possibly multi-digit) value, one
  // box per grid column, so every digit lines up with the column it
  // belongs to instead of being crammed into one wide right-aligned box.
  function wireMultiDigit(gridRowIndex, endCol, expectedValue, onAllDone) {
    const digits = String(expectedValue).split('').map(Number);
    const startCol = endCol - digits.length + 1;
    const boxes = digits.map((d, k) => {
      const box = makeDigitInput('product-input');
      box.style.gridRow = String(gridRowIndex);
      box.style.gridColumn = String(startCol + k);
      grid.appendChild(box);
      return box;
    });
    (function solveBox(k) {
      if (k >= boxes.length) { onAllDone(); return; }
      wireInput(boxes[k], digits[k], () => solveBox(k + 1));
    })(0);
    return startCol;
  }

  function runStep(i) {
    const step = steps[i];
    const col = colFor(i);

    setHint(`How many times does ${divisor} go into ${step.partialDividend}?`);

    wireInput(quotientBoxes[i], step.quotientDigit, () => {
      const productRow = gridRow;
      const lineRow = gridRow + 1;
      const remainderRow = gridRow + 2;
      gridRow += 3;

      const minus = document.createElement('span');
      minus.className = 'step-minus';
      minus.textContent = '−';
      minus.style.gridColumn = '1';
      minus.style.gridRow = String(productRow);
      grid.appendChild(minus);

      setHint(`Multiply: ${step.quotientDigit} × ${divisor}`);
      const productStartCol = wireMultiDigit(productRow, col, step.product, () => {
        setHint(`Subtract: ${step.partialDividend} − ${step.product}`);
        wireMultiDigit(remainderRow, col, step.remainder, () => {
          if (!step.isDecimal) dividendCells[i].classList.add('used');

          if (step.bringDownDigit !== null) {
            const landingCell = document.createElement('div');
            landingCell.className = 'bring-down-digit';
            landingCell.style.gridColumn = String(colFor(i + 1));
            landingCell.style.gridRow = String(remainderRow);
            grid.appendChild(landingCell);

            // The whole->decimal transition row jumps over the slim point
            // column (nothing else in that row needs it), which otherwise
            // reads as a broken gap between the remainder and the brought-
            // down zero. Mark it with its own point so the gap is legible.
            if (i === dividendLength - 1 && hasDecimalPoint) {
              const rowPoint = document.createElement('div');
              rowPoint.className = 'decimal-point';
              rowPoint.textContent = '.';
              rowPoint.style.gridColumn = String(dividendLength + 2);
              rowPoint.style.gridRow = String(remainderRow);
              grid.appendChild(rowPoint);
            }

            const bringingDownRealDigit = i + 1 < dividendLength;
            if (bringingDownRealDigit) {
              flyArrowDown(dividendCells[i + 1], landingCell, String(step.bringDownDigit), () => {
                setTimeout(() => runStep(i + 1), 300);
              });
            } else {
              revealZeroDrop(landingCell, () => {
                setTimeout(() => runStep(i + 1), 300);
              });
            }
          } else {
            setTimeout(() => onComplete(stats), 500);
          }
        });
      });

      const line = document.createElement('div');
      line.className = 'step-line';
      line.style.gridRow = String(lineRow);
      const digitCount = String(step.product).length;
      line.style.gridColumn = `${productStartCol} / span ${digitCount}`;
      grid.appendChild(line);
    });
  }

  runStep(0);
}
