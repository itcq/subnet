import { downloadAccountDataExport } from '../downloadAccountDataExport';

describe('downloadAccountDataExport', () => {
  it('downloads formatted JSON and revokes the temporary object URL', () => {
    const createObjectURL = jest.fn(() => 'blob:account-export');
    const revokeObjectURL = jest.fn();
    const click = jest.fn();
    const anchor = { click, download: '', href: '' };
    const createElement = jest.fn(() => anchor);

    downloadAccountDataExport(
      {
        schema_version: 2,
        exported_at: '2026-08-12T16:00:00.000Z',
        account: {
          user_id: 'user-123',
          email: 'learner@example.com',
          created_at: '2026-08-12T15:00:00.000Z',
          competition_alias: 'Subnetter-A1B2C3D4',
        },
        synced_progress: [],
        ranked_timed_attempts: [],
      },
      {
        BlobCtor: Blob,
        createElement,
        createObjectURL,
        revokeObjectURL,
      },
    );

    expect(anchor.download).toBe('subnet-game-account-data.json');
    expect(anchor.href).toBe('blob:account-export');
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:account-export');
  });
});
