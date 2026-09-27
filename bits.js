// bits.js：位串操作（基线：一律原样返回）
export function setBit(text, index, value) {
  const bit = value === 1 || value === "1" ? "1" : "0";
  return text.slice(0, index) + bit + text.slice(index + 1);
}

export function bitAt(text, index) {
  return text.charAt(index) === "1" ? 1 : 0;
}

export function countOnes(text) {
  let total = 0;
  for (const ch of text) {
    if (ch === "1") total += 1;
  }
  return total;
}
