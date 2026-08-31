import {
  AccountDataService,
  createSupabaseAccountDataGateway,
  type AccountDataExport,
} from '../accountDataLifecycle';

describe('AccountDataService', () => {
  const validExport: AccountDataExport = {
    schema_version: 1,
    exported_at: '2026-08-12T16:00:00.000Z',
    account: {
      user_id: 'user-123',
      email: 'learner@example.com',
      created_at: '2026-08-12T15:00:00.000Z',
    },
    synced_progress: [
      {
        catalog_version: '17dd300a',
        question_ordinal: 1,
        completed_at: '2026-08-12T15:30:00.000Z',
        created_at: '2026-08-12T15:31:00.000Z',
      },
    ],
  };

  it('exports only a validated document for the expected authenticated user', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: validExport, error: null });
    const service = new AccountDataService(createSupabaseAccountDataGateway({ rpc }));

    await expect(service.exportAccountData('user-123')).resolves.toEqual(validExport);
    expect(rpc).toHaveBeenCalledWith('export_account_data', {
      expected_user_id: 'user-123',
    });
  });

  it('rejects malformed or cross-user export documents', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: { ...validExport, account: { ...validExport.account, user_id: 'user-other' } },
      error: null,
    });
    const service = new AccountDataService(createSupabaseAccountDataGateway({ rpc }));

    await expect(service.exportAccountData('user-123')).rejects.toThrow(
      'Account export could not be completed. Please try again.',
    );
  });

  it('deletes only the expected authenticated account', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
    const service = new AccountDataService(createSupabaseAccountDataGateway({ rpc }));

    await service.deleteOwnAccount('user-123');

    expect(rpc).toHaveBeenCalledWith('delete_own_account', {
      expected_user_id: 'user-123',
    });
  });

  it('sanitizes provider lifecycle failures', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: new Error('database details') });
    const service = new AccountDataService(createSupabaseAccountDataGateway({ rpc }));

    await expect(service.exportAccountData('user-123')).rejects.toThrow(
      'Account export could not be completed. Please try again.',
    );
    await expect(service.deleteOwnAccount('user-123')).rejects.toThrow(
      'Account deletion could not be completed. Please try again.',
    );
  });
});
