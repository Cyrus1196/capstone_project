const path = require('path');

module.exports = {
  webpack: {
    configure: (config) => {
      config.resolve.alias = {
        ...config.resolve.alias,
        axios: path.resolve(__dirname, 'node_modules/axios/dist/esm/axios.js'),
      };

      for (const plugin of config.plugins || []) {
        if (
          plugin &&
          plugin.constructor?.name === 'ESLintWebpackPlugin' &&
          plugin.options
        ) {
          plugin.options.cacheLocation = path.join(
            __dirname,
            '.cache',
            '.eslintcache'
          );
        }

        if (
          plugin &&
          plugin.constructor?.name === 'MiniCssExtractPlugin' &&
          plugin.options
        ) {
          plugin.options.ignoreOrder = true;
        }
      }

      return config;
    },
  },
};