import { register } from 'ts-node';

register({
  transpileOnly: true,
  loader: 'ts-node/esm', // Assure la compatibilité ESM
});

await import('./seed.ts');
