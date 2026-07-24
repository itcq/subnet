import { subnetFacts } from '@/domain/subnet';

import { getTierConfig } from './tierConfig';
import type { SubnetQuestion } from './types';

function isPrivateIPv4(address: string): boolean {
  const [first, second] = address.split('.').map(Number);
  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

export function validateCatalog(
  questions: readonly SubnetQuestion[],
): { valid: true } {
  if (questions.length !== 500) {
    throw new Error(`Catalog must contain exactly 500 questions; received ${questions.length}`);
  }

  const ids = new Set<string>();
  const signatures = new Set<string>();
  const hardestPrefixes = new Set<number>();

  questions.forEach((question, index) => {
    const expectedOrdinal = index + 1;
    if (question.ordinal !== expectedOrdinal) {
      throw new Error(`Expected question ordinal ${expectedOrdinal}; received ${question.ordinal}`);
    }

    const config = getTierConfig(question.ordinal);
    const expectedId = `${config.tier}-${String(question.ordinal).padStart(3, '0')}`;
    if (question.id !== expectedId) {
      throw new Error(`Invalid question ID for ordinal ${question.ordinal}`);
    }
    if (ids.has(question.id)) {
      throw new Error(`Duplicate question ID: ${question.id}`);
    }
    ids.add(question.id);

    const signature = `${question.ip}/${question.prefix}`;
    if (signatures.has(signature)) {
      throw new Error(`Duplicate question signature: ${signature}`);
    }
    signatures.add(signature);

    if (question.catalogVersion !== 'ipv4-network-v1') {
      throw new Error(`Invalid catalog version for question ${question.id}`);
    }
    if (question.tier !== config.tier || !config.prefixes.includes(question.prefix)) {
      throw new Error(`Question ${question.id} does not satisfy its tier configuration`);
    }
    if (question.tier === 'hardest') {
      hardestPrefixes.add(question.prefix);
    }
    if (question.type !== 'network-address') {
      throw new Error(`Unsupported question type for question ${question.id}`);
    }
    if (!isPrivateIPv4(question.ip)) {
      throw new Error(`Question ${question.id} must use a private IPv4 address`);
    }
    if (
      question.hints.showMaskBeforeAnswer !== config.showMaskBeforeAnswer ||
      question.hints.showBlockSizeBeforeAnswer !== config.showBlockSizeBeforeAnswer
    ) {
      throw new Error(`Invalid hint policy for question ${question.id}`);
    }

    const facts = subnetFacts(question.ip, question.prefix);
    if (
      question.tier === 'hard' &&
      (question.ip === facts.network || question.ip === facts.broadcast)
    ) {
      throw new Error(
        `Hard question ${question.id} must not target the subnet network or broadcast address`,
      );
    }

    const expectedAnswer = facts.network;
    if (question.answer !== expectedAnswer) {
      throw new Error(`Incorrect answer for question ${question.id}`);
    }
  });

  for (const requiredPrefix of [31, 32]) {
    if (!hardestPrefixes.has(requiredPrefix)) {
      throw new Error(`Catalog must include a hardest-tier /${requiredPrefix} question`);
    }
  }

  return { valid: true };
}
