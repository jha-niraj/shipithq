"use client"

const Integrations = ["GitHub", "GitLab", "Jira", "Slack", "Linear", "Notion", "Greenhouse", "Lever", "Workday"]

export default function IntegrationMarquee() {
    return (
        <section className="py-20 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
            <div className="max-w-7xl mx-auto px-6 text-center mb-10">
                <p className="text-sm font-mono uppercase tracking-widest text-neutral-500">
                    Seamless Integration Protocol
                </p>
            </div>
            <div className="relative flex overflow-x-hidden group">
                <div className="animate-marquee whitespace-nowrap flex items-center">
                    {
                        Integrations.map((item, i) => (
                            <div key={i} className="mx-8 flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity cursor-default">
                                <span className="text-xl font-bold text-neutral-900 dark:text-white">{item}</span>
                            </div>
                        ))
                    }
                    {
                        Integrations.map((item, i) => (
                            <div key={`dup-${i}`} className="mx-8 flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity cursor-default">
                                <span className="text-xl font-bold text-neutral-900 dark:text-white">{item}</span>
                            </div>
                        ))
                    }
                </div>
                <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white dark:from-neutral-950 to-transparent z-10" />
                <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white dark:from-neutral-950 to-transparent z-10" />
            </div>

            {/* eslint-disable-next-line react/no-unknown-property */}
            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
            `}</style>
        </section>
    )
}