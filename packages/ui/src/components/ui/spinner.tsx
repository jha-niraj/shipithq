import { cn } from "../../lib/utils"

import { Loader2Icon, type LucideProps } from "lucide-react"

/**
 * THE in-flight mark, in every app (Niraj, 2026-10-23: one spinner everywhere, the dot matrix gone).
 *
 * Only the first loading tier: a control's own action (a button submitting, a row saving). A region with a shape gets
 * a skeleton and a whole page gets GurukulLoader. Sized like the icon it stands in for (`size-4` default), so a button
 * that swaps its icon for this never changes size. Pass `aria-label` when "Loading" is not the right word.
 */
function Spinner({ className, ...props }: Omit<LucideProps, "ref">) {
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      {...props}
      className={cn("size-4 shrink-0 animate-spin", className)}
    />
  )
}

export { Spinner }
