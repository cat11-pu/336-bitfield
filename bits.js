// bits.js：位串操作（位串下标即字符下标，零基、从左到右）
export function setBit(text, index, value) {
  if (typeof text !== "string" || !Number.isInteger(index) || index < 0 || index >= text.length) {
    return text;
  }
  const bit = value === 1 || value === "1" || value === true ? "1" : "0";
  return text.slice(0, index) + bit + text.slice(index + 1);
}

export function bitAt(text, index) {
  return typeof text === "string" && text.charAt(index) === "1" ? 1 : 0;
}

export function countOnes(text) {
  const matched = typeof text === "string" ? text.match(/1/g) : null;
  return matched ? matched.length : 0;
}
