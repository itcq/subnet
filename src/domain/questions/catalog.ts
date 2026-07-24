import { generateQuestion } from './generator';
import { createSeededRandom } from './seededRandom';
import { getTierConfig } from './tierConfig';
import type { SubnetQuestion } from './types';
import { validateCatalog } from './validateCatalog';

export const CATALOG_VERSION = 'ipv4-network-v1' as const;
export const CATALOG_SEED = 'ipv4-network-v1-release-1' as const;

const MAX_ATTEMPTS_PER_QUESTION = 1_000;

export function createQuestionCatalog(seed: string): readonly SubnetQuestion[] {
  const random = createSeededRandom(seed);
  const signatures = new Set<string>();
  const questions: SubnetQuestion[] = [];

  for (let ordinal = 1; ordinal <= 500; ordinal += 1) {
    const config = getTierConfig(ordinal);
    const prefix = config.prefixes[(ordinal - config.start) % config.prefixes.length];
    const questionConfig = { ...config, prefixes: [prefix] };
    let question: SubnetQuestion | undefined;

    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_QUESTION; attempt += 1) {
      const candidate = generateQuestion(ordinal, questionConfig, random);
      const signature = `${candidate.ip}/${candidate.prefix}`;

      if (!signatures.has(signature)) {
        question = candidate;
        signatures.add(signature);
        break;
      }
    }

    if (!question) {
      throw new Error(`Unable to generate a unique question for ordinal ${ordinal}`);
    }

    questions.push(question);
  }

  validateCatalog(questions);
  return Object.freeze(
    questions.map((question) =>
      Object.freeze({
        ...question,
        hints: Object.freeze({ ...question.hints }),
      }),
    ),
  );
}

export const subnetQuestionCatalog = createQuestionCatalog(CATALOG_SEED);
