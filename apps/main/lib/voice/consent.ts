/*
 * The consent a student gives before a voice or typed interview (plan/voice
 * DoD 6). Stored word for word with the session, so it's a constant: changing it
 * changes what future sessions record, never what past ones agreed to.
 */

export const VOICE_CONSENT_TEXT =
    "I agree that this interview is recorded and transcribed by ShipItHQ and its speech provider, Sarvam, and that the transcript and an AI assessment of it are kept with my results."

export const TYPED_CONSENT_TEXT =
    "I agree that my written answers are kept with my results and assessed by AI."
