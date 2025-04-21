const limit = 1024;
const M = 256

function encode(R, M) {
  if (M.length === 0) return [];
  let S = [];

  if (M.length === 1) {
    let r = R[0], m = M[0];
    while (m > 1) {
      S.push(r % 256);
      r = Math.floor(r / 256);
      m = Math.floor((m + 255) / 256);
    }
    return S;
  }

  let R2 = [], M2 = [];

  for (let i = 0; i < M.length - 1; i += 2) {
    let m = M[i] * M[i + 1];
    let r = R[i] + M[i] * R[i + 1];
    while (m >= limit) {
      S.push(r % 256);
      r = Math.floor(r / 256);
      m = Math.floor((m + 255) / 256);
    }
    R2.push(r);
    M2.push(m);
  }

  if (M.length % 2 === 1) {
    R2.push(R[R.length - 1]);
    M2.push(M[M.length - 1]);
  }

  return S.concat(encode(R2, M2));
}

function decode(S, M) {
  if (M.length === 0) return [];

  if (M.length === 1) {
    let value = 0;
    for (let i = S.length - 1; i >= 0; i--) {
      value = value * 256 + S[i];
    }
    return [value % M[0]];
  }

  let k = 0;
  let bottom = [], M2 = [];

  for (let i = 0; i < M.length - 1; i += 2) {
    let m = M[i] * M[i + 1];
    let r = 0, t = 1;
    while (m >= limit) {
      r += S[k] * t;
      t *= 256;
      k += 1;
      m = Math.floor((m + 255) / 256);
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
