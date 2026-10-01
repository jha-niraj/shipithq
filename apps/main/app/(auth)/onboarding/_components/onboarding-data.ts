/**
 * What onboarding asks, shared by the current flow and the split layout (plan/auth AUTH-10),
 * so both save the same values.
 */

export const SEMESTERS = [
	"1st Semester", "2nd Semester", "3rd Semester", "4th Semester",
	"5th Semester", "6th Semester", "7th Semester", "8th Semester",
	"Graduate", "Post-Graduate", "Other",
]

// Stored on `users.learningPreferences`. Labels are what the user picks; the ids
// are what we persist, so renaming a label never orphans existing rows.
export const LEARNING_GOALS: Array<{ id: string; label: string }> = [
	{ id: "web-dev", label: "Web Development" },
	{ id: "mobile-dev", label: "Mobile Development" },
	{ id: "backend", label: "Backend Engineering" },
	{ id: "fullstack", label: "Full Stack" },
	{ id: "dsa", label: "Data Structures & Algorithms" },
	{ id: "system-design", label: "System Design" },
	{ id: "os-db", label: "OS & Databases" },
	{ id: "ai-ml", label: "AI & Machine Learning" },
	{ id: "cloud", label: "Cloud Computing" },
	{ id: "devops", label: "DevOps & CI/CD" },
	{ id: "cybersecurity", label: "Cybersecurity" },
	{ id: "blockchain", label: "Blockchain & Web3" },
	{ id: "game-dev", label: "Game Development" },
	{ id: "iot", label: "Internet of Things" },
	{ id: "qa-testing", label: "QA & Automation" },
	{ id: "ui-ux", label: "UI/UX Design" },
	{ id: "product-mgmt", label: "Product Management" },
	{ id: "technical-writing", label: "Technical Writing" },
]

const USERNAME_RE = /^[a-zA-Z0-9_-]+$/

export function validateUsername(value: unknown): string | null {
	const v = String(value ?? "").trim()
	if (v.length < 3 || v.length > 20) return "Username must be between 3 and 20 characters."
	if (!USERNAME_RE.test(v)) return "Only letters, numbers, underscores and hyphens."
	return null
}

/** Suggest a handle from the signed-in name/email so the first field is never blank. */
export function suggestUsername(source: string | null | undefined): string {
	const base = (source ?? "").split("@")[0] ?? ""
	const cleaned = base.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase().slice(0, 20)
	return cleaned.length >= 3 ? cleaned : ""
}
