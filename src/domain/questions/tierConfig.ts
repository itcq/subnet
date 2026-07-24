import type { DifficultyTier, TierConfig } from './types';

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

const configs: TierConfig[] = [
  {
    tier: 'easy',
    start: 1,
    end: 100,
    prefixes: range(24, 30),
    showMaskBeforeAnswer: true,
    showBlockSizeBeforeAnswer: true,
  },
  {
    tier: 'intermediate',
    start: 101,
    end: 299,
    prefixes: [...range(16, 23), ...range(25, 30)],
    showMaskBeforeAnswer: true,
    showBlockSizeBeforeAnswer: false,
  },
  {
    tier: 'hard',
    start: 300,
    end: 399,
    prefixes: [...range(8, 15), ...range(17, 23)],
    showMaskBeforeAnswer: false,
    showBlockSizeBeforeAnswer: false,
  },
  {
    tier: 'hardest',
    start: 400,
    end: 500,
    prefixes: range(1, 32),
    showMaskBeforeAnswer: false,
    showBlockSizeBeforeAnswer: false,
  },
];

export const tierConfigs: readonly TierConfig[] = Object.freeze(
  configs.map((config): TierConfig =>
    Object.freeze({ ...config, prefixes: Object.freeze(config.prefixes) }),
  ),
);

export function getTierConfig(ordinal: number): TierConfig {
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 500) {
    throw new Error('Question ordinal must be an integer from 1 through 500');
  }

  return tierConfigs.find(({ start, end }) => ordinal >= start && ordinal <= end)!;
}

export function getTierForOrdinal(ordinal: number): DifficultyTier {
  return getTierConfig(ordinal).tier;
}
