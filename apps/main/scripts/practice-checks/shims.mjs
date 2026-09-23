// Lets the practice checks import server actions and route handlers under
// plain Node, as a signed-in test user:
// - `@repo/auth` getSession returns E2E_USER_ID; `next/headers` returns empty headers;
// - `server-only` is inert. CSS required through CommonJS is handled by
//   css.mjs, which must be imported AFTER the tsx loader (tsx replaces the
//   .css handler when it registers).
import { register } from "node:module"
register("data:text/javascript," + encodeURIComponent(`
const stubs = {
  "server-only": "export {}",
  "next/headers": "export async function headers() { return new Headers() } export async function cookies() { return { get() { return undefined } } }",
  "next/cache": "export function revalidatePath() {} export function revalidateTag() {} export function unstable_cache(fn) { return fn } export function unstable_noStore() {}",
  "@repo/auth": "export async function getSession() { const id = process.env.E2E_USER_ID; return id ? { user: { id, email: process.env.E2E_USER_EMAIL ?? (id + '@e2e.shipithq.test') } } : null }",
}
export async function resolve(specifier, context, next) {
  if (specifier in stubs) return { url: "data:text/javascript," + encodeURIComponent(stubs[specifier]), shortCircuit: true }
  if (specifier.endsWith(".css")) return { url: "data:text/javascript,export default {}", shortCircuit: true }
  return next(specifier, context)
}`), import.meta.url)
