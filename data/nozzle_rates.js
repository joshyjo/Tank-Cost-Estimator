// =============================================================================
// NOZZLE_RATES.JS — Nozzle & Manhole Unit Rates
// =============================================================================
// Currency  : SGD (Singapore Dollars)
// Basis     : Estimated SE Asia market, Q1 2025
// Status    : ⚠ ASSUMED — calibrate against supplier quotes as received.
//
// Rates INCLUDE:
//   - Nozzle neck (forged or fabricated)
//   - ASME B16.5 Class 150 slip-on or weld-neck flange
//   - Reinforcing pad where required per API 650 §5.7
//   - Gasket, studs, nuts (one set)
//   - Fit-up and welding into shell or roof plate
//   - NDE of nozzle welds (PT or RT as applicable)
//
// Rates EXCLUDE:
//   - Nozzle internals (suction strainers, dip pipes)
//   - Nozzle external flanged connections beyond flange face
//   - Higher pressure class flanges (Class 300+)
//   - Special nozzle orientations or eccentric pads
//
// Last updated by : [Your name]
// Date of last update : 2025-01
// =============================================================================

const NOZZLE_RATES = {

  // Shell and roof nozzles by size band
  nozzle: {

    small: {
      // ≤ 4" NPS — small bore nozzles (drain, sample, gauge, vent, level)
      "CS":      800,
      "SS-304":  1600,
      "SS-316":  2000,
      "SS-316L": 2000
    },

    medium: {
      // 6" to 10" NPS — medium bore (inlet, outlet, overflow, pump suction)
      "CS":      2200,
      "SS-304":  4400,
      "SS-316":  5500,
      "SS-316L": 5500
    },

    large: {
      // 12" to 16" NPS — large bore (main inlet/outlet, emergency drain)
      "CS":      5500,
      "SS-304":  11000,
      "SS-316":  13800,
      "SS-316L": 13800
    }

  },

  // Manholes — access for inspection and maintenance
  manhole: {

    shell: {
      // Shell manhole: 20" or 24" nominal, with davit arm and quick-opening cover
      "CS":      13000,
      "SS-304":  26000,
      "SS-316":  32500,
      "SS-316L": 32500
    },

    roof: {
      // Roof manhole: 20" nominal, with cover, hinge, and locking device
      "CS":      9000,
      "SS-304":  18000,
      "SS-316":  22500,
      "SS-316L": 22500
    }

  }

};
