import { subnetFacts, type SubnetFacts } from '@/domain/subnet';

export type GuidedPracticeScaffold = 'full' | 'mask' | 'process' | 'independent';

export type GuidedPracticeScenario = {
  readonly id: string;
  readonly title: string;
  readonly address: string;
  readonly prefix: number;
  readonly scaffold: GuidedPracticeScaffold;
  readonly hintAfterAttempts: number;
  readonly processHint: string;
  readonly facts: Readonly<SubnetFacts>;
  readonly targetOctet: number;
  readonly boundaries: readonly number[];
};

export type PracticeFeedbackKind =
  | 'correct'
  | 'interface-address'
  | 'broadcast-address'
  | 'host-inside-subnet'
  | 'boundary-too-low'
  | 'boundary-too-high'
  | 'invalid-address'
  | 'unrelated-address';

export type PracticeFeedback = {
  readonly kind: PracticeFeedbackKind;
  readonly correct: boolean;
  readonly message: string;
};

type ScenarioDefinition = Omit<GuidedPracticeScenario, 'facts' | 'targetOctet' | 'boundaries'>;

const DEFINITIONS: readonly ScenarioDefinition[] = [
  {
    id: 'guided-boundary',
    title: 'Use the visible boundaries',
    address: '192.168.1.70',
    prefix: 26,
    scaffold: 'full',
    hintAfterAttempts: 0,
    processHint: 'Compare the target’s final octet with the listed boundaries, then choose the boundary immediately below it.',
  },
  {
    id: 'derive-block-size',
    title: 'Derive the block size',
    address: '10.0.0.200',
    prefix: 27,
    scaffold: 'mask',
    hintAfterAttempts: 0,
    processHint: 'Subtract the changing mask octet from 256, then count by that block size without passing the target.',
  },
  {
    id: 'method-transfer',
    title: 'Choose your method',
    address: '172.16.5.45',
    prefix: 28,
    scaffold: 'process',
    hintAfterAttempts: 1,
    processHint: 'Turn the prefix into a mask, subtract the changing mask octet from 256, and round the target down to a boundary.',
  },
  {
    id: 'independent-transfer',
    title: 'Solve it independently',
    address: '192.0.2.173',
    prefix: 29,
    scaffold: 'independent',
    hintAfterAttempts: 2,
    processHint: 'Find the mask and block size first. Then count valid boundaries until the next one would pass the target octet.',
  },
] as const;

function createScenario(definition: ScenarioDefinition): GuidedPracticeScenario {
  const facts = Object.freeze(subnetFacts(definition.address, definition.prefix));
  const targetOctet = Number(definition.address.split('.')[facts.interestingOctet - 1]);
  const boundaries = Object.freeze(
    Array.from({ length: 256 / facts.blockSize }, (_, index) => index * facts.blockSize),
  );
  return Object.freeze({ ...definition, facts, targetOctet, boundaries });
}

export function validateGuidedPracticeScenarios(
  scenarios: readonly GuidedPracticeScenario[],
): void {
  if (!Array.isArray(scenarios) || scenarios.length !== 4) {
    throw new Error('Guided practice requires four scenarios');
  }

  const ids = new Set(scenarios.map(({ id }) => id));
  const targets = new Set(scenarios.map(({ address, prefix }) => `${address}/${prefix}`));
  if (ids.size !== scenarios.length || targets.size !== scenarios.length) {
    throw new Error('Guided practice scenario ids and targets must be unique');
  }

  for (const scenario of scenarios) {
    const expected = subnetFacts(scenario.address, scenario.prefix);
    if (JSON.stringify(expected) !== JSON.stringify(scenario.facts)) {
      throw new Error('Guided practice facts must match the subnet engine');
    }
    if (expected.interestingOctet !== 4) {
      throw new Error('Guided practice supports fourth-octet boundaries only');
    }
  }
}

export const GUIDED_PRACTICE_SCENARIOS = Object.freeze(DEFINITIONS.map(createScenario));
validateGuidedPracticeScenarios(GUIDED_PRACTICE_SCENARIOS);

function splitAddress(address: string): number[] | null {
  const octets = address.split('.');
  if (
    octets.length !== 4
    || octets.some((octet) => !/^\d{1,3}$/.test(octet) || Number(octet) > 255)
  ) {
    return null;
  }
  return octets.map(Number);
}

export function classifyPracticeAnswer(
  scenario: GuidedPracticeScenario,
  answer: string,
): PracticeFeedback {
  const answerOctets = splitAddress(answer);
  if (answerOctets === null) {
    return {
      kind: 'invalid-address',
      correct: false,
      message: 'Enter four decimal octets, each from 0 through 255.',
    };
  }

  const normalizedAnswer = answerOctets.join('.');
  if (normalizedAnswer === scenario.facts.network) {
    return {
      kind: 'correct',
      correct: true,
      message: 'Correct. You found the first address in the containing subnet.',
    };
  }
  if (normalizedAnswer === scenario.address) {
    return {
      kind: 'interface-address',
      correct: false,
      message: 'That is the device interface address. The network is the boundary at the start of its block.',
    };
  }
  if (normalizedAnswer === scenario.facts.broadcast) {
    return {
      kind: 'broadcast-address',
      correct: false,
      message: 'That is the broadcast address at the end of the block. The network is the first boundary.',
    };
  }

  const answerFacts = subnetFacts(normalizedAnswer, scenario.prefix);
  if (answerFacts.network === scenario.facts.network) {
    return {
      kind: 'host-inside-subnet',
      correct: false,
      message: 'That address is inside the correct subnet, but it is not the first address. Set the host part to zero.',
    };
  }

  const targetOctets = scenario.address.split('.').map(Number);
  const sameLeadingOctets = answerOctets.slice(0, 3).every((octet, index) => octet === targetOctets[index]);
  const answerBoundary = answerOctets[3];
  if (sameLeadingOctets && answerBoundary % scenario.facts.blockSize === 0) {
    if (answerBoundary < scenario.targetOctet) {
      return {
        kind: 'boundary-too-low',
        correct: false,
        message: 'That is a valid boundary, but it is below the target’s containing block. Keep counting forward by the block size until the next boundary would pass the target.',
      };
    }
    return {
      kind: 'boundary-too-high',
      correct: false,
      message: 'That boundary is above the target. Use the nearest boundary without passing the target octet.',
    };
  }

  return {
    kind: 'unrelated-address',
    correct: false,
    message: 'Recheck the unchanged octets, then round only the changing octet down to its block boundary.',
  };
}
