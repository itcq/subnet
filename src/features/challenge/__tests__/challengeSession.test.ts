import { subnetQuestionCatalog } from '@/domain/questions/catalog';
import type { SubnetQuestion } from '@/domain/questions/types';

import {
  advanceSession,
  createChallengeSession,
  submitCurrentAnswer,
  updateAnswerOctet,
  type ChallengeSessionState,
} from '../challengeSession';

function question(ordinal: number, answer = `10.0.0.${ordinal}`): SubnetQuestion {
  return {
    id: `question-${ordinal}`,
    ordinal,
    catalogVersion: '17dd300a',
    tier: 'easy',
    type: 'network-address',
    ip: `10.0.0.${ordinal}`,
    prefix: 24,
    answer,
    hints: {
      showMaskBeforeAnswer: true,
      showBlockSizeBeforeAnswer: true,
    },
  };
}

const catalog = [question(1), question(2), question(3)] as const;

function catalogIdentity(questions: readonly SubnetQuestion[]): string {
  return JSON.stringify(questions);
}

function expectedIdentityFields(questions: readonly SubnetQuestion[], currentIndex = 0) {
  return {
    catalogVersion: questions[0].catalogVersion,
    catalogIdentity: catalogIdentity(questions),
    currentQuestionId: questions[currentIndex].id,
  };
}

describe('createChallengeSession', () => {
  it('starts at the first question when there is no progress', () => {
    expect(createChallengeSession(catalog)).toEqual({
      ...expectedIdentityFields(catalog),
      currentOrdinal: 1,
      answerOctets: ['', '', '', ''],
      feedback: null,
      completedOrdinals: [],
      curriculumComplete: false,
    });
  });

  it('resumes at the first incomplete ordinal', () => {
    expect(createChallengeSession(catalog, [1, 2]).currentOrdinal).toBe(3);
  });

  it('supports a contiguous fixture catalog whose first ordinal is not one', () => {
    expect(createChallengeSession([question(7), question(8)], [7]).currentOrdinal).toBe(8);
  });

  it('rejects an empty catalog descriptively', () => {
    expect(() => createChallengeSession([])).toThrow('Challenge catalog must not be empty');
  });

  it('rejects an unsorted catalog descriptively', () => {
    expect(() => createChallengeSession([question(2), question(1)])).toThrow(
      'Challenge catalog ordinals must be sorted and contiguous',
    );
  });

  it('rejects a noncontiguous catalog descriptively', () => {
    expect(() => createChallengeSession([question(4), question(6)])).toThrow(
      'Challenge catalog ordinals must be sorted and contiguous',
    );
  });

  it('rejects duplicate catalog ordinals descriptively even when separated', () => {
    expect(() => createChallengeSession([question(4), question(5), question(4)])).toThrow(
      'Challenge catalog contains duplicate ordinal 4',
    );
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid catalog ordinal %s',
    (ordinal) => {
      expect(() => createChallengeSession([question(ordinal)])).toThrow(
        'Challenge catalog ordinals must be safe positive integers',
      );
    },
  );

  it('rejects empty and mixed catalog versions', () => {
    const emptyVersion = { ...question(1), catalogVersion: ' ' } as unknown as SubnetQuestion;
    const otherVersion = {
      ...question(2),
      catalogVersion: 'ipv4-network-v2',
    } as unknown as SubnetQuestion;

    expect(() => createChallengeSession([emptyVersion])).toThrow(
      'Challenge catalogVersion must be a non-empty string',
    );
    expect(() => createChallengeSession([question(1), otherVersion])).toThrow(
      'Challenge catalog must use one shared catalogVersion',
    );
  });

  it('rejects empty and duplicate question ids', () => {
    const emptyId = { ...question(1), id: ' ' };
    const duplicateId = { ...question(2), id: question(1).id };

    expect(() => createChallengeSession([emptyId])).toThrow(
      'Challenge question ids must be non-empty strings',
    );
    expect(() => createChallengeSession([question(1), duplicateId])).toThrow(
      'Challenge catalog contains duplicate question id question-1',
    );
  });

  it('fails closed when a completed ordinal is outside the active catalog', () => {
    expect(() => createChallengeSession(catalog, [1, 99])).toThrow(
      'Completed ordinal 99 is not present in the active challenge catalog',
    );
  });

  it('normalizes and freezes completed progress', () => {
    const state = createChallengeSession(catalog, [2, 2]);

    expect(state.completedOrdinals).toEqual([2]);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.answerOctets)).toBe(true);
    expect(Object.isFrozen(state.completedOrdinals)).toBe(true);
  });
});

