// typescript-eslint reads code through the TypeScript compiler's JavaScript API, which TypeScript 7 does not have yet.
// The app keeps using TypeScript 7 for type checking; only the linter gets a 6.0 copy to parse with.
// Remove this file once typescript-eslint supports TypeScript 7.
const needsJsApi = (name) =>
  name === "typescript-eslint" || name.startsWith("@typescript-eslint/") || name === "ts-api-utils";

module.exports = {
  hooks: {
    readPackage(pkg) {
      if (!needsJsApi(pkg.name)) return pkg;
      if (pkg.peerDependencies?.typescript) {
        delete pkg.peerDependencies.typescript;
        if (pkg.peerDependenciesMeta) delete pkg.peerDependenciesMeta.typescript;
        pkg.dependencies = { ...pkg.dependencies, typescript: "npm:typescript@~6.0.0" };
      }
      return pkg;
    },
  },
};
