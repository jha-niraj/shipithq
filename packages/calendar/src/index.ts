// @repo/calendar - shared Bikram Sambat (BS) / AD calendar logic for Gurukul.
//
//   import { formatSchoolDate, formatAcademicYear, type SchoolCalendarSystem } from '@repo/calendar';
//   import { toNepalDateStr, nepalDayOfWeek } from '@repo/calendar';
//
// Pure functions only (BS<->AD via nepali-date-converter). No DB/React deps, so
// it is safe to consume from Next apps, the public API, and React Native.
export * from './calendar-system';
export * from './nepal-date';
export * from './academic-year-window';
export * from './birth-date';
