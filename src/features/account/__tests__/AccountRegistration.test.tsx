import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import type { AccountAuthService } from '@/auth/accountAuth';
import { AccountRegistration } from '../AccountRegistration';

describe('AccountRegistration', () => {
  it('links the published privacy notice before collecting an email', async () => {
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const service = {
      getCurrentAccount: jest.fn().mockResolvedValue(null),
    } as unknown as AccountAuthService;
    const screen = await render(
      <AccountRegistration
        onBack={jest.fn()}
        privacyNoticeUrl="https://example.test/account-privacy"
        service={service}
      />,
    );

    await fireEvent.press(screen.getByRole('link', { name: 'READ THE ACCOUNT PRIVACY NOTICE' }));
    expect(openUrl).toHaveBeenCalledWith('https://example.test/account-privacy');
    openUrl.mockRestore();
  });

  it('requests a code and verifies the public account without marketing consent', async () => {
    const service = {
      getCurrentAccount: jest.fn().mockResolvedValue(null),
      requestRegistrationCode: jest.fn().mockResolvedValue(undefined),
      verifyRegistrationCode: jest.fn().mockResolvedValue({
        userId: 'user-123',
        email: 'learner@example.com',
      }),
    } as unknown as AccountAuthService;
    const screen = await render(
      <AccountRegistration onBack={jest.fn()} service={service} />,
    );

    expect(screen.getByRole('header', { name: 'Create or sign in to your account' })).toBeTruthy();
    expect(screen.getByText(/save signed-in journey progress to your account automatically/i)).toBeTruthy();
    expect(screen.getByText(/does not subscribe you to marketing/i)).toBeTruthy();
    expect(screen.getByText(/anonymous browser progress stays separate/i)).toBeTruthy();
    expect(screen.getByText(/anonymous browser progress stays separate and is never uploaded/i)).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText('Email address'),
      'Learner@Example.com',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'EMAIL ME A CODE' }));

    await waitFor(() => {
      expect(service.requestRegistrationCode).toHaveBeenCalledWith(
        'Learner@Example.com',
      );
    });
    expect(screen.getByLabelText('Six-digit verification code')).toBeTruthy();

    await fireEvent.changeText(
      screen.getByLabelText('Six-digit verification code'),
      '123456',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'VERIFY AND CONTINUE' }));

    await waitFor(() => {
      expect(service.verifyRegistrationCode).toHaveBeenCalledWith(
        'Learner@Example.com',
        '123456',
      );
    });
    expect(screen.getByRole('header', { name: 'Account ready' })).toBeTruthy();
    expect(screen.getByText('learner@example.com')).toBeTruthy();
  });

  it('does not expose a manual sync action after sign in', async () => {
    const service = {
      getCurrentAccount: jest.fn().mockResolvedValue(null),
      requestRegistrationCode: jest.fn().mockResolvedValue(undefined),
      verifyRegistrationCode: jest.fn().mockResolvedValue({
        userId: 'user-123',
        email: 'learner@example.com',
      }),
    } as unknown as AccountAuthService;
    const screen = await render(
      <AccountRegistration
        onBack={jest.fn()}
        service={service}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText('Email address'), 'learner@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'EMAIL ME A CODE' }));
    await fireEvent.changeText(screen.getByLabelText('Six-digit verification code'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'VERIFY AND CONTINUE' }));

    await waitFor(() => expect(screen.getByRole('header', { name: 'Account ready' })).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'SYNC MY JOURNEY PROGRESS' })).toBeNull();
    expect(screen.getByText(/signed-in journey progress is saved to your account automatically/i)).toBeTruthy();
  });

  it('explains account-only sync and sign-out behavior before synchronization', async () => {
    const identity = { userId: 'user-456', email: 'second@example.com' };
    const service = {
      getCurrentAccount: jest.fn().mockResolvedValue(identity),
      requestRegistrationCode: jest.fn(),
      verifyRegistrationCode: jest.fn(),
      signOut: jest.fn(),
    } as unknown as AccountAuthService;
    const screen = await render(
      <AccountRegistration
        onBack={jest.fn()}
        service={service}
      />,
    );
    await waitFor(() => expect(screen.getByRole('header', { name: 'Account ready' })).toBeTruthy());

    expect(screen.getByText(/anonymous browser progress is never uploaded/i)).toBeTruthy();
    expect(screen.getByText(/signing out returns this journey to anonymous browser progress/i)).toBeTruthy();
    expect(screen.getByText(/account progress remains stored in this browser/i)).toBeTruthy();
  });


  it('restores an authenticated session and provides explicit sign out', async () => {
    const identity = { userId: 'user-123', email: 'learner@example.com' };
    const service = {
      getCurrentAccount: jest.fn().mockResolvedValue(identity),
      requestRegistrationCode: jest.fn(),
      verifyRegistrationCode: jest.fn(),
      signOut: jest.fn().mockResolvedValue(undefined),
    } as unknown as AccountAuthService;
    const onIdentityChange = jest.fn();
    const screen = await render(
      <AccountRegistration
        onBack={jest.fn()}
        onIdentityChange={onIdentityChange}
        service={service}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('header', { name: 'Account ready' })).toBeTruthy();
    });
    expect(screen.getByText('learner@example.com')).toBeTruthy();
    expect(onIdentityChange).toHaveBeenCalledWith(identity);

    await fireEvent.press(screen.getByRole('button', { name: 'SIGN OUT' }));

    await waitFor(() => {
      expect(service.signOut).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('header', { name: 'Create or sign in to your account' })).toBeTruthy();
    });
    expect(onIdentityChange).toHaveBeenLastCalledWith(null);
  });

  it('notifies the parent when session restoration confirms there is no account', async () => {
    const service = {
      getCurrentAccount: jest.fn().mockResolvedValue(null),
      requestRegistrationCode: jest.fn(),
      verifyRegistrationCode: jest.fn(),
      signOut: jest.fn(),
    } as unknown as AccountAuthService;
    const onIdentityChange = jest.fn();

    await render(
      <AccountRegistration
        onBack={jest.fn()}
        onIdentityChange={onIdentityChange}
        service={service}
      />,
    );

    await waitFor(() => expect(onIdentityChange).toHaveBeenCalledWith(null));
  });

  it('does not let a stale restored session overwrite a newly verified account', async () => {
    let resolveRestore!: (identity: { userId: string; email: string } | null) => void;
    const verifiedIdentity = { userId: 'user-new', email: 'new@example.com' };
    const service = {
      getCurrentAccount: jest.fn(() => new Promise<{
        userId: string;
        email: string;
      } | null>((resolve) => {
        resolveRestore = resolve;
      })),
      requestRegistrationCode: jest.fn().mockResolvedValue(undefined),
      verifyRegistrationCode: jest.fn().mockResolvedValue(verifiedIdentity),
      signOut: jest.fn().mockResolvedValue(undefined),
    } as unknown as AccountAuthService;
    const onIdentityChange = jest.fn();
    const screen = await render(
      <AccountRegistration
        onBack={jest.fn()}
        onIdentityChange={onIdentityChange}
        service={service}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText('Email address'), 'new@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'EMAIL ME A CODE' }));
    await waitFor(() => expect(screen.getByLabelText('Six-digit verification code')).toBeTruthy());
    await fireEvent.changeText(screen.getByLabelText('Six-digit verification code'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'VERIFY AND CONTINUE' }));

    await waitFor(() => expect(screen.getByText('new@example.com')).toBeTruthy());

    resolveRestore({ userId: 'user-old', email: 'old@example.com' });

    await waitFor(() => expect(screen.getByText('new@example.com')).toBeTruthy());
    expect(screen.queryByText('old@example.com')).toBeNull();
    expect(onIdentityChange).toHaveBeenLastCalledWith(verifiedIdentity);
  });

  it('ignores verification that resolves after a newer auth identity event', async () => {
    let authListener!: (identity: { userId: string; email: string } | null) => void;
    let resolveVerification!: (identity: { userId: string; email: string }) => void;
    const newerIdentity = { userId: 'user-newer', email: 'newer@example.com' };
    const staleIdentity = { userId: 'user-stale', email: 'stale@example.com' };
    const service = {
      getCurrentAccount: jest.fn().mockResolvedValue(null),
      subscribeToAccountChanges: jest.fn((listener) => {
        authListener = listener;
        return jest.fn();
      }),
      requestRegistrationCode: jest.fn().mockResolvedValue(undefined),
      verifyRegistrationCode: jest.fn(() => new Promise((resolve) => {
        resolveVerification = resolve;
      })),
      signOut: jest.fn().mockResolvedValue(undefined),
    } as unknown as AccountAuthService;
    const onIdentityChange = jest.fn();
    const screen = await render(
      <AccountRegistration
        onBack={jest.fn()}
        onIdentityChange={onIdentityChange}
        service={service}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText('Email address'), 'stale@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'EMAIL ME A CODE' }));
    await waitFor(() => expect(screen.getByLabelText('Six-digit verification code')).toBeTruthy());
    await fireEvent.changeText(screen.getByLabelText('Six-digit verification code'), '123456');
    void fireEvent.press(screen.getByRole('button', { name: 'VERIFY AND CONTINUE' }));
    await waitFor(() => expect(service.verifyRegistrationCode).toHaveBeenCalled());

    authListener(newerIdentity);
    resolveVerification(staleIdentity);

    await waitFor(() => expect(screen.getByText('newer@example.com')).toBeTruthy());
    expect(screen.queryByText('stale@example.com')).toBeNull();
    expect(onIdentityChange).toHaveBeenLastCalledWith(newerIdentity);
  });

  it('exports account data through an explicit authenticated action', async () => {
    const identity = { userId: 'user-123', email: 'learner@example.com' };
    const service = {
      getCurrentAccount: jest.fn().mockResolvedValue(identity),
      requestRegistrationCode: jest.fn(),
      verifyRegistrationCode: jest.fn(),
      signOut: jest.fn(),
    } as unknown as AccountAuthService;
    const onExportAccountData = jest.fn().mockResolvedValue(undefined);
    const screen = await render(
      <AccountRegistration
        onBack={jest.fn()}
        onExportAccountData={onExportAccountData}
        service={service}
      />,
    );

    await waitFor(() => expect(screen.getByRole('header', { name: 'Account ready' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'DOWNLOAD MY ACCOUNT DATA' }));

    await waitFor(() => expect(onExportAccountData).toHaveBeenCalledWith(identity));
    expect(screen.getByText('Your account data download is ready.')).toBeTruthy();
  });

  it('requires typed confirmation before permanently deleting an account', async () => {
    const identity = { userId: 'user-123', email: 'learner@example.com' };
    const service = {
      getCurrentAccount: jest.fn().mockResolvedValue(identity),
      requestRegistrationCode: jest.fn(),
      verifyRegistrationCode: jest.fn(),
      signOut: jest.fn(),
    } as unknown as AccountAuthService;
    const onDeleteAccount = jest.fn().mockResolvedValue(undefined);
    const onIdentityChange = jest.fn();
    const screen = await render(
      <AccountRegistration
        onBack={jest.fn()}
        onDeleteAccount={onDeleteAccount}
        onIdentityChange={onIdentityChange}
        service={service}
      />,
    );

    await waitFor(() => expect(screen.getByRole('header', { name: 'Account ready' })).toBeTruthy());
    expect(screen.getByRole('button', { name: 'DELETE MY ACCOUNT' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Type DELETE to confirm account deletion'), 'DELETE');
    await fireEvent.press(screen.getByRole('button', { name: 'DELETE MY ACCOUNT' }));

    await waitFor(() => expect(onDeleteAccount).toHaveBeenCalledWith(identity));
    expect(onIdentityChange).not.toHaveBeenCalledWith(null);
    expect(screen.getByRole('header', { name: 'Account ready' })).toBeTruthy();
  });

  it('explains that registration is unavailable when no backend is configured', async () => {
    const screen = await render(
      <AccountRegistration onBack={jest.fn()} service={null} />,
    );

    expect(screen.getByRole('header', { name: 'Accounts are not available yet' })).toBeTruthy();
    expect(screen.getByText(/local Journey progress still works/i)).toBeTruthy();
    expect(screen.getByText(/no registration or account data is collected while the account service is not configured/i)).toBeTruthy();
    expect(screen.queryByText(/secure backend/i)).toBeNull();
    expect(screen.queryByLabelText('Email address')).toBeNull();
  });
});
