/**
 * A price for display, in rupees or dollars. Server-safe: the /hire and /uni plan cards both use it,
 * and /uni's are a server component (a client module's function cannot be called from the server).
 */
export type Currency = "INR" | "USD"

export function money(n: number, c: Currency) {
    return c === "INR" ? `₹${n.toLocaleString("en-IN")}` : `$${n.toLocaleString("en-US")}`
}
