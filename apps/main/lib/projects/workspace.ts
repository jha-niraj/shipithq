/*
 * Workspace file rules, shared by the actions and the editor.
 * The limits are decisions: see plan/project-workspace/overview.md and WS-1.
 */

/** Largest single file, in bytes. Source files; anything bigger is not code. */
export const MAX_FILE_BYTES = 200 * 1024
/** Largest total across a project's files, in bytes. */
export const MAX_PROJECT_BYTES = 5 * 1024 * 1024
/** Most files in one project. */
export const MAX_FILES = 300

/**
 * Normalise a workspace path to "/a/b.tsx", or return null if it is not a
 * path we accept.
 *
 * Refused: empty paths, ".." and "." segments, backslashes, NUL and control
 * characters, and segments over 100 characters. Nothing here touches a real
 * filesystem, but these paths are handed to the in-browser bundler, and a
 * path that means something different there than it does here is a bug
 * waiting to happen.
 */
export function normalizeWorkspacePath(raw: string): string | null {
    if (typeof raw !== 'string') return null
    // eslint-disable-next-line no-control-regex -- refusing control characters is the point
    if (raw.includes('\\') || /[\u0000-\u001f]/.test(raw)) return null
    const segments = raw.split('/').filter((s) => s.length > 0)
    if (segments.length === 0) return null
    for (const seg of segments) {
        if (seg === '.' || seg === '..' || seg.length > 100) return null
    }
    const path = '/' + segments.join('/')
    return path.length > 400 ? null : path
}

/** UTF-8 size of a string, in bytes. */
export function byteLength(text: string): number {
    return new TextEncoder().encode(text).length
}
