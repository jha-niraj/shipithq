// Server-side CSS imports are inert, as the Next bundler makes them. Import
// AFTER the tsx loader: tsx replaces the CommonJS .css handler when it registers.
import Module from "node:module"
Module._extensions[".css"] = (m) => { m.exports = {} }
