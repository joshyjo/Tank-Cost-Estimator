// =============================================================================
// REPAIR_RATES.JS — Repair & Retrofit Specific Cost Rates
// =============================================================================
// Currency  : SGD (Singapore Dollars)
// Basis     : Estimated SE Asia market, Q1 2025
// Status    : ⚠ ASSUMED — calibrate against completed repair projects.
// Last updated by : [Your name]
// Date of last update : 2025-01
//
// MATERIAL rates for repair use the same COST_RATES.plate[] entries as new-build.
// Rates in this file cover repair-specific items not in cost_rates.js.
// =============================================================================

const REPAIR_RATES = {

  // ---------------------------------------------------------------------------
  // MOBILISATION  (applied to total direct scope cost before scaffolding)
  // ---------------------------------------------------------------------------
  mobilisation: {
    pct: 0.01,       // 1% of direct scope cost
    min:  5000,      // SGD — minimum charge
    max: 15000       // SGD — maximum charge (cap)
  },

  // ---------------------------------------------------------------------------
  // SCAFFOLDING
  // Erect + dismantle combined in a single rate.
  // Scaffolder manhours are computed separately in labour section of cost_rates.js.
  // ---------------------------------------------------------------------------
  scaffolding: {
    external: {
      width:            2,   // m — default band width around tank perimeter
      perM3:           10,   // SGD/m3 — scaffold tube/coupler hire + materials
      platformPerM2:    8,   // SGD/m2 — working platform boards + guardrail hire
      platformInterval: 2    // m — one working platform every 2 m of height
    },
    internal: {
      perM3:           13    // SGD/m3 — tower scaffold hire + materials inside tank
    },
    // Maximum scaffold height for IFR/EFR works (R01,R02,R03,R08).
    // IFR/EFR deck is at low level — scaffold only needs to reach ~4 m.
    // Editable via cost input page (stored in localStorage).
    ifrEfrMaxScaffoldHeight: 4   // m — default 4 m
  },

  // ---------------------------------------------------------------------------
  // TANK JACKING (full bottom replacement only)
  // Cost scales with tank perimeter — more jacks needed for larger tanks.
  // ---------------------------------------------------------------------------
  jacking: {
    baseLumpSum:        15000,   // SGD — equipment mobilisation, supervision
    perMCircumference:    800    // SGD/m of tank circumference (pi x D)
  },

  // ---------------------------------------------------------------------------
  // REPAIR SHOP FABRICATION PREMIUM
  // Applied on top of new-build fabrication rates (COST_RATES.fabrication).
  // Repair work is small-batch; set-up costs are proportionally higher.
  // ---------------------------------------------------------------------------
  repairShopPremium: 0.05,   // 5% premium over new-build fab rate

  // ---------------------------------------------------------------------------
  // CATHODIC PROTECTION  (API 651 — sacrificial anode system)
  // ---------------------------------------------------------------------------
  cp: {
    anodeWeightKg:   5.0,    // kg per standard magnesium anode
    m2PerAnode:     20,      // m2 of protected surface per anode (conservative)
    materialPerKg:  25,      // SGD/kg of anode material (magnesium alloy)
    shellProtectionHeight: 0.30   // m of lower shell height when 'bottomAndShell' selected
  },

  // ---------------------------------------------------------------------------
  // VENTING UPGRADES  (vendor supply + site installation)
  // ---------------------------------------------------------------------------
  venting: {
    pvVent: {
      supply:          3500,   // SGD/unit — CS body
      supplyPremiumSS: 0.60    // additional fraction for SS body (total = supply x 1.60)
    },
    emergencyVent: {
      supply:          4500,   // SGD/unit — CS body
      supplyPremiumSS: 0.60
    }
  },

  // ---------------------------------------------------------------------------
  // STILLING WELL  (perforated pipe, floor to roof nozzle)
  // Schedule 40 pipe weight per metre (kg/m).
  // ---------------------------------------------------------------------------
  stillingWell: {
    pipeWeightKgPerM: {
      '6in':  28.26,
      '8in':  42.55,
      '10in': 60.29,
      '12in': 73.88
    },
    // Material supply rate (SGD/tonne) — pipe costs more than plate per tonne
    materialRatePerTonne: {
      CS: 2200,
      SS: 6800
    }
  },

  // ---------------------------------------------------------------------------
  // IFR / EFR REPAIR  (sub-scope parameters)
  // ---------------------------------------------------------------------------
  ifrRepair: {
    deckThicknessMm:       6,     // mm — representative IFR/EFR deck plate
    pontoonThicknessMm:    6,     // mm — pontoon shell and top plate
    pontoonFractionOfArea: 0.15,  // pontoon approx 15% of total IFR floor area
    legWeightKg:          18,     // kg per support leg (NPS3 Sch40 pipe + pads, ~0.5m)
    bleederVentSupply:   450,     // SGD/unit — vendor supply
    vacuumBreakerSupply: 550      // SGD/unit — vendor supply
  },

  // ---------------------------------------------------------------------------
  // STRUCTURAL ADDITIONS  (R12)
  // ---------------------------------------------------------------------------
  structural: {
    windGirderKgPerM:  30,    // kg/m of circumference per ring (built-up tee section)
    spiralStairKgPerM: 220,   // kg/m of shell height
    cageLadderKgPerM:   50,   // kg/m of shell height
    platformKgPerM:     30    // kg/m of circumference (grating + handrail + supports)
  }

};
