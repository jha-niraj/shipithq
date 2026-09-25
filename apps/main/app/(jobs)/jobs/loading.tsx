// The swipe deck's skeleton lives in components/spark-skeleton.tsx, shared with
// the other Spark route and the pages' Suspense fallbacks (plan/ui-pass UI-12).
import { SparkSkeleton } from "@/app/(jobs)/jobs/components/spark-skeleton"

export default function Loading() {
    return <SparkSkeleton />
}
