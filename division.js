import { generateLongDivision } from './problems.js';
import { playDing, playBuzz } from './sounds.js';
import { setActiveInput } from './input-router.js';

function setHint(text) {
  document.getElementById('advanced-hint-text').textContent = text;
}

function makeStepInput(cls) {
  const input = document.createElement('input');
  input.className = `step-input ${cls}`;
  input.maxLength = 2;
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

export function startDivisionProblem(board, dividendLength, onComplete) {
  const problem = generateLongDivision(dividendLength);
  const { divisor, dividendDigits, steps } = problem;

  board.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'division-board';
  grid.style.gridTemplateColumns = `56px repeat(${dividendLength}, 44px)`;
  board.appendChild(grid);

  // Row 1: quotient boxes, one per dividend digit column
  const quotientBoxes = dividendDigits.map((_, i) => {
    const box = document.createElement('input');
    box.className = 'quotient-box';
    box.maxLength = 1;
    box.inputMode = 'numeric';
    box.disabled = true;
    box.style.gridColumn = String(i + 2);
    box.style.gridRow = '1';
    grid.appendChild(box);
    return box;
  });

  // Row 2: divisor + dividend digits (bracket)
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
    cell.style.gridColumn = String(i + 2);
    cell.style.gridRow = '2';
    grid.appendChild(cell);
    return cell;
  });

  const stats = { correctSteps: 0, firstTryCorrect: 0, mistakes: 0, totalSteps: dividendLength * 3 };
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
      if (val === '' || val.length < String(expected).length) return;
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

  function runStep(i) {
    const step = steps[i];
    setHint(`How many times does ${divisor} go into ${step.partialDividend}?`);

    wireInput(quotientBoxes[i], step.quotientDigit, () => {
      const productRow = gridRow;
      const lineRow = gridRow + 1;
      const remainderRow = gridRow + 2;
      gridRow += 3;

      const isTwoDigitProduct = step.product >= 10;
      const productSpan = isTwoDigitProduct ? `${i + 1} / span 2` : String(i + 2);

      const minus = document.createElement('span');
      minus.className = 'step-minus';
      minus.textContent = '−';
      minus.style.gridColumn = '1';
      minus.style.gridRow = String(productRow);
      grid.appendChild(minus);

      const productInput = makeStepInput('product-input');
      productInput.style.gridRow = String(productRow);
      productInput.style.gridColumn = productSpan;
      grid.appendChild(productInput);

      const line = document.createElement('div');
      line.className = 'step-line';
      line.style.gridRow = String(lineRow);
      line.style.gridColumn = productSpan;
      grid.appendChild(line);

      const remainderInput = makeStepInput('remainder-input');
      remainderInput.style.gridRow = String(remainderRow);
      remainderInput.style.gridColumn = String(i + 2);
      grid.appendChild(remainderInput);

      setHint(`Multiply: ${step.quotientDigit} × ${divisor}`);
      wireInput(productInput, step.product, () => {
        setHint(`Subtract: ${step.partialDividend} − ${step.product}`);
        wireInput(remainderInput, step.remainder, () => {
          dividendCells[i].classList.add('used');
          if (step.bringDownDigit !== null) {
            const landingCell = document.createElement('div');
            landingCell.className = 'bring-down-digit';
            landingCell.style.gridColumn = String(i + 3);
            landingCell.style.gridRow = String(remainderRow);
            grid.appendChild(landingCell);

            flyArrowDown(dividendCells[i + 1], landingCell, String(step.bringDownDigit), () => {
              setTimeout(() => runStep(i + 1), 300);
            });
          } else {
            setTimeout(() => onComplete(stats), 500);
          }
        });
      });
    });
  }

  runStep(0);
}
