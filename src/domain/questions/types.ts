export type DifficultyTier = 'easy' | 'intermediate' | 'hard' | 'hardest';

export type SubnetQuestion = {
  readonly id: string;
  readonly ordinal: number;
  readonly catalogVersion: '17dd300a';
  readonly tier: DifficultyTier;
  readonly type: 'network-address';
  readonly ip: string;
  readonly prefix: number;
  readonly answer: string;
  readonly hints: {
    readonly showMaskBeforeAnswer: boolean;
    readonly showBlockSizeBeforeAnswer: boolean;
  };
};

export type TierConfig = {
  readonly tier: DifficultyTier;
  readonly start: number;
  readonly end: number;
  readonly prefixes: readonly number[];
  readonly showMaskBeforeAnswer: boolean;
  readonly showBlockSizeBeforeAnswer: boolean;
};
