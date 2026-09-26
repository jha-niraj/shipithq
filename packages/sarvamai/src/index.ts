// @repo/sarvamai: every call ShipItHQ makes to Sarvam (plan/voice).
//
// Import the part you need, so a speech route doesn't bundle the Doc AI unzip code:
//   @repo/sarvamai/speech   speech to text, text to speech
//   @repo/sarvamai/docai    Doc AI digitisation (OCR)
//   @repo/sarvamai/agents   Voice Agents: signed session URLs and transcripts
export * from "./docai"
export * from "./speech"
export * from "./agents"
