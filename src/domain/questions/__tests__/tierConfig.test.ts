import { getTierConfig, getTierForOrdinal, tierConfigs } from '../tierConfig';

describe('tier configuration', () => {
  it('covers every question ordinal from 1 through 500 exactly once', () => {
    const ordinals = tierConfigs.flatMap(({ start, end }) =>
      Array.from({ length: end - start + 1 }, (_, index) => start + index),
    );

    expect(ordinals).toHaveLength(500);
    expect(ordinals).toEqual(Array.from({ length: 500 }, (_, index) => index + 1));
  });

  it('uses the approved tier ranges', () => {
    expect(tierConfigs.map(({ tier, start, end }) => ({ tier, start, end }))).toEqual([
      { tier: 'easy', start: 1, end: 100 },
      { tier: 'intermediate', start: 101, end: 299 },
      { tier: 'hard', start: 300, end: 399 },
      { tier: 'hardest', start: 400, end: 500 },
    ]);
    expect(getTierForOrdinal(300)).toBe('hard');
  });

  it('returns the complete configuration for an ordinal', () => {
    expect(getTierConfig(400)).toMatchObject({
      tier: 'hardest',
      start: 400,
      end: 500,
      showMaskBeforeAnswer: false,
      showBlockSizeBeforeAnswer: false,
    });
  });

  it('freezes tier configurations and their prefix arrays', () => {
    expect(Object.isFrozen(tierConfigs)).toBe(true);

    for (const config of tierConfigs) {
      expect(Object.isFrozen(config)).toBe(true);
      expect(Object.isFrozen(config.prefixes)).toBe(true);
    }

    const originalStart = tierConfigs[0].start;
    try {
      (tierConfigs[0] as { start: number }).start = 999;
    } catch {
      // Strict-mode runtimes throw; non-strict runtimes silently reject the write.
    }
    expect(tierConfigs[0].start).toBe(originalStart);
  });

  it.each([0, 501, 1.5])('rejects invalid ordinal %s', (ordinal) => {
    expect(() => getTierForOrdinal(ordinal)).toThrow('Question ordinal must be an integer from 1 through 500');
  });
});
