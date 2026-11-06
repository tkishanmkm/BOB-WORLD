export interface TpinVerifier {
  algorithm: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  hash: string;
}

const ITERATIONS = 150_000;
const KEY_BYTES = 256;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

function fromHex(value: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) throw new Error('Invalid TPIN verifier.');
  return new Uint8Array(value.match(/.{2}/g)!.map(part => Number.parseInt(part, 16)));
}

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    material,
    KEY_BYTES,
  );
  return new Uint8Array(bits);
}

/** Store a salted, iterated verifier; never persist the four-digit TPIN itself. */
export async function createTpinVerifier(pin: string): Promise<TpinVerifier> {
  if (!/^\d{4}$/.test(pin)) throw new Error('TPIN must contain exactly four digits.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, ITERATIONS);
  return {
    algorithm: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt: toHex(salt),
    hash: toHex(hash),
  };
}

export async function verifyTpin(pin: string, rawVerifier: string | null): Promise<boolean> {
  if (!rawVerifier || !/^\d{4}$/.test(pin)) return false;
  try {
    const verifier = JSON.parse(rawVerifier) as TpinVerifier;
    if (
      verifier.algorithm !== 'PBKDF2-SHA256' ||
      !Number.isInteger(verifier.iterations) ||
      verifier.iterations < 100_000 ||
      verifier.iterations > 1_000_000
    ) return false;
    const salt = fromHex(verifier.salt);
    const expected = fromHex(verifier.hash);
    const actual = await derive(pin, salt, verifier.iterations);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
    return difference === 0;
  } catch {
    return false;
  }
}