describe('updateAnswerOctet', () => {
  it.each([
    ['12a3', '123'],
    ['999', '255'],
    ['abc', ''],
    ['0007', '7'],
  ])('sanitizes %s to %s', (value, expected) => {
    const state = createChallengeSession(catalog);

    expect(updateAnswerOctet(state, 2, value).answerOctets).toEqual([
      '',
      '',
      expected,
      '',
    ]);
  });

  it('does not edit an answer after the current question is correct', () => {
    const correct = submitCurrentAnswer(
      {
        ...createChallengeSession(catalog),
        answerOctets: ['10', '0', '0', '1'],
      },
      catalog,
    );

    const unchanged = updateAnswerOctet(correct, 0, '200');

    expect(unchanged).toEqual(correct);
    expect(() => advanceSession(unchanged, catalog)).not.toThrow();
  });

  it('clears feedback without mutating the previous state', () => {
    const state = {
      ...createChallengeSession(catalog),
      answerOctets: ['10', '0', '0', '1'] as const,
      feedback: 'incorrect' as const,
    };

    const updated = updateAnswerOctet(state, 0, '200');

    expect(updated).toEqual({
      ...state,
      answerOctets: ['200', '0', '0', '1'],
      feedback: null,
    });
    expect(state.answerOctets).toEqual(['10', '0', '0', '1']);
    expect(state.feedback).toBe('incorrect');
  });

  it.each([
    ['three answer octets', { answerOctets: ['', '', ''] }],
    ['five answer octets', { answerOctets: ['', '', '', '', ''] }],
    ['non-string answer octet', { answerOctets: ['', '', 3, ''] }],
    ['invalid feedback', { feedback: 'maybe' }],
    ['unsafe current ordinal', { currentOrdinal: Number.NaN }],
    ['missing current ordinal', { currentOrdinal: 99 }],
    ['mismatched current question id', { currentQuestionId: 'question-2' }],
    ['mismatched catalog version', { catalogVersion: 'ipv4-network-v2' }],
    ['malformed catalog identity', { catalogIdentity: 'not-json' }],
    ['duplicate completed ordinal', { completedOrdinals: [1, 1, 2] }],
    ['out-of-catalog completed ordinal', { completedOrdinals: [99] }],
    ['unsafe completed ordinal', { completedOrdinals: [Number.POSITIVE_INFINITY] }],
    ['incorrect curriculum completion', { curriculumComplete: true }],
  ])('fails closed on arbitrary state with %s', (_description, override) => {
    const malformed = {
      ...createChallengeSession(catalog),
      ...override,
    } as unknown as ChallengeSessionState;

    expect(() => updateAnswerOctet(malformed, 0, '1')).toThrow();
  });
});

describe('submitCurrentAnswer', () => {
  it('marks a correctly answered current ordinal complete exactly once', () => {
    const state = {
      ...createChallengeSession(catalog),
      answerOctets: ['10', '0', '0', '1'] as const,
    };

    const firstSubmission = submitCurrentAnswer(state, catalog);
    const repeatedSubmission = submitCurrentAnswer(firstSubmission, catalog);

    expect(firstSubmission.feedback).toBe('correct');
    expect(firstSubmission.completedOrdinals).toEqual([1]);
    expect(repeatedSubmission.completedOrdinals).toEqual([1]);
    expect(state.completedOrdinals).toEqual([]);
  });

  it('reports an incorrect answer without changing completion', () => {
    const state = {
      ...createChallengeSession(catalog, [2]),
      answerOctets: ['10', '0', '0', '99'] as const,
    };

    const submitted = submitCurrentAnswer(state, catalog);

    expect(submitted.feedback).toBe('incorrect');
    expect(submitted.completedOrdinals).toEqual([2]);
    expect(state.feedback).toBeNull();
  });

  it.each(['id', 'version', 'answer'] as const)(
    'rejects a replacement catalog with changed %s content',
    (changedField) => {
      const state = createChallengeSession(catalog);
      const replacement = catalog.map((entry) => ({
        ...entry,
        ...(changedField === 'id'
          ? { id: `replacement-${entry.ordinal}` }
          : changedField === 'version'
            ? { catalogVersion: 'ipv4-network-v2' }
            : { answer: '10.255.255.0' }),
      })) as unknown as readonly SubnetQuestion[];

      expect(() => submitCurrentAnswer(state, replacement)).toThrow(
        'Challenge session catalog identity does not match the active catalog',
      );
    },
  );

  it('rejects duplicate completed ordinals instead of falsely completing', () => {
    const malformed = {
      ...createChallengeSession(catalog),
      currentOrdinal: 3,
      currentQuestionId: 'question-3',
      answerOctets: ['10', '0', '0', '99'],
      completedOrdinals: [1, 1, 2],
    } as unknown as ChallengeSessionState;

    expect(() => submitCurrentAnswer(malformed, catalog)).toThrow(
      'Challenge session completed ordinals must be unique',
    );
  });
});

