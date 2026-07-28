import { subnetFacts } from '@/domain/subnet';

import {
  EXTERNAL_RESOURCE_DISCLAIMER,
  LEARNING_CATALOG,
  validateLearningCatalog,
} from '../content';

describe('learning content catalog', () => {
  it('ships a versioned beginner path that starts with why subnetting exists', () => {
    expect(LEARNING_CATALOG.version).toBe('subnet-learning-v2');
    expect(LEARNING_CATALOG.modules).toHaveLength(1);

    const module = LEARNING_CATALOG.modules[0];
    expect(module.id).toBe('find-network-address');
    expect(module.title).toBe('Find the Network Address');
    expect(module.purpose).toBe(
      'Subnetting splits one network into smaller address groups so devices and traffic are easier to organize.',
    );
    expect(module.path.map(({ id }) => id)).toEqual([
      'why-subnetting',
      'guided-lesson',
      'solving-methods',
      'worked-examples',
      'practice',
      'resources',
    ]);
    expect(module.path.every(({ title, summary }) => title.trim() && summary.trim())).toBe(true);
    expect(module.methods.map(({ id }) => id)).toEqual(['block-size', 'binary-boundary']);
    expect(module.workedExamples).toHaveLength(3);
    expect(module.practice.description).toContain('does not affect Journey progress');
    expect(module).not.toHaveProperty('required');
    expect(module).not.toHaveProperty('prerequisite');
    expect(module).not.toHaveProperty('unlocks');
  });

  it('connects each solving method to the same subnet boundary', () => {
    const methods = LEARNING_CATALOG.modules[0].methods;

    expect(methods.map(({ connection }) => connection)).toEqual([
      'Block size is the decimal width of the same host-bit patterns that binary shows.',
      'Binary shows the boundary directly; that boundary creates the block size used by the shortcut.',
    ]);
  });

  it('explains the context, change, and constant in every worked example', () => {
    const examples = LEARNING_CATALOG.modules[0].workedExamples;

    for (const example of examples) {
      expect(example.context.trim().length).toBeGreaterThan(10);
      expect(example.whatChanges.trim().length).toBeGreaterThan(10);
      expect(example.whatStaysSame.trim().length).toBeGreaterThan(10);
    }
    expect(examples.map(({ whatChanges }) => whatChanges)).toEqual([
      'With /24, all eight bits in the final octet are host bits.',
      'With /27, only five host bits remain, so each block contains 32 addresses.',
      'With /26, six host bits remain, so each block contains 64 addresses.',
    ]);
  });

  it('keeps every worked answer aligned with the subnet engine', () => {
    for (const example of LEARNING_CATALOG.modules[0].workedExamples) {
      expect(subnetFacts(example.ip, example.prefix).network).toBe(example.answer);
      expect(example.steps.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('includes verified, attributed resources across different teaching styles', () => {
    const resources = LEARNING_CATALOG.modules[0].resources;

    expect(resources.map(({ id }) => id)).toEqual([
      'networkchuck-ip-addresses',
      'heath-adams-subnetting',
      'jeremy-cioara-subnet-design',
      'practical-networking-subnetting',
    ]);
    expect(resources.map(({ creator }) => creator)).toEqual([
      'NetworkChuck',
      'The Cyber Mentors',
      'Jeremy Cioara',
      'Practical Networking',
    ]);
    for (const resource of resources) {
      expect(resource.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]+$/);
      expect(resource.sourceCheckedAt).toBe('2026-07-25');
      expect(resource.focus.length).toBeGreaterThan(10);
      expect(resource.whyUseful.length).toBeGreaterThan(10);
    }
    expect(EXTERNAL_RESOURCE_DISCLAIMER).toBe(
      'External resources are provided for learning variety. Their inclusion does not imply partnership, affiliation, or endorsement.',
    );
  });

  it('uses unique non-empty ids throughout the catalog', () => {
    expect(() => validateLearningCatalog(LEARNING_CATALOG)).not.toThrow();

    const module = LEARNING_CATALOG.modules[0];
    const ids = [
      module.id,
      ...module.methods.map(({ id }) => id),
      ...module.workedExamples.map(({ id }) => id),
      ...module.resources.map(({ id }) => id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.trim().length > 0)).toBe(true);
  });

  it('is deeply immutable for safe shared presentation', () => {
    const module = LEARNING_CATALOG.modules[0];

    expect(Object.isFrozen(LEARNING_CATALOG)).toBe(true);
    expect(Object.isFrozen(LEARNING_CATALOG.modules)).toBe(true);
    expect(Object.isFrozen(module)).toBe(true);
    expect(Object.isFrozen(module.methods)).toBe(true);
    expect(Object.isFrozen(module.methods[0].steps)).toBe(true);
    expect(Object.isFrozen(module.workedExamples)).toBe(true);
    expect(Object.isFrozen(module.workedExamples[0].steps)).toBe(true);
    expect(Object.isFrozen(module.resources)).toBe(true);
  });

  it('rejects blank required instructional fields', () => {
    const module = LEARNING_CATALOG.modules[0];
    const invalidCatalogs = [
      { ...LEARNING_CATALOG, modules: [{ ...module, purpose: '   ' }] },
      {
        ...LEARNING_CATALOG,
        modules: [{ ...module, path: [{ ...module.path[0], summary: '' }, ...module.path.slice(1)] }],
      },
      {
        ...LEARNING_CATALOG,
        modules: [{ ...module, methods: [{ ...module.methods[0], connection: '' }, module.methods[1]] }],
      },
      {
        ...LEARNING_CATALOG,
        modules: [
          {
            ...module,
            workedExamples: [
              { ...module.workedExamples[0], whatStaysSame: '' },
              ...module.workedExamples.slice(1),
            ],
          },
        ],
      },
    ];

    for (const catalog of invalidCatalogs) {
      expect(() => validateLearningCatalog(catalog)).toThrow(
        'Required learning instructional fields must be non-empty strings',
      );
    }
  });

  it('rejects empty required instructional collections', () => {
    const module = LEARNING_CATALOG.modules[0];
    const invalidCatalogs = [
      { ...LEARNING_CATALOG, modules: [{ ...module, path: [] }] },
      { ...LEARNING_CATALOG, modules: [{ ...module, introduction: [] }] },
      { ...LEARNING_CATALOG, modules: [{ ...module, methods: [] }] },
      { ...LEARNING_CATALOG, modules: [{ ...module, workedExamples: [] }] },
      { ...LEARNING_CATALOG, modules: [{ ...module, resources: [] }] },
      {
        ...LEARNING_CATALOG,
        modules: [{ ...module, resources: null as unknown as typeof module.resources }],
      },
      {
        ...LEARNING_CATALOG,
        modules: [{ ...module, methods: [{ ...module.methods[0], steps: [] }, module.methods[1]] }],
      },
      {
        ...LEARNING_CATALOG,
        modules: [
          {
            ...module,
            workedExamples: [{ ...module.workedExamples[0], steps: [] }, ...module.workedExamples.slice(1)],
          },
        ],
      },
    ];

    for (const catalog of invalidCatalogs) {
      expect(() => validateLearningCatalog(catalog)).toThrow(
        'Required learning instructional collections must not be empty',
      );
    }
  });

  it('rejects duplicate ids and malformed external resource URLs', () => {
    const module = LEARNING_CATALOG.modules[0];
    const duplicateMethod = {
      ...LEARNING_CATALOG,
      modules: [
        {
          ...module,
          methods: [module.methods[0], { ...module.methods[1], id: module.methods[0].id }],
        },
      ],
    };
    expect(() => validateLearningCatalog(duplicateMethod)).toThrow('Learning content ids must be unique');

    const insecureResource = {
      ...LEARNING_CATALOG,
      modules: [
        {
          ...module,
          resources: [{ ...module.resources[0], url: 'http://example.com' }],
        },
      ],
    };
    expect(() => validateLearningCatalog(insecureResource)).toThrow(
      'Learning resource URLs must use HTTPS',
    );
  });
});
