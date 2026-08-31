const expectedFixedReleaseFiles = Object.freeze([
  '.nojekyll',
  '_expo/.routes.json',
  'assets/node_modules/expo-router/assets/arrow_down.017bc6ba3fc25503e5eb5e53826d48a8.png',
  'assets/node_modules/expo-router/assets/error.d1ea1496f9057eb392d5bbf3732a61b7.png',
  'assets/node_modules/expo-router/assets/file.19eeb73b9593a38f8e9f418337fc7d10.png',
  'assets/node_modules/expo-router/assets/forward.d8b800c443b8972542883e0b9de2bdc6.png',
  'assets/node_modules/expo-router/assets/pkg.ab19f4cbc543357183a20571f68380a3.png',
  'assets/node_modules/expo-router/assets/react-navigation/elements/back-icon-mask.0a328cd9c1afd0afe8e3b1ec5165b1b4.png',
  'assets/node_modules/expo-router/assets/react-navigation/elements/back-icon.35ba0eaec5a4f5ed12ca16fabeae451d.png',
  'assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55.png',
  'assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@2x.png',
  'assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@3x.png',
  'assets/node_modules/expo-router/assets/react-navigation/elements/clear-icon.c94f6478e7ae0cdd9f15de1fcb9e5e55@4x.png',
  'assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7.png',
  'assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7@2x.png',
  'assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7@3x.png',
  'assets/node_modules/expo-router/assets/react-navigation/elements/close-icon.808e1b1b9b53114ec2838071a7e6daa7@4x.png',
  'assets/node_modules/expo-router/assets/react-navigation/elements/search-icon.286d67d3f74808a60a78d3ebf1a5fb57.png',
  'assets/node_modules/expo-router/assets/sitemap.412dd9275b6b48ad28f5e3d81bb1f626.png',
  'assets/node_modules/expo-router/assets/unmatched.20e71bdf79e3a97bf55fd9e164041578.png',
  'favicon.ico',
  'index.html',
  'robots.txt',
]);

function isHtmlDocument(file) {
  return /\.html?$/i.test(file);
}

function isAllowedReleaseFileSet(files) {
  if (!Array.isArray(files) || new Set(files).size !== files.length) {
    return false;
  }

  const expected = new Set(expectedFixedReleaseFiles);
  const dynamicFiles = files.filter((file) => !expected.has(file));
  return (
    files.length === expectedFixedReleaseFiles.length + 1 &&
    expectedFixedReleaseFiles.every((file) => files.includes(file)) &&
    dynamicFiles.length === 1 &&
    /^_expo\/static\/js\/web\/entry-[a-f0-9]{32}\.js$/.test(dynamicFiles[0])
  );
}

module.exports = { expectedFixedReleaseFiles, isAllowedReleaseFileSet, isHtmlDocument };
