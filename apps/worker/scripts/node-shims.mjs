// Lets a script import worker modules under plain Node. The job base class
// imports `cloudflare:workers`, which only exists inside workerd; scripts never
// construct a Durable Object, so an inert stand-in is enough.
import { register } from "node:module"
register("data:text/javascript," + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  if (specifier === "cloudflare:workers") return { url: "data:text/javascript,export class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env } }", shortCircuit: true }
  return next(specifier, context)
}`), import.meta.url)
