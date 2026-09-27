# Company brain - what the company AI knows

## What the module is when it is done

The company AI answers and drafts (jobs, pipelines, messages, tasks) from what the company
actually is: a short profile of confirmed preferences always in its prompt, and a
per-company search over the company's own unstructured text in **Cloudflare Vectorize**,
next to the exact data it already reads through tools.

## Decisions (Niraj, 2026-09-28)

| Question | Decision |
|---|---|
| Design | **Hybrid.** Vectorize holds unstructured text only; exact data (jobs, pipelines, team, candidates, scores, pay numbers) stays behind the AI's tools; candidates are never embedded. |
| Store | **Cloudflare Vectorize**, one index, every vector tagged and filtered by `companyId`. |
| What is embedded | the company profile (description, culture, benefits, stack), its own site's pages (the scrape), uploaded documents (their extracted text), job descriptions, pipeline briefs and rubrics, members' public profiles (title, skills, the links they added). |
| Preferences | A short profile ("hires in Bengaluru, hybrid", "SDE-1 12-18 LPA") in the prompt on every turn: the owner fills it at onboarding; the AI can propose additions, which apply only once confirmed. |

## Tasks

| ID | Task | Status |
|---|---|---|
| CB-1 | `company_brain` (preferences) and `company_knowledge` (source, chunk, vector id, hash) tables | not started |
| CB-2 | Vectorize index binding on the worker; an embed job per changed source (hash-skipped) | not started |
| CB-3 | Hooks: profile save, scrape done, document upload, job save, pipeline save, member profile save | not started |
| CB-4 | The AI: preferences in the system prompt; `search_company_knowledge` tool; propose-a-preference with confirm | not started |
| CB-5 | A preview-first backfill script for existing companies | not started |
