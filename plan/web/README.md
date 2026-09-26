# plan/web - the marketing site

`apps/web` is the public face: shipithq.com, the blog, pricing, and every page a
stranger sees before they have an account. It is a different product from
`apps/main` with different rules, and the biggest of them is in
`apps/web/CLAUDE.md`: **the separation rule** - nothing here reaches into the
product's database or auth.

## Directories

```
plan/web/
├── README.md              <- you are here
│
├── polish/                design, content and composition
│   ├── overview.md            what "done" means for the site
│   ├── tasks.md               the master numbered list with status
│   ├── 01-content-truth.md    the site describes a product that no longer exists
│   ├── 02-navigation.md       navbar: Features, Compare, hover dropdowns
│   ├── 03-page-hero.md        one header for every public page
│   ├── 04-landing-composition.md  which gurukul components to port, and which not
│   ├── 05-blog-images.md      1.7MB of raster art the blog does not need
│   └── 06-performance.md      the budget everything above has to fit inside
│
├── revamp/                the 2026-09-25 rebuild on the fanout.sh reference:
│   ├── overview.md            decisions and definition of done (/, /hire, /uni, /ideas)
│   └── tasks.md               REV-1 to REV-61
│
└── seo/                   discoverability
    ├── overview.md            what "done" means for discoverability
    ├── tasks.md               the master numbered list with status
    ├── 01-technical-audit.md  what is already right, and the one live error
    ├── 02-structured-data.md  one entity graph, and the type that fails validation
    ├── 03-aeo.md              being CITED by AI engines, not only ranked
    ├── 04-keyword-strategy.md method, not answers - the research is a task
    ├── 05-content-clusters.md pillars, clusters, internal linking
    └── 06-measurement.md      baseline first, or none of it is checkable
```

The two run in parallel and cross-reference each other. Three places they meet:

- `polish/WEB-1` (content truth) blocks `seo/SEO-23` - there is no point sourcing
  a statistic about a feature that is being deleted.
- `polish/WEB-11` (Compare pages) blocks `seo/SEO-22` - comparison schema needs
  comparison pages.
- `polish/WEB-50` and `seo/SEO-50` share one Lighthouse run. Do it once.

Read `overview.md` first. The numbered files are the detail behind the task list;
`tasks.md` is the thing to check progress against.

## The reference

`/Users/nirajjha/Documents/niraj/gurukulhq/apps/web` is the design reference for
this work, chosen because it has already solved most of these problems once. It
is a **reference, not a source to copy wholesale** - it sells school software to
principals, this sells career software to engineering students, and a component
that carries the wrong argument is worse than no component.

Every port task in here names what is being taken and what is being left. Where a
gurukul decision is being adopted, the file says which of its comments explains
why, so the reasoning survives the move.

## The one rule that outranks the rest

**Do not write marketing copy about a feature without checking that the feature
exists.** The single largest problem found in the audit was not design; it was
that the landing page sells a module that was deleted from the product. Every
content task in `tasks.md` has a research step before its build step, and that
step is not optional. See `01-content-truth.md`.
