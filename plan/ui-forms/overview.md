# Main app forms and layout - the same rules as the hiring app

## What the module is when it is done

apps/main follows the rules set for the hiring app (plan/hiring-ui, Niraj 2026-09-27/28):
predictable values are **selects with "Other"** (new values go to the shared dataset,
shown to everyone once 3 organisations or students used them), numbers are **validated
text** (never `type="number"`), tag inputs work from the **keyboard**, long forms are
**steps**, primary actions are **sticky**, list/detail side columns are **sticky**, and
no page leaves a narrow column with empty space beside it. The AI panel opens by default
and remembers being closed (done in HU-1, shared).

**Use the shared pieces built in plan/hiring-ui HU-2 and HU-3, don't rebuild them:**
`OptionSelect`, `NumberTextInput`, `TagInput`, `StickyActionBar`, `StickyAside` in
`@repo/ui`, and `listOptions` / `recordOption` over `option_value` in `@repo/db`.
Every task: `cd apps/main && npx tsc --noEmit`, skeletons updated to match, no dashes.
