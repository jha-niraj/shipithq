import { redirect } from "next/navigation"

// Spark is /jobs (plan/jobs JB-18, kept by Niraj 2026-09-26 in HR-20); old links land there.
export default function SparkPage() {
    redirect("/jobs")
}
