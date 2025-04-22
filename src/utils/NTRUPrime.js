const limit = 1024;
//const M = 256

// const len = 256
const len = 10;
// const maxNum = 255;
const maxNum = 9;


/**
 * Encode a list of base-256 digits into a compact stream of decimal digits.
 * 
 * @param {number[]} R - List of integers representing base-256 input bytes.
 * @param {number[]} M - List of moduli (usually [256, 256, ..., 256]).
 * @returns {number[]} - List of decimal digits (0–9).
 */

export function encode(R, M) {
  if (M.length === 0) return [];

  const S = [];

  if (M.length === 1) {
    let r = R[0], m = M[0];
    while (m > 1) {
      S.push(r % 10);
      r = Math.floor(r / 10);
      m = Math.floor((m + 9) / 10);
    }
    return S;
  }

  const R2 = [], M2 = [];
  for (let i = 0; i < M.length - 1; i += 2) {
    let m = M[i] * M[i + 1];
    let r = R[i] + M[i] * R[i + 1];
    while (m >= limit) {
      S.push(r % 10);
      r = Math.floor(r / 10);
      m = Math.floor((m + 9) / 10);
    }
    R2.push(r);
    M2.push(m);
  }

  if (M.length % 2 === 1) {
    R2.push(R[M.length - 1]);
    M2.push(M[M.length - 1]);
  }

  return S.concat(encode(R2, M2));
}

export function decode(S, M = 256) {
  if (M.length === 0) return [];

  if (M.length === 1) {
    let value = 0;
    for (let i = S.length - 1; i >= 0; i--) {
      value = value * len + S[i];
    }
    return [value % M[0]];
  }

  let k = 0;
  let bottom = [],
    M2 = [];

  for (let i = 0; i < M.length - 1; i += 2) {
    let m = M[i] * M[i + 1];
    let r = 0,
      t = 1;
    while (m >= limit) {
      r += S[k] * t;
      t *= len;
      k += 1;
      m = Math.floor((m + maxNum) / len);
    }
    bottom.push([r, t]);
    M2.push(m);
  }

  if (M.length % 2 === 1) {
    M2.push(M[M.length - 1]);
  }

  let R2 = decode(S.slice(k), M2);
  let R = [];

  for (let i = 0; i < M.length - 1; i += 2) {
    let [r, t] = bottom[i / 2];
    r += t * R2[i / 2];
    R.push(r % M[i]);
    R.push(Math.floor(r / M[i]) % M[i + 1]);
  }

  if (M.length % 2 === 1) {
    R.push(R2[R2.length - 1]);
  }

  return R;
}
