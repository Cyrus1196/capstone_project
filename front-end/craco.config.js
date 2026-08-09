const path = require('path');

module.exports = {
  webpack: {
    configure: (config) => {
      config.resolve.alias = {
        ...config.resolve.alias,
        axios: path.resolve(__dirname, 'node_modules/axios/dist/esm/axios.js'),
      };

      // Skip ESLint during webpack compile — big speedup for npm start.
      config.plugins = (config.plugins || []).filter(
        (plugin) => plugin?.constructor?.name !== 'ESLintWebpackPlugin'
      );

      for (const plugin of config.plugins) {
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