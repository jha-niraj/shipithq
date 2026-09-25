/**
 * Next.js control-flow signals are thrown as errors ON PURPOSE:
 *   - redirect()  throws an error whose `digest` starts with "NEXT_REDIRECT"
 *   - notFound()  throws an error whose `digest` === "NEXT_NOT_FOUND"
 *
 * These are NOT failures - they are how App Router performs navigation. If any
 * catch block, classifyError(), or fail() swallows them, navigation silently
 * breaks. Every error-handling entry point MUST detect these first and re-throw.
 *
 * This check is framework-agnostic (string sniffing only), so it is safe to run
 * in React Native / the worker too, where it simply never matches.
 */
export function isNextControlFlow(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest !== 'string') return false;
    return digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND';
}
