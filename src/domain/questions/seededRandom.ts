export type RandomSource = {
  next(): number;
  integer(min: number, max: number): number;
  pick<T>(values: readonly T[]): T;
};

function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

export function createSeededRandom(seed: string): RandomSource {
  // This deterministic PRNG is for reproducible curriculum content only.
  // It must never be used for credentials, tokens, or security decisions.
  let state = hashSeed(seed);

  function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  }

  function integer(min: number, max: number): number {
    const span = max - min + 1;
    if (
      !Number.isSafeInteger(min) ||
      !Number.isSafeInteger(max) ||
      min > max ||
      !Number.isSafeInteger(span) ||
      span > 2 ** 32
    ) {
      throw new Error('Invalid inclusive integer range');
    }

    return Math.floor(next() * span) + min;
  }

  function pick<T>(values: readonly T[]): T {
    if (values.length === 0) {
      throw new Error('Cannot pick from an empty collection');
    }

    return values[integer(0, values.length - 1)];
  }

  return { next, integer, pick };
}
