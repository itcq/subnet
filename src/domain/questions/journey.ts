import { getTierConfig, tierConfigs } from './tierConfig';
import type { DifficultyTier } from './types';

const LESSONS_PER_UNIT = 4;
const STANDARD_LESSON_SIZE = 5;

const STAGE_CONFIG: Readonly<
  Record<DifficultyTier, Readonly<{ stage: string; units: number; description: string }>>
> = Object.freeze({
  easy: Object.freeze({
    stage: 'Foundations',
    units: 5,
    description: 'Build confidence with network boundaries and core subnet patterns.',
  }),
  intermediate: Object.freeze({
    stage: 'Builder',
    units: 10,
    description: 'Apply subnetting decisions across a wider range of networks.',
  }),
  hard: Object.freeze({
    stage: 'Advanced',
    units: 5,
    description: 'Solve tighter boundaries with fewer hints.',
  }),
  hardest: Object.freeze({
    stage: 'Mastery',
    units: 5,
    description: 'Master edge cases, including point-to-point and host routes.',
  }),
});

export const JOURNEY_STAGES = Object.freeze(
  tierConfigs.map((tier, index) =>
    Object.freeze({
      tier: tier.tier,
      stage: STAGE_CONFIG[tier.tier].stage,
      description: STAGE_CONFIG[tier.tier].description,
      units: STAGE_CONFIG[tier.tier].units,
      start: tier.start,
      end: tier.end,
      stageNumber: index + 1,
    }),
  ),
);

export type JourneyPosition = Readonly<{
  ordinal: number;
  tier: DifficultyTier;
  stage: string;
  stageNumber: number;
  unit: number;
  unitsInStage: number;
  lesson: number;
  lessonsInUnit: number;
  challenge: number;
  challengesInLesson: number;
}>;

export function getJourneyPosition(ordinal: number): JourneyPosition {
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 500) {
    throw new Error('Journey ordinal must be an integer from 1 through 500');
  }

  const tier = getTierConfig(ordinal);
  const stage = STAGE_CONFIG[tier.tier];
  const stageSize = tier.end - tier.start + 1;
  const baseUnitSize = Math.floor(stageSize / stage.units);
  const largerUnitCount = stageSize % stage.units;
  const offset = ordinal - tier.start;
  const largerUnitSpan = largerUnitCount * (baseUnitSize + 1);

  let unit: number;
  let unitOffset: number;
  let unitSize: number;

  if (offset < largerUnitSpan) {
    unitSize = baseUnitSize + 1;
    unit = Math.floor(offset / unitSize) + 1;
    unitOffset = offset % unitSize;
  } else {
    const balancedOffset = offset - largerUnitSpan;
    unitSize = baseUnitSize;
    unit = largerUnitCount + Math.floor(balancedOffset / unitSize) + 1;
    unitOffset = balancedOffset % unitSize;
  }

  const standardLessonSpan = STANDARD_LESSON_SIZE * (LESSONS_PER_UNIT - 1);
  const lesson = unitOffset < standardLessonSpan
    ? Math.floor(unitOffset / STANDARD_LESSON_SIZE) + 1
    : LESSONS_PER_UNIT;
  const challenge = unitOffset < standardLessonSpan
    ? (unitOffset % STANDARD_LESSON_SIZE) + 1
    : unitOffset - standardLessonSpan + 1;
  const challengesInLesson = lesson < LESSONS_PER_UNIT
    ? STANDARD_LESSON_SIZE
    : unitSize - standardLessonSpan;

  return Object.freeze({
    ordinal,
    tier: tier.tier,
    stage: stage.stage,
    stageNumber: JOURNEY_STAGES.findIndex(({ tier: stageTier }) => stageTier === tier.tier) + 1,
    unit,
    unitsInStage: stage.units,
    lesson,
    lessonsInUnit: LESSONS_PER_UNIT,
    challenge,
    challengesInLesson,
  });
}
