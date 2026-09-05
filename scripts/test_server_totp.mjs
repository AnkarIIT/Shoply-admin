// Test the server's TOTP functions directly
import pkg from '../dist/server.cjs';
const { verifyTotp, generateTotp, base32Decode, generateHOTP } = pkg;

const secret = 'J5JWX4F4XEWJI22W6ORFMLBVSOI3IINA';

console.log('Server generateTotp:', generateTotp(secret));
console.log('Server verifyTotp(288045):', verifyTotp(secret, '288045'));
console.log('Server verifyTotp(288044):', verifyTotp(secret, '288044'));
console.log('Server verifyTotp(288046):', verifyTotp(secret, '288046'));
console.log('Server verifyTotp(177326):', verifyTotp(secret, '177326'));
console.log('Server verifyTotp(958241):', verifyTotp(secret, '958241'));
console.log('Server verifyTotp(337011):', verifyTotp(secret, '337011'));
console.log('Server verifyTotp(190648):', verifyTotp(secret, '190648'));

// Also test with the exact counter
const decoded = base32Decode(secret);
const counter = Math.floor(Date.now() / 30000);
console.log('Counter:', counter);
for (let i = -2; i <= 2; i++) {
  console.log('HOTP counter', counter + i, ':', generateHOTP(decoded, counter + i));
}