const path = require('path');

module.exports = {
  webpack: {
    configure: (config) => {
      // Prebuilt ESM browser bundle: correct `export default` for `import axios from 'axios'`.
      // Avoids Webpack 5 + lib/http adapter and avoids CJS interop bugs (`create is not a function`).
      config.resolve.alias = {
        ...config.resolve.alias,
        axios: path.resolve(__dirname, 'node_modules/axios/dist/esm/axios.js'),
      };
      return config;
    },
  },
};
