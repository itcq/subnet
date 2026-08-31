import { createSupabaseProgressGateway } from '../supabaseProgressGateway';

describe('createSupabaseProgressGateway', () => {
  it('atomically synchronizes progress for the expected authenticated user', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        {
          catalog_version: '17dd300a',
          question_ordinal: 1,
          completed_at: '2026-01-01T00:00:00.000Z',
        },
        {
          catalog_version: '17dd300a',
          question_ordinal: 2,
          completed_at: '2026-01-02T00:00:00.000Z',
        },
      ],
      error: null,
    });
    const gateway = createSupabaseProgressGateway({ rpc });

    await expect(gateway.syncCompleted(
      'user-123',
      '17dd300a',
      [
        {
          catalogVersion: '17dd300a',
          ordinal: 1,
          completedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    )).resolves.toEqual([
      {
        catalogVersion: '17dd300a',
        ordinal: 1,
        completedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        catalogVersion: '17dd300a',
        ordinal: 2,
        completedAt: '2026-01-02T00:00:00.000Z',
      },
    ]);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('sync_account_progress', {
      expected_user_id: 'user-123',
      requested_catalog_version: '17dd300a',
      completion_rows: [
        {
          catalog_version: '17dd300a',
          question_ordinal: 1,
          completed_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
  });

  it('sanitizes database errors', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: new Error('permission denied for user-123'),
    });
    const gateway = createSupabaseProgressGateway({ rpc });

    await expect(gateway.syncCompleted('user-123', '17dd300a', [])).rejects.toThrow(
      'Synced progress request could not be completed. Please try again.',
    );
  });
});
