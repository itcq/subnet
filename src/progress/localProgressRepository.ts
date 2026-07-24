export type LocalQuestionProgress = Readonly<{
  catalogVersion: string;
  questionId: string;
  ordinal: number;
  completedAt: string;
  attemptCount: number;
  pendingSync: boolean;
}>;

export type LocalProgressRepository = {
  initialize(): Promise<void>;
  listCompleted(
    catalogVersion: string,
  ): Promise<readonly LocalQuestionProgress[]>;
  recordCompletion(input: LocalQuestionProgress): Promise<void>;
};