describe('advanceSession', () => {
  it('rejects forged correct feedback without recorded completion', () => {
    const forged = {
      ...createChallengeSession(catalog),
      feedback: 'correct',
    } as ChallengeSessionState;

    expect(() => advanceSession(forged, catalog)).toThrow(
      'Correct feedback requires the current question to be complete',
    );
  });

  it('rejects a current question that is not the first incomplete question', () => {
    const outOfOrder = {
      ...createChallengeSession(catalog),
      currentOrdinal: 2,
      currentQuestionId: 'question-2',
    } as ChallengeSessionState;

    expect(() => advanceSession(outOfOrder, catalog)).toThrow(
      'Current question must match the first incomplete question',
    );
  });

  it.each([null, 'incorrect'] as const)(
    'does not advance when feedback is %s',
    (feedback) => {
      const state = {
        ...createChallengeSession(catalog),
        answerOctets: ['10', '0', '0', '99'] as const,
        feedback,
      };

      expect(advanceSession(state, catalog)).toEqual(state);
    },
  );

  it('advances after a correct answer and clears answer and feedback', () => {
    const answered = submitCurrentAnswer(
      {
        ...createChallengeSession(catalog),
        answerOctets: ['10', '0', '0', '1'],
      },
      catalog,
    );

    const advanced = advanceSession(answered, catalog);

    expect(advanced).toEqual({
      ...expectedIdentityFields(catalog, 1),
      currentOrdinal: 2,
      answerOctets: ['', '', '', ''],
      feedback: null,
      completedOrdinals: [1],
      curriculumComplete: false,
    });
    expect(answered.currentOrdinal).toBe(1);
    expect(answered.answerOctets).toEqual(['10', '0', '0', '1']);
    expect(answered.feedback).toBe('correct');
  });

  it('skips later questions that are already complete', () => {
    const answered = submitCurrentAnswer(
      {
        ...createChallengeSession(catalog, [2]),
        answerOctets: ['10', '0', '0', '1'],
      },
      catalog,
    );

    expect(advanceSession(answered, catalog).currentOrdinal).toBe(3);
  });

  it('marks the final question complete and never wraps', () => {
    const finalCatalog = [question(499), question(500, '10.0.0.255')] as const;
    const finalAnswer = submitCurrentAnswer(
      {
        ...createChallengeSession(finalCatalog, [499]),
        answerOctets: ['10', '0', '0', '255'],
      },
      finalCatalog,
    );

    expect(finalAnswer.curriculumComplete).toBe(true);
    expect(finalAnswer.completedOrdinals).toEqual([499, 500]);
    expect(advanceSession(finalAnswer, finalCatalog).currentOrdinal).toBe(500);
  });

  it('rejects a replacement catalog whose non-current mapping changed', () => {
    const state = createChallengeSession(catalog);
    const replacement = [
      catalog[0],
      { ...catalog[1], id: 'replacement-question-2' },
      catalog[2],
    ];

    expect(() => advanceSession(state, replacement)).toThrow(
      'Challenge session catalog identity does not match the active catalog',
    );
  });

  it('creates, resumes, and finishes against all 500 merged catalog entries', () => {
    const initial = createChallengeSession(subnetQuestionCatalog);
    const completed = subnetQuestionCatalog.slice(0, 499).map(({ ordinal }) => ordinal);
    const resumed = createChallengeSession(subnetQuestionCatalog, completed);
    const finalQuestion = subnetQuestionCatalog[499];
    const answered = submitCurrentAnswer(
      {
        ...resumed,
        answerOctets: finalQuestion.answer.split('.') as [string, string, string, string],
      },
      subnetQuestionCatalog,
    );

    expect(initial.currentOrdinal).toBe(1);
    expect(resumed.currentOrdinal).toBe(500);
    expect(answered.completedOrdinals).toHaveLength(500);
    expect(answered.curriculumComplete).toBe(true);
    expect(advanceSession(answered, subnetQuestionCatalog).currentOrdinal).toBe(500);
  });
});
