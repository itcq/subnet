import { subnetFacts } from '@/domain/subnet';

import {
  EXTERNAL_RESOURCE_DISCLAIMER,
  LEARNING_CATALOG,
  validateLearningCatalog,
} from '../content';

describe('learning content catalog', () => {
  it('ships a stable optional first module with multiple teaching methods', () => {
    expect(LEARNING_CATALOG.version).toBe('subnet-learning-v1');
    expect(LEARNING_CATALOG.modules).toHaveLength(1);

    const module = LEARNING_CATALOG.modules[0];
    expect(module.id).toBe('find-network-address');
    expect(module.title).toBe('Find the Network Address');
    expect(module.methods.map(({ id }) => id)).toEqual(['block-size', 'binary-boundary']);
    expect(module.workedExamples).toHaveLength(3);
    expect(module.practice.description).toContain('does not affect Journey progress');
    expect(module).not.toHaveProperty('required');
    expect(module).not.toHaveProperty('prerequisite');
    expect(module).not.toHaveProperty('unlocks');
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
