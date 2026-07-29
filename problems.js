export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const TABLES = [2,3,4,5,6,7,8,9,10,11,12];

export function generateFact(operation, opts = {}) {
  const tables = opts.tables && opts.tables.length ? opts.tables : TABLES;
  const rangeMax = opts.rangeMax || 10;
  const op = operation === 'mixed'
    ? ['add','sub','mul','div'][randInt(0,3)]
    : operation;

  switch (op) {
    case 'mul': {
      const a = tables[randInt(0, tables.length - 1)];
      const b = randInt(2, 12);
      return { text: `${a} × ${b}`, answer: a * b };
    }
    case 'div': {
      const a = tables[randInt(0, tables.length - 1)];
      const b = randInt(2, 12);
      const product = a * b;
      return { text: `${product} ÷ ${a}`, answer: b };
    }
    case 'add': {
      const a = randInt(1, rangeMax);
      const b = randInt(1, rangeMax);
      return { text: `${a} + ${b}`, answer: a + b };
    }
    case 'sub': {
      const a = randInt(1, rangeMax);
      const b = randInt(1, a);
      return { text: `${a} − ${b}`, answer: a - b };
    }
    default:
      return generateFact('mul', opts);
  }
}

// Shared column-addition-with-carry simulator: adds two digit arrays
// (index 0 = ones place) of the given length, treating missing/undefined
// positions as 0. Used directly by Carry-over Addition, and by Long
// Multiplication's final "sum the partial products" phase - both are
// exactly the same math.
export function simulateColumnAddition(digitsA, digitsB, length) {
  const transferIn = new Array(length).fill(0);
  const transferOut = new Array(length).fill(0);
  const resultDigit = new Array(length).fill(0);
  let carry = 0;
  for (let i = 0; i < length; i++) {
    transferIn[i] = carry;
    const sum = (digitsA[i] || 0) + (digitsB[i] || 0) + carry;
    resultDigit[i] = sum % 10;
    carry = sum >= 10 ? 1 : 0;
    transferOut[i] = carry;
  }
  return { transferIn, transferOut, resultDigit, finalTransfer: carry };
}

export function generateCarryAddition(digitLength) {
  while (true) {
    const digitsA = [];
    const digitsB = [];
    for (let i = 0; i < digitLength; i++) {
      const isLeading = i === digitLength - 1;
      digitsA.push(randInt(isLeading ? 1 : 0, 9));
      digitsB.push(randInt(isLeading ? 1 : 0, 9));
    }
    const { transferIn, transferOut, resultDigit, finalTransfer } = simulateColumnAddition(digitsA, digitsB, digitLength);
    const hasAnyCarry = transferOut.some(c => c === 1);
    if (hasAnyCarry) {
      return { digitsA, digitsB, transferIn, transferOut, resultDigit, finalTransfer, digitLength };
    }
  }
}

export function generateBorrowSubtraction(digitLength) {
  while (true) {
    const digitsA = [];
    const digitsB = [];
    for (let i = 0; i < digitLength; i++) {
      const isLeading = i === digitLength - 1;
      digitsA.push(randInt(isLeading ? 1 : 0, 9));
      digitsB.push(randInt(isLeading ? 1 : 0, 9));
    }

    const topNum = digitsA.reduceRight((acc, d) => acc * 10 + d, 0);
    const bottomNum = digitsB.reduceRight((acc, d) => acc * 10 + d, 0);
    if (topNum <= bottomNum) continue;

    const transferIn = new Array(digitLength).fill(0);
    const transferOut = new Array(digitLength).fill(0);
    const resultDigit = new Array(digitLength).fill(0);
    let borrow = 0;
    for (let i = 0; i < digitLength; i++) {
      transferIn[i] = borrow;
      let top = digitsA[i] - borrow;
      if (top < digitsB[i]) {
        top += 10;
        borrow = 1;
      } else {
        borrow = 0;
      }
      resultDigit[i] = top - digitsB[i];
      transferOut[i] = borrow;
    }
    const hasAnyBorrow = transferOut.some(b => b === 1);
    if (!hasAnyBorrow) continue;

    // Skip cascading borrows through a zero digit (e.g. borrowing from a
    // "0" column, which itself must borrow further left) - keeping the
    // first version's borrow visual to a single reduce step per column.
    const borrowsThroughZero = transferIn.some((t, i) => t === 1 && digitsA[i] === 0);
    if (borrowsThroughZero) continue;

    return { digitsA, digitsB, transferIn, transferOut, resultDigit, finalTransfer: 0, digitLength };
  }
}

