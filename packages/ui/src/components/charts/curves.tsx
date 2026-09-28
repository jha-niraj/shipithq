/*
 * Curves for `Line`, re-exported so apps can pick one without depending on @visx/curve
 * (plan/home HOME-7). The default, `curveNatural`, overshoots: a single spike in mostly
 * zero data rings below zero. Counts and scores want `curveMonotoneX`, which never
 * overshoots its points.
 */
export { curveMonotoneX, curveNatural, curveLinear, curveStepAfter } from "@visx/curve"
