import type { AccountDataExport } from '@/auth/accountDataLifecycle';

type DownloadDependencies = Readonly<{
  BlobCtor: typeof Blob;
  createElement(tagName: 'a'): Pick<HTMLAnchorElement, 'click' | 'download' | 'href'>;
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
}>;

const defaultDependencies: DownloadDependencies = {
  BlobCtor: Blob,
  createElement: (tagName) => document.createElement(tagName),
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
};

export function downloadAccountDataExport(
  data: AccountDataExport,
  dependencies: DownloadDependencies = defaultDependencies,
): void {
  const blob = new dependencies.BlobCtor(
    [`${JSON.stringify(data, null, 2)}\n`],
    { type: 'application/json' },
  );
  const objectUrl = dependencies.createObjectURL(blob);
  try {
    const anchor = dependencies.createElement('a');
    anchor.download = 'subnet-game-account-data.json';
    anchor.href = objectUrl;
    anchor.click();
  } finally {
    dependencies.revokeObjectURL(objectUrl);
  }
}
