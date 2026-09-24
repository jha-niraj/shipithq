// The config `pnpm starters:check` runs each starter with, instead of the
// starter's own vite.config.ts - that one needs @vitejs/plugin-react, which
// this package does not install. Tests use only describe/it/expect.
export default { test: { globals: true } }
