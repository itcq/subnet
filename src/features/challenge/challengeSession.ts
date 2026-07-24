import type { SubnetQuestion } from '@/domain/questions/types';

export type ChallengeSessionState = {
  readonly catalogVersion: string;
  readonly catalogIdentity: string;
  readonly currentQuestionId: string;
  readonly currentOrdinal: number;
  readonly answerOctets: readonly [string, string, string, string];
  readonly feedback: null | 'correct' | 'incorrect';
  readonly completedOrdinals: readonly number[];
  readonly curriculumComplete: boolean;
};

type CatalogIdentityEntry = readonly [number, string, string];

type CatalogMetadata = {
  readonly version: string;
  readonly identity: string;
  readonly entries: readonly CatalogIdentityEntry[];
  readonly ordinalSet: ReadonlySet<number>;
  readonly idByOrdinal: ReadonlyMap<number, string>;
  readonly indexByOrdinal: ReadonlyMap<number, number>;
};

const EMPTY_ANSWER = Object.freeze(['', '', '', '']) as readonly [
  string,
  string,
  string,
  string,
];

function freezeState(state: ChallengeSessionState): ChallengeSessionState {
  return Object.freeze({
    ...state,
    answerOctets: Object.freeze([...state.answerOctets]) as readonly [
      string,
      string,
      string,
      string,
    ],
    completedOrdinals: Object.freeze([...state.completedOrdinals]),
  });
}

function validateNonEmptyString(value: unknown, message: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(message);
  }
}

function buildMetadata(entries: readonly CatalogIdentityEntry[], identity: string): CatalogMetadata {
  const ordinalSet = new Set<number>();
  const seenIds = new Set<string>();
  const idByOrdinal = new Map<number, string>();
  const indexByOrdinal = new Map<number, number>();
  let version: string | undefined;

  entries.forEach(([ordinal, id, catalogVersion], index) => {
    if (!Number.isSafeInteger(ordinal) || ordinal < 1) {
      throw new RangeError('Challenge catalog ordinals must be safe positive integers');
    }
    if (ordinalSet.has(ordinal)) {
      throw new Error(`Challenge catalog contains duplicate ordinal ${ordinal}`);
    }
    validateNonEmptyString(id, 'Challenge question ids must be non-empty strings');
    if (seenIds.has(id)) {
      throw new Error(`Challenge catalog contains duplicate question id ${id}`);
    }
    validateNonEmptyString(
      catalogVersion,
      'Challenge catalogVersion must be a non-empty string',
    );
    if (version !== undefined && catalogVersion !== version) {
      throw new Error('Challenge catalog must use one shared catalogVersion');
    }
    if (index > 0 && ordinal !== entries[index - 1][0] + 1) {
      throw new Error('Challenge catalog ordinals must be sorted and contiguous');
    }

    version = catalogVersion;
    ordinalSet.add(ordinal);
    seenIds.add(id);
    idByOrdinal.set(ordinal, id);
    indexByOrdinal.set(ordinal, index);
  });

  if (version === undefined) {
    throw new Error('Challenge catalog must not be empty');
  }

  return { version, identity, entries, ordinalSet, idByOrdinal, indexByOrdinal };
}

function validateCatalog(questions: readonly SubnetQuestion[]): CatalogMetadata {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Challenge catalog must not be empty');
  }

  const entries = questions.map(
    ({ ordinal, id, catalogVersion }) =>
      [ordinal, id, catalogVersion] as const,
  );
  return buildMetadata(entries, JSON.stringify(questions));
}

function metadataFromIdentity(identity: unknown): CatalogMetadata {
  validateNonEmptyString(identity, 'Challenge session catalog identity is invalid');

  let parsed: unknown;
  try {
    parsed = JSON.parse(identity);
  } catch {
    throw new TypeError('Challenge session catalog identity is invalid');
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new TypeError('Challenge session catalog identity is invalid');
  }

  if (JSON.stringify(parsed) !== identity) {
    throw new TypeError('Challenge session catalog identity is invalid');
  }

  const entries: CatalogIdentityEntry[] = parsed.map((entry) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new TypeError('Challenge session catalog identity is invalid');
    }
    const record = entry as Record<string, unknown>;
    if (
      typeof record.ordinal !== 'number' ||
      typeof record.id !== 'string' ||
      typeof record.catalogVersion !== 'string'
    ) {
      throw new TypeError('Challenge session catalog identity is invalid');
    }
    return [record.ordinal, record.id, record.catalogVersion] as const;
  });

  try {
    return buildMetadata(entries, identity);
  } catch {
    throw new TypeError('Challenge session catalog identity is invalid');
  }
}