export function generateLongDivision(dividendLength) {
  const divisor = randInt(2, 9);
  const dividendDigits = [];
  for (let i = 0; i < dividendLength; i++) {
    dividendDigits.push(i === 0 ? randInt(divisor, 9) : randInt(0, 9));
  }

  let current = 0;
  const steps = [];
  for (let i = 0; i < dividendLength; i++) {
    current = current * 10 + dividendDigits[i];
    const quotientDigit = Math.floor(current / divisor);
    const product = quotientDigit * divisor;
    const remainder = current - product;
    steps.push({
      partialDividend: current,
      quotientDigit,
      product,
      remainder,
      bringDownDigit: i + 1 < dividendLength ? dividendDigits[i + 1] : null,
      isDecimal: false
    });
    current = remainder;
  }

  // Continue into up to 2 decimal places when the division isn't exact,
  // "bringing down" an implied zero each time (standard long-division
  // convention) rather than stopping at a whole-number remainder.
  const hasDecimalPoint = current !== 0;
  if (hasDecimalPoint) {
    steps[dividendLength - 1].bringDownDigit = 0;
  }

  let decimalDigitCount = 0;
  if (hasDecimalPoint) {
    for (let d = 0; d < 2 && current !== 0; d++) {
      current = current * 10;
      const quotientDigit = Math.floor(current / divisor);
      const product = quotientDigit * divisor;
      const remainder = current - product;
      decimalDigitCount++;
      steps.push({
        partialDividend: current,
        quotientDigit,
        product,
        remainder,
        bringDownDigit: null,
        isDecimal: true
      });
      current = remainder;
    }
    for (let k = dividendLength; k < steps.length - 1; k++) {
      steps[k].bringDownDigit = 0;
    }
  }

  return { divisor, dividendDigits, dividendLength, steps, finalRemainder: current, hasDecimalPoint, decimalDigitCount };
}

const MULTIPLIER_LENGTH = 2;

export function generateLongMultiplication(multiplicandLength) {
  while (true) {
    const mLen = multiplicandLength;
    const tLen = MULTIPLIER_LENGTH;
    const totalCols = mLen + tLen;

    const multiplicandDigits = [];
    for (let i = 0; i < mLen; i++) {
      multiplicandDigits.push(i === mLen - 1 ? randInt(1, 9) : randInt(0, 9));
    }
    const multiplierDigits = [];
    for (let i = 0; i < tLen; i++) {
      multiplierDigits.push(i === tLen - 1 ? randInt(1, 9) : randInt(0, 9));
    }

    // One partial product per multiplier digit: multiplicand x that single
    // digit, worked out column by column exactly like single-digit
    // multiplication-with-carry. shift = how many columns this partial
    // product is offset left (its own multiplier digit's place value).
    const partialProducts = multiplierDigits.map((multiplierDigit, shift) => {
      const digits = [];
      const carryIn = [];
      const carryOut = [];
      let carry = 0;
      for (let i = 0; i < mLen; i++) {
        carryIn.push(carry);
        const product = multiplicandDigits[i] * multiplierDigit + carry;
        digits.push(product % 10);
        carry = Math.floor(product / 10);
        carryOut.push(carry);
      }
      return { multiplierDigit, digits, carryIn, carryOut, finalCarry: carry, shift };
    });

    function shiftedDigits(pp) {
      const arr = new Array(totalCols).fill(0);
      pp.digits.forEach((d, i) => { arr[pp.shift + i] = d; });
      if (pp.finalCarry > 0) arr[pp.shift + pp.digits.length] = pp.finalCarry;
      return arr;
    }

    const { transferIn: sumTransferIn, transferOut: sumTransferOut, resultDigit: sumResultDigit, finalTransfer: sumFinalTransfer } =
      simulateColumnAddition(shiftedDigits(partialProducts[0]), shiftedDigits(partialProducts[1]), totalCols);

    const anyCarryAnywhere =
      partialProducts.some(pp => pp.carryOut.some(c => c > 0) || pp.finalCarry > 0) ||
      sumTransferOut.some(c => c === 1);
    if (!anyCarryAnywhere) continue;

    return {
      multiplicandDigits, multiplierDigits, mLen, tLen, totalCols,
      partialProducts, sumTransferIn, sumTransferOut, sumResultDigit, sumFinalTransfer
    };
  }
}
