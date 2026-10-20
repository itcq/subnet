import { CATALOG_VERSION } from '@/domain/questions/catalog';
import { JOURNEY_PROGRESS_VERSION } from '../version';

describe('journey progress version', () => {
  it('keeps existing learner progress while question content receives a new catalog version', () => {
    expect(JOURNEY_PROGRESS_VERSION).toBe('17dd300a');
    expect(CATALOG_VERSION).not.toBe(JOURNEY_PROGRESS_VERSION);
  });
});
