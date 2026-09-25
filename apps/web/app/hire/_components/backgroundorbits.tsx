"use client"

export const BackgroundOrbits = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
            
            <div className="absolute h-[600px] w-[600px] border border-neutral-200 dark:border-neutral-800 rounded-full opacity-40" />
            <div className="absolute h-[800px] w-[800px] border border-neutral-200 dark:border-neutral-800 rounded-full opacity-40" />
            <div className="absolute h-[1000px] w-[1000px] border border-neutral-200 dark:border-neutral-800 rounded-full opacity-30" />
            <div className="absolute h-[1200px] w-[1200px] border border-neutral-200 dark:border-neutral-800 rounded-full opacity-20" />
            
            <div className="absolute h-[500px] w-[500px] bg-neutral-100 dark:bg-neutral-900 rounded-full blur-[100px] opacity-50 mix-blend-multiply dark:mix-blend-normal" />
        </div>
    )
}