export type LearningMethod = Readonly<{
  id: string;
  name: string;
  summary: string;
  connection: string;
  steps: readonly string[];
}>;

export type WorkedSubnetExample = Readonly<{
  id: string;
  title: string;
  ip: string;
  prefix: number;
  answer: string;
  context: string;
  whatChanges: string;
  whatStaysSame: string;
  steps: readonly string[];
}>;

export type LearningResource = Readonly<{
  id: string;
  title: string;
  creator: string;
  url: string;
  focus: string;
  whyUseful: string;
  sourceCheckedAt: string;
}>;

export type LearningPathStep = Readonly<{
  id: string;
  title: string;
  summary: string;
}>;

export type LearningModule = Readonly<{
  id: string;
  title: string;
  purpose: string;
  path: readonly LearningPathStep[];
  objective: string;
  introduction: readonly string[];
  methods: readonly LearningMethod[];
  workedExamples: readonly WorkedSubnetExample[];
  practice: Readonly<{
    title: string;
    description: string;
  }>;
  resources: readonly LearningResource[];
}>;

export type LearningCatalog = Readonly<{
  version: string;
  modules: readonly LearningModule[];
}>;
