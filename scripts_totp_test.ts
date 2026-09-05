import { generateHOTP, base32Encode, generateTotpSecret, verifyTotp, generateTotp } from './server/auth';

const RFC4226_SECRET = Buffer.from('12345678901234567890', 'ascii');
const RFC4226_EXPECTED = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, extra?: string) {
  if (ok) { pass++; console.log(`PASS ${name}`); }
  else { fail++; console.log(`FAIL ${name} ${extra || ''}`); }
}

// 1. Official RFC 4226 HOTP-SHA1 vectors
for (let i = 0; i < 10; i++) {
  check(`rfc4226 counter=${i}`, generateHOTP(RFC4226_SECRET, i) === RFC4226_EXPECTED[i], `got ${generateHOTP(RFC4226_SECRET, i)}`);
}

// 2. Same check through base32 (what authenticator apps receive)
const b32 = base32Encode(RFC4226_SECRET);
check('secret base32 shape', /^[A-Z2-7]{32}$/.test(b32), b32);
// decode(b64) must yield the original bytes for SHA1 secret ascii
check('rfc4226 via base32 counter=1', generateHOTP(Buffer.from(b32, 'ascii').length && requireBase32DecodePad(b32), 1) === '287082', 'decode path');

function requireBase32DecodePad(s: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0; const bytes: number[] = [];
  for (const ch of s.toUpperCase()) {
    const idx = alphabet.indexOf(ch);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(bytes);
}

// 3. Round-trip random secrets
for (let t = 0; t < 5; t++) {
  const secret = generateTotpSecret();
  const decoded = requireBase32DecodePad(secret);
  const re = base32Encode(decoded);
  check(`roundtrip secret #${t}`, re === secret && decoded.length === 20, `${secret} -> ${re}`);
}

// 4. verifyTotp accepts the code currently generated
const s = generateTotpSecret();
check('verifyTotp accepts current code', verifyTotp(s, generateTotp(s)) === true);
check('verifyTotp rejects bad code', verifyTotp(s, '000000') === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);