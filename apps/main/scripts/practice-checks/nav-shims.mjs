// Stubs `next/navigation` for the RENDER checks: a client component that calls
// useRouter or usePathname outside Next throws "app router not mounted".
// Import this INSTEAD of nothing in a render script, and never in a check that
// exercises a server page's redirect (it needs the real one).
import { register } from "node:module"
register("data:text/javascript," + encodeURIComponent(`
const stub = \`
  export function useRouter() { return { push(){}, replace(){}, refresh(){}, back(){}, forward(){}, prefetch(){} } }
  export function usePathname() { return process.env.RENDER_PATHNAME || "/practice/dsa" }
  export function useSearchParams() { return new URLSearchParams(process.env.RENDER_SEARCH || "") }
  export function useParams() { return {} }
  export function redirect(url) { const e = new Error("NEXT_REDIRECT"); e.digest = "NEXT_REDIRECT;replace;" + url; throw e }
  export function notFound() { const e = new Error("NEXT_NOT_FOUND"); e.digest = "NEXT_NOT_FOUND"; throw e }
\`
export async function resolve(specifier, context, next) {
  if (specifier === "next/navigation") return { url: "data:text/javascript," + encodeURIComponent(stub), shortCircuit: true }
  return next(specifier, context)
}`), import.meta.url)
