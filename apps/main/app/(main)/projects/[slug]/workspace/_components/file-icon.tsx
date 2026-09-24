import {
    Atom, Braces, BookOpen, FileCode2, FileText, FlaskConical, GitBranch, Hash, Image as ImageIcon, Settings2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@repo/ui/lib/utils'
import { baseName } from './workspace-model'

/*
 * A file-type icon in its language's own colour (Niraj, 2026-09-24: "for TS
 * get the colour of TS itself").
 *
 * A DELIBERATE, SCOPED EXCEPTION to CLAUDE.md's monochrome palette, asked for
 * by Niraj and recorded in plan/project-workspace WS-3c: it applies to these
 * file-type icons and nothing else in the product. Each colour has a darker
 * shade for light mode, because the brand colours (React cyan, JS yellow) were
 * chosen for dark editors and vanish on white.
 *
 * The classes are written out in full, never assembled at runtime: Tailwind
 * only generates the class names it can find in the source.
 */
interface Kind { icon?: LucideIcon; badge?: string; color: string }

const TS = 'text-[#3178C6] dark:text-[#4A9BF0]'
const REACT = 'text-[#087EA4] dark:text-[#61DAFB]'
const JS = 'text-[#A68A00] dark:text-[#F7DF1E]'
const JSON_ = 'text-[#A6700C] dark:text-[#E5C07B]'
const CSS = 'text-[#663399] dark:text-[#B48EF0]'
const HTML = 'text-[#D1401B] dark:text-[#F06A3F]'
const MD = 'text-[#2D6F95] dark:text-[#6CB6D9]'
const TEST = 'text-[#15803D] dark:text-[#4ADE80]'
const NPM = 'text-[#C12127] dark:text-[#F0626A]'
const VITE = 'text-[#5A61E6] dark:text-[#9499FF]'
const GIT = 'text-[#D63F1E] dark:text-[#F4704F]'
const IMAGE = 'text-[#0F8A7E] dark:text-[#4FC3B6]'
const PLAIN = 'text-neutral-500 dark:text-neutral-400'

function kindOf(path: string): Kind {
    const name = baseName(path).toLowerCase()
    if (/\.(test|spec)\.[jt]sx?$/.test(name)) return { icon: FlaskConical, color: TEST }
    if (name === '.gitignore') return { icon: GitBranch, color: GIT }
    if (name === 'package.json' || name === 'package-lock.json') return { icon: Settings2, color: NPM }
    if (/^tsconfig(\..+)?\.json$/.test(name)) return { icon: Settings2, color: TS }
    if (/^(vite|vitest)\.config\./.test(name)) return { icon: Settings2, color: VITE }
    if (/^(eslint|postcss|tailwind)\.config\./.test(name)) return { icon: Settings2, color: PLAIN }
    const ext = name.slice(name.lastIndexOf('.') + 1)
    switch (ext) {
        case 'tsx': case 'jsx': return { icon: Atom, color: REACT }
        case 'ts': case 'mts': case 'cts': return { badge: 'TS', color: TS }
        case 'js': case 'mjs': case 'cjs': return { badge: 'JS', color: JS }
        case 'json': return { icon: Braces, color: JSON_ }
        case 'css': case 'scss': return { icon: Hash, color: CSS }
        case 'html': return { badge: '<>', color: HTML }
        case 'md': case 'mdx': return { icon: BookOpen, color: MD }
        case 'svg': case 'png': case 'jpg': case 'jpeg': case 'gif': case 'webp': case 'ico': return { icon: ImageIcon, color: IMAGE }
        default: return { icon: FileText, color: PLAIN }
    }
}

export function FileIcon({ path, className }: { path: string; className?: string }) {
    const { icon: Icon, badge, color } = kindOf(path)
    if (badge) {
        return (
            <span className={cn('inline-flex h-4 w-4 shrink-0 items-center justify-center font-mono text-[9px] font-bold leading-none tracking-tight', color, className)}>
                {badge}
            </span>
        )
    }
    const I = Icon ?? FileText
    return <I className={cn('h-4 w-4 shrink-0', color, className)} />
}
