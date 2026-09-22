import { getSession } from "@repo/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getCoverLetters } from "@/actions/(main)/ai/cover-letter.action"
import { CoverLetterClient } from "@/app/(main)/ai/resume/_components/cover-letter-client"

export const metadata = {
    title: "Cover Letter Generator | ShipItHQ",
    description: "Generate tailored cover letters for any job posting using AI.",
}

export default async function CoverLetterPage(props: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const session = await getSession(headers())
    const user = session?.user

    if (!user) {
        redirect("/signin")
    }

    const result = await getCoverLetters()
    const coverLetters = result.success ? (result.coverLetters ?? []) : []

    const sp = await props.searchParams
    const selectedId = sp?.id as string | undefined

    return (
        <div className="w-full px-page py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Cover Letter Generator</h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Paste a job URL and we&apos;ll craft a tailored cover letter using your profile data.</p>
            </div>
            <CoverLetterClient
                initialCoverLetters={coverLetters}
                selectedId={selectedId}
            />
        </div>
    )
}