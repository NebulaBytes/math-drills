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
    const aDigits = [];
    const bDigits = [];
    for (let i = 0; i < digitLength; i++) {
      const isLeading = i === digitLength - 1;
      aDigits.push(randInt(isLeading ? 1 : 0, 9));
      bDigits.push(randInt(isLeading ? 1 : 0, 9));
    }
    const carryIn = new Array(digitLength).fill(0);
    const carryOut = new Array(digitLength).fill(0);
    const resultDigit = new Array(digitLength).fill(0);
    let carry = 0;
    for (let i = 0; i < digitLength; i++) {
      carryIn[i] = carry;
      const sum = aDigits[i] + bDigits[i] + carry;
      resultDigit[i] = sum % 10;
      carry = sum >= 10 ? 1 : 0;
      carryOut[i] = carry;
    }
    const hasAnyCarry = carryOut.some(c => c === 1);
    if (hasAnyCarry) {
      return { aDigits, bDigits, carryIn, carryOut, resultDigit, finalCarry: carry, digitLength };
    }
  }
}
