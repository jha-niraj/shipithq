/*
 * The one label a company page carries (plan/hiring-rounds HR-9), decided in one
 * place so the directory and the page can never disagree.
 *
 * - Verified: the company runs the page, and ShipItHQ checked it.
 * - Unverified: the company runs the page; not checked yet (or not approved).
 * - Unclaimed: ShipItHQ built it from the company's own site (HR-6), and the
 *   company has not taken it over. A claim under review still reads Unclaimed.
 *
 * Only Verified companies receive results (overview, "Unclaimed companies are
 * practice only"), so the other two say "practice only".
 */

export type CompanyTrustKind = "verified" | "unverified" | "unclaimed"

export interface CompanyTrust {
    kind: CompanyTrustKind
    label: string
    /** One line under the label. */
    explain: (companyName: string) => string
    /** Results can be sent to this company. */
    canReceiveResults: boolean
    /** A logo may be shown: never on a page the company has not claimed. */
    showLogo: boolean
}

export function companyTrust(claimStatus: string | null | undefined, verificationStatus: string | null | undefined): CompanyTrust {
    if (claimStatus === "UNCLAIMED" || claimStatus === "CLAIM_PENDING") {
        return {
            kind: "unclaimed",
            label: "Unclaimed - not affiliated with ShipItHQ",
            explain: (name) => `Built by ShipItHQ from ${name}'s own website. Practice only: results can't be sent until ${name} claims this page.`,
            canReceiveResults: false,
            showLogo: false,
        }
    }
    if (verificationStatus === "VERIFIED") {
        return {
            kind: "verified",
            label: "Verified",
            explain: (name) => `${name} runs this page, and ShipItHQ has checked it.`,
            canReceiveResults: true,
            showLogo: true,
        }
    }
    return {
        kind: "unverified",
        label: "Unverified",
        explain: (name) => `${name} runs this page, and ShipItHQ hasn't checked it yet. Practice only until it's verified.`,
        canReceiveResults: false,
        showLogo: true,
    }
}
