import type { NextConfig } from "next"
import { withWorkflow } from "workflow/next"

const nextConfig: NextConfig = {}

// Compiles "use workflow" and "use step" functions into their own routes.
export default withWorkflow(nextConfig)