function validateCompletedOrdinals(
  completedOrdinals: unknown,
  metadata: CatalogMetadata,
  allowDuplicates: boolean,
): Set<number> {
  if (!Array.isArray(completedOrdinals)) {
    throw new TypeError('Challenge session completed ordinals must be an array');
  }

  const completedSet = new Set<number>();
  for (const ordinal of completedOrdinals) {
    if (!Number.isSafeInteger(ordinal) || ordinal < 1) {
      throw new RangeError(
        'Challenge session completed ordinals must be safe positive integers',
      );
    }
    if (!metadata.ordinalSet.has(ordinal)) {
      throw new Error(
        `Completed ordinal ${ordinal} is not present in the active challenge catalog`,
      );
    }
    if (!allowDuplicates && completedSet.has(ordinal)) {
      throw new Error('Challenge session completed ordinals must be unique');
    }
    completedSet.add(ordinal);
  }
  return completedSet;
}

function validateState(
  state: ChallengeSessionState,
  suppliedMetadata?: CatalogMetadata,
): { metadata: CatalogMetadata; completedSet: Set<number> } {
  if (state === null || typeof state !== 'object') {
    throw new TypeError('Challenge session state must be an object');
  }

  const embeddedMetadata = metadataFromIdentity(state.catalogIdentity);
  if (suppliedMetadata && state.catalogIdentity !== suppliedMetadata.identity) {
    throw new Error('Challenge session catalog identity does not match the active catalog');
  }
  const metadata = suppliedMetadata ?? embeddedMetadata;

  validateNonEmptyString(
    state.catalogVersion,
    'Challenge session catalogVersion must be a non-empty string',
  );
  if (
    state.catalogVersion !== metadata.version ||
    embeddedMetadata.version !== metadata.version
  ) {
    throw new Error('Challenge session catalogVersion does not match its catalog identity');
  }

  if (
    !Array.isArray(state.answerOctets) ||
    state.answerOctets.length !== 4 ||
    !state.answerOctets.every((octet) => typeof octet === 'string')
  ) {
    throw new TypeError('Challenge session answerOctets must contain exactly four strings');
  }
  if (state.feedback !== null && state.feedback !== 'correct' && state.feedback !== 'incorrect') {
    throw new TypeError('Challenge session feedback is invalid');
  }
  if (!Number.isSafeInteger(state.currentOrdinal) || state.currentOrdinal < 1) {
    throw new RangeError('Challenge session current ordinal must be a safe positive integer');
  }
  if (!metadata.ordinalSet.has(state.currentOrdinal)) {
    throw new Error(
      `Current ordinal ${state.currentOrdinal} is not present in the active challenge catalog`,
    );
  }
  validateNonEmptyString(
    state.currentQuestionId,
    'Challenge session current question id must be a non-empty string',
  );
  if (metadata.idByOrdinal.get(state.currentOrdinal) !== state.currentQuestionId) {
    throw new Error('Challenge session current question identity does not match its ordinal');
  }

  const completedSet = validateCompletedOrdinals(
    state.completedOrdinals,
    metadata,
    false,
  );
  if (typeof state.curriculumComplete !== 'boolean') {
    throw new TypeError('Challenge session curriculumComplete must be a boolean');
  }
  if (state.curriculumComplete !== (completedSet.size === metadata.entries.length)) {
    throw new Error('Challenge session curriculumComplete does not match catalog coverage');
  }

  if (state.feedback === 'correct' && !completedSet.has(state.currentOrdinal)) {
    throw new Error('Correct feedback requires the current question to be complete');
  }

  if (state.curriculumComplete) {
    const finalOrdinal = metadata.entries[metadata.entries.length - 1][0];
    if (state.currentOrdinal !== finalOrdinal) {
      throw new Error('A completed curriculum must remain on the final question');
    }
  } else {
    const progressBeforeCurrent = new Set(completedSet);
    if (state.feedback === 'correct') {
      progressBeforeCurrent.delete(state.currentOrdinal);
    }
    const firstIncomplete = metadata.entries.find(
      ([ordinal]) => !progressBeforeCurrent.has(ordinal),
    );
    if (firstIncomplete?.[0] !== state.currentOrdinal) {
      throw new Error('Current question must match the first incomplete question');
    }
  }

  return { metadata, completedSet };
}

