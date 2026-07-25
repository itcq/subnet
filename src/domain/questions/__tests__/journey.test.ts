import { subnetQuestionCatalog } from '../catalog';
import { getJourneyPosition } from '../journey';

describe('getJourneyPosition', () => {
  it.each([
    [1, 'easy', 'Foundations', 1, 5, 1, 1, 5],
    [5, 'easy', 'Foundations', 1, 5, 1, 5, 5],
    [6, 'easy', 'Foundations', 1, 5, 2, 1, 5],
    [20, 'easy', 'Foundations', 1, 5, 4, 5, 5],
    [21, 'easy', 'Foundations', 2, 5, 1, 1, 5],
    [100, 'easy', 'Foundations', 5, 5, 4, 5, 5],
    [101, 'intermediate', 'Builder', 1, 10, 1, 1, 5],
    [280, 'intermediate', 'Builder', 9, 10, 4, 5, 5],
    [281, 'intermediate', 'Builder', 10, 10, 1, 1, 5],
    [299, 'intermediate', 'Builder', 10, 10, 4, 4, 4],
    [300, 'hard', 'Advanced', 1, 5, 1, 1, 5],
    [399, 'hard', 'Advanced', 5, 5, 4, 5, 5],
    [400, 'hardest', 'Mastery', 1, 5, 1, 1, 5],
    [414, 'hardest', 'Mastery', 1, 5, 3, 5, 5],
    [415, 'hardest', 'Mastery', 1, 5, 4, 1, 6],
    [420, 'hardest', 'Mastery', 1, 5, 4, 6, 6],
    [421, 'hardest', 'Mastery', 2, 5, 1, 1, 5],
    [500, 'hardest', 'Mastery', 5, 5, 4, 5, 5],
  ] as const)(
    'maps ordinal %i to its stable stage, unit, lesson, and challenge',
    (ordinal, tier, stage, unit, unitsInStage, lesson, challenge, challengesInLesson) => {
      expect(getJourneyPosition(ordinal)).toEqual(
        expect.objectContaining({
          ordinal,
          tier,
          stage,
          unit,
          unitsInStage,
          lesson,
          lessonsInUnit: 4,
          challenge,
          challengesInLesson,
        }),
      );
    },
  );

  it('partitions every catalog question without gaps or tiny lessons', () => {
    const positions = subnetQuestionCatalog.map(({ ordinal }) => getJourneyPosition(ordinal));

    expect(positions.map(({ ordinal }) => ordinal)).toEqual(
      subnetQuestionCatalog.map(({ ordinal }) => ordinal),
    );
    expect(Math.min(...positions.map(({ challengesInLesson }) => challengesInLesson))).toBeGreaterThanOrEqual(4);
    expect(Math.max(...positions.map(({ challengesInLesson }) => challengesInLesson))).toBeLessThanOrEqual(6);
  });

  it.each([0, 501, 1.5, Number.NaN])('rejects invalid ordinal %s', (ordinal) => {
    expect(() => getJourneyPosition(ordinal)).toThrow(
      'Journey ordinal must be an integer from 1 through 500',
    );
  });
});
