import { subnetFacts } from '@/domain/subnet';

import {
  classifyPracticeAnswer,
  GUIDED_PRACTICE_SCENARIOS,
  validateGuidedPracticeScenarios,
  type GuidedPracticeScenario,
} from '../guidedPracticeModel';

const EXPECTED_CASES = [
  ['guided-boundary', '192.168.1.70', 26, '192.168.1.64', 'full', 0],
  ['derive-block-size', '10.0.0.200', 27, '10.0.0.192', 'mask', 0],
  ['method-transfer', '172.16.5.45', 28, '172.16.5.32', 'process', 1],
  ['independent-transfer', '192.0.2.173', 29, '192.0.2.168', 'independent', 2],
] as const;

describe('guided practice model', () => {
  it('defines exactly four immutable transfer scenarios in the approved order', () => {
    expect(GUIDED_PRACTICE_SCENARIOS).toHaveLength(4);
    expect(Object.isFrozen(GUIDED_PRACTICE_SCENARIOS)).toBe(true);

    EXPECTED_CASES.forEach(([id, address, prefix, network, scaffold, hintAfterAttempts], index) => {
      const scenario = GUIDED_PRACTICE_SCENARIOS[index];
      expect(scenario).toMatchObject({
        id,
        address,
        prefix,
        scaffold,
        hintAfterAttempts,
        facts: { network },
      });
      expect(Object.isFrozen(scenario)).toBe(true);
      expect(Object.isFrozen(scenario.facts)).toBe(true);
      expect(Object.isFrozen(scenario.boundaries)).toBe(true);
    });
  });

  it('derives every authoritative value from the canonical subnet engine', () => {
    for (const scenario of GUIDED_PRACTICE_SCENARIOS) {
      const facts = subnetFacts(scenario.address, scenario.prefix);
      expect(scenario.facts).toEqual(facts);
      expect(scenario.targetOctet).toBe(Number(scenario.address.split('.')[3]));
      expect(scenario.boundaries).toEqual(
        Array.from({ length: 256 / facts.blockSize }, (_, index) => index * facts.blockSize),
      );
      expect(scenario.boundaries).toContain(Number(facts.network.split('.')[3]));
    }
  });

  it('uses unique stable ids and targets', () => {
    expect(new Set(GUIDED_PRACTICE_SCENARIOS.map(({ id }) => id)).size).toBe(4);
    expect(
      new Set(GUIDED_PRACTICE_SCENARIOS.map(({ address, prefix }) => `${address}/${prefix}`)).size,
    ).toBe(4);
  });

  it('fails closed for an empty collection, duplicate ids, and engine-inconsistent facts', () => {
    const first = GUIDED_PRACTICE_SCENARIOS[0];
    expect(() => validateGuidedPracticeScenarios([])).toThrow('Guided practice requires four scenarios');
    expect(() => validateGuidedPracticeScenarios([first, first, first, first])).toThrow(
      'Guided practice scenario ids and targets must be unique',
    );
    const inconsistent = {
      ...first,
      facts: { ...first.facts, network: '192.168.1.0' },
    } as GuidedPracticeScenario;
    expect(() =>
      validateGuidedPracticeScenarios([
        inconsistent,
        ...GUIDED_PRACTICE_SCENARIOS.slice(1),
      ]),
    ).toThrow('Guided practice facts must match the subnet engine');
  });

  it.each([
    ['correct', '192.168.1.64', true],
    ['interface-address', '192.168.1.70', false],
    ['broadcast-address', '192.168.1.127', false],
    ['host-inside-subnet', '192.168.1.65', false],
    ['boundary-too-low', '192.168.1.0', false],
    ['boundary-too-high', '192.168.1.128', false],
    ['invalid-address', '192.168.1.999', false],
    ['unrelated-address', '10.1.2.3', false],
  ] as const)('classifies %s feedback deterministically', (kind, answer, correct) => {
    const scenario = GUIDED_PRACTICE_SCENARIOS[0];
    const feedback = classifyPracticeAnswer(scenario, answer);
    expect(feedback.kind).toBe(kind);
    expect(feedback.correct).toBe(correct);
    if (!correct) {
      expect(feedback.message).not.toContain(scenario.facts.network);
    }
  });

  it('gives accurate process guidance for a boundary several blocks below the target', () => {
    const scenario = GUIDED_PRACTICE_SCENARIOS[3];
    const feedback = classifyPracticeAnswer(scenario, '192.0.2.0');

    expect(feedback).toMatchObject({
      kind: 'boundary-too-low',
      correct: false,
    });
    expect(feedback.message).toContain('until the next boundary would pass the target');
    expect(feedback.message).not.toContain('once more');
    expect(feedback.message).not.toContain(scenario.facts.network);
  });

  it('normalizes valid three-digit decimal octets before classification', () => {
    const scenario = GUIDED_PRACTICE_SCENARIOS[0];
    expect(classifyPracticeAnswer(scenario, '192.168.001.064')).toMatchObject({
      kind: 'correct',
      correct: true,
    });
    expect(classifyPracticeAnswer(scenario, '192.168.001.070')).toMatchObject({
      kind: 'interface-address',
      correct: false,
    });
  });

  it('does not reveal the solved network in any incorrect feedback path across all scenarios', () => {
    for (const scenario of GUIDED_PRACTICE_SCENARIOS) {
      const candidates = [
        scenario.address,
        scenario.facts.broadcast,
        scenario.facts.firstHost,
        '999.1.1.1',
        '1.2.3.4',
      ];
      for (const answer of candidates) {
        const feedback = classifyPracticeAnswer(scenario, answer);
        if (!feedback.correct) {
          expect(feedback.message).not.toContain(scenario.facts.network);
        }
      }
    }
  });
});