export function createChallengeSession(
  questions: readonly SubnetQuestion[],
  completedOrdinals: readonly number[] = [],
): ChallengeSessionState {
  const metadata = validateCatalog(questions);
  const completedSet = validateCompletedOrdinals(completedOrdinals, metadata, true);
  const uniqueCompletedOrdinals = [...completedSet].sort((left, right) => left - right);
  const firstIncomplete = questions.find(({ ordinal }) => !completedSet.has(ordinal));
  const currentQuestion = firstIncomplete ?? questions[questions.length - 1];

  return freezeState({
    catalogVersion: metadata.version,
    catalogIdentity: metadata.identity,
    currentQuestionId: currentQuestion.id,
    currentOrdinal: currentQuestion.ordinal,
    answerOctets: EMPTY_ANSWER,
    feedback: null,
    completedOrdinals: uniqueCompletedOrdinals,
    curriculumComplete: firstIncomplete === undefined,
  });
}

export function updateAnswerOctet(
  state: ChallengeSessionState,
  index: number,
  value: string,
): ChallengeSessionState {
  validateState(state);
  if (!Number.isInteger(index) || index < 0 || index >= EMPTY_ANSWER.length) {
    throw new RangeError(`Answer octet index must be between 0 and 3; received ${index}`);
  }
  if (state.feedback === 'correct') {
    return freezeState(state);
  }

  const digits = value.replace(/\D/g, '');
  const sanitized = digits === '' ? '' : String(Math.min(255, Number(digits)));
  const answerOctets = [...state.answerOctets] as [string, string, string, string];
  answerOctets[index] = sanitized;

  return freezeState({
    ...state,
    answerOctets,
    feedback: null,
  });
}

export function submitCurrentAnswer(
  state: ChallengeSessionState,
  questions: readonly SubnetQuestion[],
): ChallengeSessionState {
  const metadata = validateCatalog(questions);
  const { completedSet } = validateState(state, metadata);
  const currentQuestion = questions[metadata.indexByOrdinal.get(state.currentOrdinal)!];
  const correct = state.answerOctets.join('.') === currentQuestion.answer;

  if (correct) {
    completedSet.add(state.currentOrdinal);
  }
  const completedOrdinals = [...completedSet].sort((left, right) => left - right);

  return freezeState({
    ...state,
    feedback: correct ? 'correct' : 'incorrect',
    completedOrdinals,
    curriculumComplete: completedSet.size === questions.length,
  });
}

export function advanceSession(
  state: ChallengeSessionState,
  questions: readonly SubnetQuestion[],
): ChallengeSessionState {
  const metadata = validateCatalog(questions);
  const { completedSet } = validateState(state, metadata);
  const currentIndex = metadata.indexByOrdinal.get(state.currentOrdinal)!;

  if (state.feedback !== 'correct' || currentIndex === questions.length - 1) {
    return freezeState(state);
  }

  const nextQuestion = questions
    .slice(currentIndex + 1)
    .find(({ ordinal }) => !completedSet.has(ordinal));

  if (nextQuestion === undefined) {
    return freezeState(state);
  }

  return freezeState({
    ...state,
    currentQuestionId: nextQuestion.id,
    currentOrdinal: nextQuestion.ordinal,
    answerOctets: EMPTY_ANSWER,
    feedback: null,
  });
}
