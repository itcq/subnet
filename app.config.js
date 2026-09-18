const deployBaseUrl = process.env.EXPO_PUBLIC_DEPLOY_BASE_URL ?? '/subnet';

module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: deployBaseUrl,
  },
});
