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

function flyDown(fromEl, toEl, text, onArrive) {
  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();

  const flyer = document.createElement('div');
  flyer.className = 'fly-digit';
  flyer.textContent = text;
  flyer.style.left = `${fromRect.left + fromRect.width / 2 - 16}px`;
  flyer.style.top = `${fromRect.top + fromRect.height / 2 - 16}px`;
  document.body.appendChild(flyer);

  requestAnimationFrame(() => {
    const dx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
    const dy = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);
    flyer.style.transform = `translate(${dx}px, ${dy}px)`;
  });

  setTimeout(() => {
    flyer.classList.add('landed');
    setTimeout(() => {
      flyer.remove();
      onArrive();
    }, 220);
  }, 550);
}

export function startDivisionProblem(board, dividendLength, onComplete) {
  const problem = generateLongDivision(dividendLength);
  const { divisor, dividendDigits, steps } = problem;

  board.innerHTML = '';

  const frame = document.createElement('div');
  frame.className = 'division-board';

  const top = document.createElement('div');
  top.className = 'division-top';

  const quotientRow = document.createElement('div');
  quotientRow.className = 'quotient-row';
  const quotientBoxes = dividendDigits.map(() => {
    const box = document.createElement('input');
    box.className = 'quotient-box';
    box.maxLength = 1;
    box.inputMode = 'numeric';
    box.disabled = true;
    quotientRow.appendChild(box);
    return box;
  });

  const bracket = document.createElement('div');
  bracket.className = 'division-bracket';
  const divisorEl = document.createElement('span');
  divisorEl.className = 'divisor-value';
  divisorEl.textContent = divisor;
  const dividendRow = document.createElement('div');
  dividendRow.className = 'dividend-row';
  const dividendCells = dividendDigits.map(d => {
    const cell = document.createElement('span');
    cell.className = 'dividend-digit';
    cell.textContent = d;
    dividendRow.appendChild(cell);
    return cell;
  });
  bracket.appendChild(divisorEl);
  bracket.appendChild(dividendRow);

  top.appendChild(quotientRow);
  top.appendChild(bracket);

  const stepsContainer = document.createElement('div');
  stepsContainer.className = 'division-steps';

  frame.appendChild(top);
  frame.appendChild(stepsContainer);
  board.appendChild(frame);

  const stats = { correctSteps: 0, firstTryCorrect: 0, mistakes: 0, totalSteps: dividendLength * 3 };

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
      const stepRow = document.createElement('div');
      stepRow.className = 'division-step';

      const partialLabel = document.createElement('div');
      partialLabel.className = 'partial-value';
      partialLabel.textContent = step.partialDividend;
      stepRow.appendChild(partialLabel);

      const productRow = document.createElement('div');
      productRow.className = 'step-row';
      const minus = document.createElement('span');
      minus.className = 'step-minus';
      minus.textContent = '−';
      const productInput = makeStepInput('product-input');
      productRow.appendChild(minus);
      productRow.appendChild(productInput);
      stepRow.appendChild(productRow);

      const line = document.createElement('div');
      line.className = 'step-line';
      stepRow.appendChild(line);

      const remainderRow = document.createElement('div');
      remainderRow.className = 'step-row';
      const remainderInput = makeStepInput('remainder-input');
      const bringDownSlot = document.createElement('span');
      bringDownSlot.className = 'bring-down-slot';
      remainderRow.appendChild(remainderInput);
      remainderRow.appendChild(bringDownSlot);
      stepRow.appendChild(remainderRow);

      stepsContainer.appendChild(stepRow);

      setHint(`Multiply: ${step.quotientDigit} × ${divisor}`);
      wireInput(productInput, step.product, () => {
        setHint(`Subtract: ${step.partialDividend} − ${step.product}`);
        wireInput(remainderInput, step.remainder, () => {
          dividendCells[i].classList.add('used');
          if (step.bringDownDigit !== null) {
            flyDown(dividendCells[i + 1], remainderRow, String(step.bringDownDigit), () => {
              bringDownSlot.textContent = step.bringDownDigit;
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
