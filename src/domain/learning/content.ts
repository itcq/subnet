import type {
  LearningCatalog,
  LearningMethod,
  LearningModule,
  LearningResource,
  WorkedSubnetExample,
} from './types';

export const EXTERNAL_RESOURCE_DISCLAIMER =
  'External resources are provided for learning variety. Their inclusion does not imply partnership, affiliation, or endorsement.';

function freezeMethod(method: LearningMethod): LearningMethod {
  return Object.freeze({ ...method, steps: Object.freeze([...method.steps]) });
}

function freezeExample(example: WorkedSubnetExample): WorkedSubnetExample {
  return Object.freeze({ ...example, steps: Object.freeze([...example.steps]) });
}

function freezeResource(resource: LearningResource): LearningResource {
  return Object.freeze({ ...resource });
}

function freezeModule(module: LearningModule): LearningModule {
  return Object.freeze({
    ...module,
    path: Object.freeze(module.path.map((step) => Object.freeze({ ...step }))),
    introduction: Object.freeze([...module.introduction]),
    methods: Object.freeze(module.methods.map(freezeMethod)),
    workedExamples: Object.freeze(module.workedExamples.map(freezeExample)),
    practice: Object.freeze({ ...module.practice }),
    resources: Object.freeze(module.resources.map(freezeResource)),
  });
}

const modules: readonly LearningModule[] = [
  {
    id: 'find-network-address',
    title: 'Find the Network Address',
    purpose:
      'Subnetting splits one network into smaller address groups so devices and traffic are easier to organize.',
    path: [
      { id: 'why-subnetting', title: 'Why subnetting exists', summary: 'See why one address belongs to a larger network group.' },
      { id: 'guided-lesson', title: 'Guided whiteboard lesson', summary: 'Build one /26 subnet from address to range.' },
      { id: 'solving-methods', title: 'Two reliable methods', summary: 'Connect binary boundaries with the block-size shortcut.' },
      { id: 'worked-examples', title: 'Worked examples', summary: 'Compare /24, /27, and /26 networks.' },
      { id: 'practice', title: 'Practice without pressure', summary: 'Try as often as you like without a score.' },
      { id: 'resources', title: 'External resources', summary: 'Choose another teaching style if it helps.' },
    ],
    objective: 'Use a prefix length to find the first address in the subnet containing a target IP.',
    introduction: [
      'A subnet is a block of consecutive IP addresses. The network address is the first address in that block.',
      'The prefix length tells you which bits identify the network. Host bits become zero when you calculate the network address.',
      'There is more than one reliable way to solve the same problem. Try both methods and keep the one that makes the boundary easiest to see.',
    ],
    methods: [
      {
        id: 'block-size',
        name: 'Block-size method',
        summary: 'Find the changing octet, calculate its block size, and round the target down to the nearest boundary.',
        connection: 'Block size is the decimal width of the same host-bit patterns that binary shows.',
        steps: [
          'Convert the prefix to a subnet mask and identify the first mask octet that is not 255.',
          'Subtract that mask octet from 256 to get the block size.',
          'List or calculate the multiples of the block size that surround the target octet.',
          'Use the lower boundary and set every host octet after it to zero.',
        ],
      },
      {
        id: 'binary-boundary',
        name: 'Binary-boundary method',
        summary: 'Keep the network bits from the target IP and replace every host bit with zero.',
        connection: 'Binary shows the boundary directly; that boundary creates the block size used by the shortcut.',
        steps: [
          'Write the relevant address octet in eight-bit binary.',
          'Mark the network-bit boundary indicated by the prefix length.',
          'Keep the network bits exactly as they appear in the target address.',
          'Change all host bits to zero and convert the result back to decimal.',
        ],
      },
    ],
    workedExamples: [
      {
        id: 'example-24',
        title: 'A familiar /24 boundary',
        ip: '192.168.10.77',
        prefix: 24,
        answer: '192.168.10.0',
        context: 'A small office uses one familiar /24 network for its devices.',
        whatChanges: 'With /24, all eight bits in the final octet are host bits.',
        whatStaysSame: 'Keep the prefix bits and set every host bit to zero to find the network.',
        steps: [
          'A /24 mask is 255.255.255.0, so the first three octets identify the network.',
          'The final octet contains only host bits.',
          'Set the final octet to zero: 192.168.10.0.',
        ],
      },
      {
        id: 'example-27',
        title: 'Use a block size of 32',
        ip: '10.20.35.200',
        prefix: 27,
        answer: '10.20.35.192',
        context: 'A team needs a smaller address group inside an existing private network.',
        whatChanges: 'With /27, only five host bits remain, so each block contains 32 addresses.',
        whatStaysSame: 'Keep the prefix bits and set every host bit to zero to find the network.',
        steps: [
          'A /27 mask ends in 224, so the block size is 256 − 224 = 32.',
          'The surrounding boundaries are 192 and 224; 200 falls between them.',
          'Use the lower boundary: 10.20.35.192.',
        ],
      },
      {
        id: 'example-26',
        title: 'Use a block size of 64',
        ip: '172.16.5.130',
        prefix: 26,
        answer: '172.16.5.128',
        context: 'A device address must be placed in the correct one of four /26 groups.',
        whatChanges: 'With /26, six host bits remain, so each block contains 64 addresses.',
        whatStaysSame: 'Keep the prefix bits and set every host bit to zero to find the network.',
        steps: [
          'A /26 mask ends in 192, so the block size is 256 − 192 = 64.',
          'The boundaries are 0, 64, 128, and 192; 130 is inside the 128–191 block.',
          'Use the lower boundary: 172.16.5.128.',
        ],
      },
    ],
    practice: {
      title: 'Practice without pressure',
      description: 'Try related examples with unlimited retries. Learning practice does not affect Journey progress, scores, ranks, or badges.',
    },
    resources: [
      {
        id: 'networkchuck-ip-addresses',
        title: 'what is an IP Address? // You SUCK at Subnetting // EP 1',
        creator: 'NetworkChuck',
        url: 'https://www.youtube.com/watch?v=5WfiTHiU4x8',
        focus: 'A visual, beginner-friendly introduction to IP addresses and the subnetting problem.',
        whyUseful: 'Useful for learners who benefit from energetic explanations, analogies, and a course-style starting point.',
        sourceCheckedAt: '2026-07-25',
      },
      {
        id: 'heath-adams-subnetting',
        title: 'Subnetting Made Easy',
        creator: 'The Cyber Mentors',
        url: 'https://www.youtube.com/watch?v=Bvx-hDHkIBk',
        focus: 'Heath Adams demonstrates a concise, practical way to work through subnetting calculations.',
        whyUseful: 'Useful for learners who prefer a direct worked process and a repeatable written shortcut.',
        sourceCheckedAt: '2026-07-25',
      },
      {
        id: 'jeremy-cioara-subnet-design',
        title: 'DESIGNING Subnets for Your Company!',
        creator: 'Jeremy Cioara',
        url: 'https://www.youtube.com/watch?v=1Qat0aLn4iY',
        focus: 'Jeremy Cioara connects subnet planning, VLANs, summarization, and practical address organization.',
        whyUseful: 'Useful for learners who understand concepts better when calculations connect to real network-design decisions.',
        sourceCheckedAt: '2026-07-25',
      },
      {
        id: 'practical-networking-subnetting',
        title: 'What is Subnetting? - Subnetting Mastery - Part 1 of 7',
        creator: 'Practical Networking',
        url: 'https://www.youtube.com/watch?v=BWZ-MHIhqjM',
        focus: 'A structured explanation of the attributes commonly solved in subnetting problems.',
        whyUseful: 'Useful for learners who prefer a systematic series with diagrams, repeatable rules, and follow-up practice.',
        sourceCheckedAt: '2026-07-25',
      },
    ],
  },
];

