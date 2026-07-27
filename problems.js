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

export function generateCarryAddition(digitLength) {
  while (true) {
    const digitsA = [];
    const digitsB = [];
    for (let i = 0; i < digitLength; i++) {
      const isLeading = i === digitLength - 1;
      digitsA.push(randInt(isLeading ? 1 : 0, 9));
      digitsB.push(randInt(isLeading ? 1 : 0, 9));
    }
    const transferIn = new Array(digitLength).fill(0);
    const transferOut = new Array(digitLength).fill(0);
    const resultDigit = new Array(digitLength).fill(0);
    let carry = 0;
    for (let i = 0; i < digitLength; i++) {
      transferIn[i] = carry;
      const sum = digitsA[i] + digitsB[i] + carry;
      resultDigit[i] = sum % 10;
      carry = sum >= 10 ? 1 : 0;
      transferOut[i] = carry;
    }
    const hasAnyCarry = transferOut.some(c => c === 1);
    if (hasAnyCarry) {
      return { digitsA, digitsB, transferIn, transferOut, resultDigit, finalTransfer: carry, digitLength };
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
    if (hasAnyBorrow) {
      return { digitsA, digitsB, transferIn, transferOut, resultDigit, finalTransfer: 0, digitLength };
    }
  }
}
