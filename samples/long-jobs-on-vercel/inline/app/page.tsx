import { InlineCard } from "@/components/inline-card"

export default function Page() {
    return (
        <main>
            <h1>Long jobs on Vercel</h1>
            <p className="muted">A weekly report in 10 steps of 15 seconds: 150 seconds of work.</p>
            <div className="cards">
                <InlineCard />
            </div>
        </main>
    )
}
