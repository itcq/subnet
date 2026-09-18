export type AccountIdentity = Readonly<{ userId: string; email: string }>;

export type AccountAuthGateway = Readonly<{
  requestEmailCode(email: string, shouldCreateUser: boolean): Promise<void>;
  verifyEmailCode(email: string, code: string): Promise<AccountIdentity>;
  getCurrentIdentity(): Promise<AccountIdentity | null>;
  subscribeIdentity(listener: (identity: AccountIdentity | null) => void): () => void;
  signOut(): Promise<void>;
  clearDeletedIdentitySession(expectedUserId: string): Promise<boolean>;
}>;

type SupabaseAuthResult = Readonly<{ error: Error | null }>;
type SupabaseVerifyResult = Readonly<{
  data: Readonly<{ user: Readonly<{ id: string; email?: string }> | null }>;
  error: Error | null;
}>;
type SupabaseSession = Readonly<{
  user: Readonly<{ id: string; email?: string }>;
}>;
type SupabaseSessionResult = Readonly<{
  data: Readonly<{
    session: SupabaseSession | null;
  }>;
  error: Error | null;
}>;
type SupabaseAuthSubscription = Readonly<{
  data: Readonly<{
    subscription: Readonly<{ unsubscribe(): void }>;
  }>;
}>;
export type SupabaseAuthClient = Readonly<{
  auth: Readonly<{
    signInWithOtp(input: Readonly<{ email: string; options: Readonly<{ shouldCreateUser: boolean }> }>): Promise<SupabaseAuthResult>;
    verifyOtp(input: Readonly<{ email: string; token: string; type: 'email' }>): Promise<SupabaseVerifyResult>;
    getSession(): Promise<SupabaseSessionResult>;
    onAuthStateChange?(
      listener: (event: string, session: SupabaseSession | null) => void,
    ): SupabaseAuthSubscription;
    signOut(): Promise<SupabaseAuthResult>;
  }>;
}>;

function throwProviderError(error: Error | null): void {
  if (error !== null) {
    throw new Error('Account request could not be completed. Please try again.');
  }
}

async function runProviderRequest<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch {
    throw new Error('Account request could not be completed. Please try again.');
  }
}

function identityFromSession(session: SupabaseSession | null): AccountIdentity | null {
  const user = session?.user;
  if (user === undefined || user.email === undefined) return null;
  return { userId: user.id, email: user.email };
}

export function createSupabaseAccountAuthGateway(
  client: SupabaseAuthClient,
): AccountAuthGateway {
  let authMutation = Promise.resolve();
  const serializeAuthMutation = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = authMutation.then(operation, operation);
    authMutation = result.then(() => undefined, () => undefined);
    return result;
  };

  return {
    async requestEmailCode(email, shouldCreateUser) {
      const result = await runProviderRequest(() =>
        client.auth.signInWithOtp({
          email,
          options: { shouldCreateUser },
        }),
      );
      throwProviderError(result.error);
    },
    async verifyEmailCode(email, code) {
      const result = await serializeAuthMutation(() => runProviderRequest(() =>
        client.auth.verifyOtp({ email, token: code, type: 'email' }),
      ));
      throwProviderError(result.error);
      if (result.data.user?.email === undefined) {
        throw new Error('Verified account identity is unavailable.');
      }
      return { userId: result.data.user.id, email: result.data.user.email };
    },
    async getCurrentIdentity() {
      const result = await runProviderRequest(() => client.auth.getSession());
      throwProviderError(result.error);
      const user = result.data.session?.user;
      if (user === undefined || user.email === undefined) return null;
      return { userId: user.id, email: user.email };
    },
    subscribeIdentity(listener) {
      if (client.auth.onAuthStateChange === undefined) return () => undefined;
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        listener(identityFromSession(session));
      });
      return () => data.subscription.unsubscribe();
    },
    async signOut() {
      const result = await serializeAuthMutation(() =>
        runProviderRequest(() => client.auth.signOut()),
      );
      throwProviderError(result.error);
    },
    async clearDeletedIdentitySession(expectedUserId) {
      return serializeAuthMutation(async () => {
        const sessionResult = await runProviderRequest(() => client.auth.getSession());
        throwProviderError(sessionResult.error);
        if (sessionResult.data.session?.user.id !== expectedUserId) return false;
        const signOutResult = await runProviderRequest(() => client.auth.signOut());
        throwProviderError(signOutResult.error);
        return true;
      });
    },
  };
}

export class AccountAuthService {
  constructor(private readonly gateway: AccountAuthGateway) {}

  async getCurrentAccount(): Promise<AccountIdentity | null> {
    return this.gateway.getCurrentIdentity();
  }

  subscribeToAccountChanges(
    listener: (identity: AccountIdentity | null) => void,
  ): () => void {
    return this.gateway.subscribeIdentity(listener);
  }

  async signOut(): Promise<void> {
    await this.gateway.signOut();
  }

  async clearDeletedAccountSession(expectedUserId: string): Promise<boolean> {
    return this.gateway.clearDeletedIdentitySession(expectedUserId);
  }

  async requestRegistrationCode(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('Enter a valid email address.');
    }
    await this.gateway.requestEmailCode(normalizedEmail, true);
  }

  async verifyRegistrationCode(
    email: string,
    code: string,
  ): Promise<Readonly<{ userId: string; email: string }>> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\d{6}$/.test(code)) {
      throw new Error('Enter the six-digit verification code.');
    }
    return this.gateway.verifyEmailCode(normalizedEmail, code);
  }
}
