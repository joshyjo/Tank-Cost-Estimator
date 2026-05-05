// =============================================================================
// DEFAULT_NOZZLE_SCHEDULE.JS — Auto-populated Nozzle Counts by Tank Diameter
// =============================================================================
// These quantities represent a TYPICAL new-build process storage tank.
// Users can override them on Step 3 of the estimator.
//
// When to update this file:
//   - If your typical project scope changes (e.g. you frequently do fuel tanks
//     with fewer nozzles, or chemical tanks with more sample/drain points).
//   - Do NOT reduce quantities below the practical minimum for API 650 tanks.
//
// Nozzle size band definitions (must match NOZZLE_RATES.JS):
//   shell_small  : Shell nozzles, ≤ 4" NPS
//   shell_medium : Shell nozzles, 6" – 10" NPS
//   shell_large  : Shell nozzles, 12" – 16" NPS
//   shell_mh     : Shell manholes, 20" or 24"
//   roof_small   : Roof nozzles, ≤ 4" NPS (vents, gauges, sample, fill)
//   roof_mh      : Roof manholes, 20"
//
// Last updated by : [Your name]
// Date of last update : 2025-01
// =============================================================================

const DEFAULT_NOZZLE_SCHEDULE = [

  {
    // Tanks with nominal diameter LESS THAN 10 m
    label: "D < 10 m",
    maxDiameter: 10,
    nozzles: {
      shell_small:  4,
      shell_medium: 2,
      shell_large:  0,
      shell_mh:     1,
      roof_small:   3,
      roof_mh:      1
    }
  },

  {
    // Tanks with nominal diameter 10 m up to (but not including) 20 m
    label: "10 m ≤ D < 20 m",
    maxDiameter: 20,
    nozzles: {
      shell_small:  5,
      shell_medium: 3,
      shell_large:  1,
      shell_mh:     1,
      roof_small:   4,
      roof_mh:      1
    }
  },

  {
    // Tanks with nominal diameter 20 m up to (but not including) 40 m
    label: "20 m ≤ D < 40 m",
    maxDiameter: 40,
    nozzles: {
      shell_small:  6,
      shell_medium: 4,
      shell_large:  2,
      shell_mh:     2,
      roof_small:   4,
      roof_mh:      1
    }
  },

  {
    // Tanks with nominal diameter 40 m or greater
    label: "D ≥ 40 m",
    maxDiameter: Infinity,
    nozzles: {
      shell_small:  8,
      shell_medium: 5,
      shell_large:  3,
      shell_mh:     2,
      roof_small:   5,
      roof_mh:      2
    }
  }

];
