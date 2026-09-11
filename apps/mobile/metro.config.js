// Expo configure deja Metro pour le monorepo (SDK 52+). On ajoute seulement de quoi lire
// @padelteammates/shared depuis ses sources TypeScript, sans build prealable.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 1. Condition d'export qui pointe le paquet partage sur src/ (voir packages/shared/package.json).
config.resolver.unstable_conditionNames = [
  ...(config.resolver.unstable_conditionNames ?? []),
  '@padelteammates/source',
];

// 2. Les sources partagees importent './x.js' (style NodeNext, requis par l'API) pour des
//    fichiers './x.ts' : Metro ne fait pas cette substitution, on retente sans l'extension.
const baseResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = baseResolveRequest ?? context.resolveRequest;
  try {
    return resolve(context, moduleName, platform);
  } catch (error) {
    if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
      return resolve(context, moduleName.slice(0, -3), platform);
    }
    throw error;
  }
};

module.exports = config;
