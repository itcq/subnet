import { subnetFacts } from '@/domain/subnet';

import {
  CATALOG_SEED,
  CATALOG_VERSION,
  createQuestionCatalog,
  subnetQuestionCatalog,
} from '../catalog';
import { getTierConfig } from '../tierConfig';
import { validateCatalog } from '../validateCatalog';
import type { SubnetQuestion } from '../types';

function catalogFingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

describe('subnet question catalog', () => {
  it('contains exactly 500 contiguous, correctly tiered questions', () => {
    expect(subnetQuestionCatalog).toHaveLength(500);
    expect(subnetQuestionCatalog.map(({ ordinal }) => ordinal)).toEqual(
      Array.from({ length: 500 }, (_, index) => index + 1),
    );
    expect(
      Object.fromEntries(
        ['easy', 'intermediate', 'hard', 'hardest'].map((tier) => [
          tier,
          subnetQuestionCatalog.filter((question) => question.tier === tier).length,
        ]),
      ),
    ).toEqual({ easy: 100, intermediate: 199, hard: 100, hardest: 101 });
  });

  it('uses unique IDs and unique IP/prefix signatures', () => {
    const ids = subnetQuestionCatalog.map(({ id }) => id);
    const signatures = subnetQuestionCatalog.map(({ ip, prefix }) => `${ip}/${prefix}`);

    expect(new Set(ids).size).toBe(500);
    expect(new Set(signatures).size).toBe(500);
  });

  it('derives every answer from the subnet engine and obeys tier prefixes', () => {
    for (const question of subnetQuestionCatalog) {
      expect(question.catalogVersion).toBe(CATALOG_VERSION);
      expect(question.answer).toBe(subnetFacts(question.ip, question.prefix).network);
      expect(getTierConfig(question.ordinal).prefixes).toContain(question.prefix);
    }
  });

  it('guarantees hardest-tier /31 and /32 coverage', () => {
    const hardest = subnetQuestionCatalog.filter(({ tier }) => tier === 'hardest');

    expect(hardest.some(({ prefix }) => prefix === 31)).toBe(true);
    expect(hardest.some(({ prefix }) => prefix === 32)).toBe(true);
  });

  it('freezes returned catalogs, questions, and nested hints', () => {
    const catalog = createQuestionCatalog('immutability');

    for (const value of [catalog, subnetQuestionCatalog]) {
      expect(Object.isFrozen(value)).toBe(true);
      expect(value.every((question) => Object.isFrozen(question))).toBe(true);
      expect(value.every((question) => Object.isFrozen(question.hints))).toBe(true);
    }

    const originalId = catalog[0].id;
    const originalHint = catalog[0].hints.showMaskBeforeAnswer;
    try {
      (catalog[0] as { id: string }).id = 'mutated';
      (catalog[0].hints as { showMaskBeforeAnswer: boolean }).showMaskBeforeAnswer = !originalHint;
    } catch {
      // Strict-mode runtimes throw; non-strict runtimes silently reject the write.
    }
    expect(catalog[0].id).toBe(originalId);
    expect(catalog[0].hints.showMaskBeforeAnswer).toBe(originalHint);
  });

  it('is reproducible for the release seed', () => {
    expect(createQuestionCatalog(CATALOG_SEED)).toEqual(subnetQuestionCatalog);
    expect(createQuestionCatalog('different-seed').map(({ ip }) => ip)).not.toEqual(
      subnetQuestionCatalog.map(({ ip }) => ip),
    );
  });

  it('matches the reviewed release-catalog signature', () => {
    const signatures = subnetQuestionCatalog
      .map(({ id, ip, prefix, answer }) => `${id}|${ip}/${prefix}|${answer}`)
      .join('\n');
    const digest = catalogFingerprint(signatures);

    expect(digest).toBe('17dd300a');
    expect(CATALOG_VERSION).toBe(digest);
  });

  it('passes complete catalog validation', () => {
    expect(validateCatalog(subnetQuestionCatalog)).toEqual({ valid: true });
  });

  it('rejects duplicate signatures', () => {
    const catalog = subnetQuestionCatalog.map((question) => ({ ...question }));
    catalog[1] = {
      ...catalog[1],
      ip: catalog[0].ip,
      prefix: catalog[0].prefix,
      answer: catalog[0].answer,
    };

    expect(() => validateCatalog(catalog)).toThrow('Duplicate question signature');
  });

  it('rejects an answer that does not match the subnet engine', () => {
    const catalog: SubnetQuestion[] = subnetQuestionCatalog.map((question) => ({ ...question }));
    catalog[0] = { ...catalog[0], answer: '255.255.255.255' };

    expect(() => validateCatalog(catalog)).toThrow('Incorrect answer for question easy-001');
  });

  it('rejects a question whose target IP is not private', () => {
    const catalog: SubnetQuestion[] = subnetQuestionCatalog.map((question) => ({ ...question }));
    catalog[0] = {
      ...catalog[0],
      ip: '8.8.8.8',
      answer: subnetFacts('8.8.8.8', catalog[0].prefix).network,
    };

    expect(() => validateCatalog(catalog)).toThrow('Question easy-001 must use a private IPv4 address');
  });

  it.each([31, 32])('rejects a catalog without hardest-tier /%s coverage', (missingPrefix) => {
    const catalog: SubnetQuestion[] = subnetQuestionCatalog.map((question) => {
      if (question.tier !== 'hardest' || question.prefix !== missingPrefix) {
        return { ...question };
      }

      const prefix = 30;
      return {
        ...question,
        prefix,
        answer: subnetFacts(question.ip, prefix).network,
      };
    });

    expect(() => validateCatalog(catalog)).toThrow(
      `Catalog must include a hardest-tier /${missingPrefix} question`,
    );
  });

  it.each(['10.0.0.0', '10.255.255.255'])(
    'rejects hard-tier subnet boundary target %s',
    (ip) => {
      const catalog: SubnetQuestion[] = subnetQuestionCatalog.map((question) => ({ ...question }));
      catalog[299] = {
        ...catalog[299],
        ip,
        prefix: 8,
        answer: subnetFacts(ip, 8).network,
      };

      expect(() => validateCatalog(catalog)).toThrow(
        'Hard question hard-300 must not target the subnet network or broadcast address',
      );
    },
  );
});
