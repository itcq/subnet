import { createSeededRandom } from '../seededRandom';

describe('createSeededRandom', () => {
  it('produces the same sequence for the same seed', () => {
    const first = createSeededRandom('catalog-v1');
    const second = createSeededRandom('catalog-v1');

    expect(Array.from({ length: 8 }, () => first.next())).toEqual(
      Array.from({ length: 8 }, () => second.next()),
    );
  });

  it('produces a different sequence for a different seed', () => {
    const first = createSeededRandom('catalog-v1');
    const second = createSeededRandom('catalog-v2');

    expect(Array.from({ length: 8 }, () => first.next())).not.toEqual(
      Array.from({ length: 8 }, () => second.next()),
    );
  });

  it('keeps next values between zero inclusive and one exclusive', () => {
    const random = createSeededRandom('bounds');

    for (let index = 0; index < 1_000; index += 1) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('generates integers within inclusive bounds', () => {
    const random = createSeededRandom('integer-bounds');
    const values = Array.from({ length: 1_000 }, () => random.integer(4, 7));

    expect(values.every((value) => Number.isInteger(value) && value >= 4 && value <= 7)).toBe(true);
    expect(new Set(values)).toEqual(new Set([4, 5, 6, 7]));
  });

  it.each([
    [Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER + 1],
    [Number.MIN_SAFE_INTEGER - 1, Number.MIN_SAFE_INTEGER - 1],
    [0, 2 ** 32],
    [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  ])('rejects unsafe or unsupported integer range %s through %s', (min, max) => {
    const random = createSeededRandom('invalid-range');

    expect(() => random.integer(min, max)).toThrow('Invalid inclusive integer range');
  });

  it('supports an inclusive span of exactly 2^32', () => {
    const random = createSeededRandom('full-uint32-span');
    const value = random.integer(-2_147_483_648, 2_147_483_647);

    expect(Number.isSafeInteger(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(-2_147_483_648);
    expect(value).toBeLessThanOrEqual(2_147_483_647);
  });

  it('selects only values from the supplied collection', () => {
    const random = createSeededRandom('pick');
    const choices = ['a', 'b', 'c'] as const;

    expect(Array.from({ length: 20 }, () => random.pick(choices)).every((value) => choices.includes(value))).toBe(true);
  });

  it('rejects invalid integer bounds and empty collections', () => {
    const random = createSeededRandom('invalid');

    expect(() => random.integer(2, 1)).toThrow('Invalid inclusive integer range');
    expect(() => random.integer(1.5, 2)).toThrow('Invalid inclusive integer range');
    expect(() => random.pick([])).toThrow('Cannot pick from an empty collection');
  });
});