export const LEARNING_CATALOG: LearningCatalog = Object.freeze({
  version: 'subnet-learning-v2',
  modules: Object.freeze(modules.map(freezeModule)),
});

function validateId(id: unknown, ids: Set<string>): void {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new TypeError('Learning content ids must be non-empty strings');
  }
  if (ids.has(id)) {
    throw new Error('Learning content ids must be unique');
  }
  ids.add(id);
}

function validateInstructionalText(...values: unknown[]): void {
  if (values.some((value) => typeof value !== 'string' || value.trim().length === 0)) {
    throw new TypeError('Required learning instructional fields must be non-empty strings');
  }
}

export function validateLearningCatalog(catalog: LearningCatalog): void {
  if (typeof catalog.version !== 'string' || catalog.version.trim().length === 0) {
    throw new TypeError('Learning catalog version must be a non-empty string');
  }
  if (!Array.isArray(catalog.modules) || catalog.modules.length === 0) {
    throw new Error('Learning catalog must include at least one module');
  }

  const ids = new Set<string>();
  for (const module of catalog.modules) {
    validateId(module.id, ids);
    if (
      !Array.isArray(module.path) || module.path.length === 0
      || !Array.isArray(module.introduction) || module.introduction.length === 0
      || !Array.isArray(module.methods) || module.methods.length === 0
      || !Array.isArray(module.workedExamples) || module.workedExamples.length === 0
      || !Array.isArray(module.resources) || module.resources.length === 0
      || module.methods.some((method: LearningMethod) => !Array.isArray(method.steps) || method.steps.length === 0)
      || module.workedExamples.some((example: WorkedSubnetExample) => !Array.isArray(example.steps) || example.steps.length === 0)
    ) {
      throw new Error('Required learning instructional collections must not be empty');
    }
    validateInstructionalText(
      module.title,
      module.purpose,
      module.objective,
      ...module.introduction,
      module.practice.title,
      module.practice.description,
    );
    for (const pathStep of module.path) {
      validateId(pathStep.id, ids);
      validateInstructionalText(pathStep.title, pathStep.summary);
    }
    if (module.methods.length < 2 || module.workedExamples.length === 0) {
      throw new Error('Learning modules require multiple methods and worked examples');
    }
    for (const method of module.methods) {
      validateId(method.id, ids);
      validateInstructionalText(method.name, method.summary, method.connection, ...method.steps);
    }
    for (const example of module.workedExamples) {
      validateId(example.id, ids);
      validateInstructionalText(
        example.title,
        example.ip,
        example.answer,
        example.context,
        example.whatChanges,
        example.whatStaysSame,
        ...example.steps,
      );
    }
    for (const resource of module.resources) {
      validateId(resource.id, ids);
      validateInstructionalText(
        resource.title,
        resource.creator,
        resource.focus,
        resource.whyUseful,
        resource.sourceCheckedAt,
      );
      if (!/^https:\/\//.test(resource.url)) {
        throw new Error('Learning resource URLs must use HTTPS');
      }
    }
  }
}

validateLearningCatalog(LEARNING_CATALOG);
