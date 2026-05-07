// =============================================================================
// COST_RATES.JS  — UPDATE THIS FILE TO CHANGE ALL ESTIMATE RATES
// =============================================================================
// Currency  : SGD (Singapore Dollars)
// Basis     : Estimated SE Asia market, Q1 2025
// Status    : ⚠ ASSUMED — NOT YET VALIDATED AGAINST COMPLETED PROJECT DATA
//             Calibrate against completed projects to improve estimate accuracy.
// Last updated by : [Your name]
// Date of last update : 2025-01
// =============================================================================

const COST_RATES = {

  // ---------------------------------------------------------------------------
  // A. PLATE MATERIAL SUPPLY  (SGD / tonne, delivered to fabrication yard)
  // ---------------------------------------------------------------------------
  plate: {
    "CS-A36":       1350,
    "CS-A516-60":   1500,
    "CS-A516-70":   1600,
    "SS-304":       4500,
    "SS-316":       6000,
    "SS-316L":      6300
  },

  // ---------------------------------------------------------------------------
  // B. FABRICATION  (SGD / tonne, ex-fabrication yard, Malaysia)
  // ---------------------------------------------------------------------------
  fabrication: {
    shell:          { CS: 1800, SS: 3200 },
    coneRoof:       { CS: 2200, SS: 3600 },
    domeRoof:       { CS: 2600, SS: 4000 },
    bottom:         { CS: 1800, SS: 3200 },
    structural:     { CS: 2000, SS: 3500 },
    ifrPontoon:     { CS: 2800 },
    ifrFullContact: { CS: 3200 },
    efrSingleDeck:  { CS: 2800 },
    efrDoubleDeck:  { CS: 3800 },
    // Premium applied to roof fabrication only when non-frangible joint specified.
    // A non-frangible roof requires a heavier compression ring, reinforced top angle,
    // and additional weld inspection. Applied as a multiplier on roof fab cost.
    nonFrangiblePremium: 0.07   // 7% additional on outer roof fabrication cost
  },

  // ---------------------------------------------------------------------------
  // C. ALUMINUM GEODESIC DOME  (SGD / m² of dome surface area)
  // ---------------------------------------------------------------------------
  // Vendor-supplied and vendor-installed package.
  // External painting NOT applied to aluminium dome surface.
  aluminumDome: {
    supplyAndInstall: 420
  },

  // ---------------------------------------------------------------------------
  // D. SITE ERECTION, Singapore  (SGD / tonne of steel erected)
  // ---------------------------------------------------------------------------
  erection: {
    traditional: { CS: 1300, SS: 1800 },
    jacking: {
      CS: 1000,
      SS: 1400,
      mobilisationLumpSum: 30000
    }
  },

  // ---------------------------------------------------------------------------
  // E. PAINTING & COATING  (SGD / m² of treated surface area)
  // ---------------------------------------------------------------------------
  painting: {

    internal: {
      none:         0,
      epoxy2coat:   35,     // Blast SA 2.5 + epoxy primer + 1 epoxy topcoat
      glassFlake:   58,     // Blast SA 2.5 + glass-flake epoxy (chemical service)
      passivation:  8       // SS acid pickling + passivation — no paint
    },

    // Shell exterior. Vertical surface — standard access rates.
    externalShell: {
      none:     0,
      standard: 22,         // Blast SA 2.5 + 1 primer + 2 finish coats
      premium:  30          // Blast SA 2.5 + primer + stripe coat + topcoat
    },

    // Fixed roof exterior. Horizontal/sloped — harder to blast and coat.
    // Rate is intentionally higher than shell to reflect access difficulty.
    externalRoof: {
      none:     0,
      standard: 28,
      premium:  38
    },

    // Floating roof top deck — weather-exposed face (EFR or IFR)
    floatingRoofTop: {
      CS: 25               // SGD/m² — blast + 2-coat external system
    },

    // Floating roof underside — product-contact face (EFR or IFR)
    floatingRoofUnderside: {
      CS: 35               // SGD/m² — blast + 2-coat internal epoxy equivalent
    }

  },

  // ---------------------------------------------------------------------------
  // F. FREIGHT  (SGD)
  // ---------------------------------------------------------------------------
  freight: {
    mysSg:   { lumpSum: 5000, perTonne: 160 },
    localSg: { lumpSum: 0,    perTonne: 80  },
    none:    { lumpSum: 0,    perTonne: 0   }
  },

  // ---------------------------------------------------------------------------
  // G. HYDROSTATIC TEST
  // ---------------------------------------------------------------------------
  hydrotest: {
    lumpSum:        8000,
    perCubicMetre:  0.80
  },

  // ---------------------------------------------------------------------------
  // H. ACCESSORIES & STRUCTURAL APPURTENANCES
  // ---------------------------------------------------------------------------
  accessories: {

    spiralStair: {
      // Spiral staircase: chequered plate treads, handrail both sides,
      // intermediate landings every 6 m of height.
      lumpSum:        2500,   // SGD — bottom slab and top connection
      perMeterHeight: 1800    // SGD/m of shell height
    },

    cageLadder: {
      // Vertical cage ladder with safety cage, toe boards, rest platforms every 6 m.
      lumpSum:        800,
      perMeterHeight: 650
    },

    roofPlatform: {
      // Perimeter walkway at tank top (shell rim or fixed roof).
      // Includes: handrail both sides, chequered grating, kick plate.
      // Applied to all fixed-roof tanks and EFR tanks (shell-top access).
      perMeterCircumference: 850    // SGD/m of tank circumference (π × D)
    },

    anchorChair: {
      // Welded anchor chair, including: chair plate, gussets, bolt pocket, grout hole.
      // Quantity determined automatically by API 650 Appendix B wind uplift check.
      perUnit_CS: 1800,
      perUnit_SS: 3200
    },

    dripRing: {
      // 50×50×6 mm continuous angle welded to shell at bottom annular plate level.
      // Deflects rainwater away from the bottom plate edge. Included automatically.
      perMeterCircumference: 90     // SGD/m of tank circumference
    },

    rollingLadder: {
      // EFR only. Wheeled self-levelling ladder running on guide rails from
      // shell-top platform down to the EFR deck surface.
      // Travel length = shell height × 1.155 (30° incline from vertical).
      lumpSum:        8000,
      perMeterTravel: 1200
    }

  },

  // ---------------------------------------------------------------------------
  // I. RIM SEAL SYSTEM  (SGD / m of tank circumference = π × D)
  // ---------------------------------------------------------------------------
  // Applies to all tanks with a floating roof (IFR or EFR).
  // Rates include: seal elements, mounting hardware, installation.
  rimSeal: {
    primary:          { IFR: 750,  EFR: 900  },  // Mechanical shoe seal only
    primarySecondary: { IFR: 1250, EFR: 1500 }   // Primary shoe + secondary wiper/foam
  },

  // ---------------------------------------------------------------------------
  // J. FIRE PROTECTION SYSTEM PIPING  (per SS 532 fluid classification)
  // ---------------------------------------------------------------------------
  // Scope boundary: top-of-shell foam/water ring header, vertical supply pipe
  // down outside of shell, isolation valve, and flanged tie-in connection at
  // tank shell bottom. Main fire water/foam ring main is EXCLUDED.
  //
  // Rates include: CS pipe, fittings, clamps, foam pourers or spray nozzles,
  //                isolation valve, flanged end connection, installation.
  //
  // SS 532 Classes:
  //   Class 0   : Compressed/liquefied flammable gas (LPG, LNG) — OUT OF SCOPE
  //   Class I   : Flash point < 23°C  (petrol, naphtha, crude, aviation fuel)
  //   Class II  : Flash point ≥ 23°C and < 60°C  (kerosene, diesel, jet A-1)
  //   Class III : Flash point ≥ 60°C and ≤ 150°C  (fuel oil, lubrication oil)
  //   Class IV  : Flash point > 150°C or non-flammable — no fixed fire system
  fireProtection: {

    classI: {
      // Full fixed foam system — foam pourers at min. 1 per 9 m circumference (min 2)
      lumpSum:               8000,
      perMeterHeight:         350,   // Vertical supply pipe down shell exterior
      perMeterCircumference:  480    // Ring header + foam pourers
    },

    classII: {
      // Standard fixed foam system — lighter pourer density than Class I
      lumpSum:               6000,
      perMeterHeight:         300,
      perMeterCircumference:  400
    },

    classIII: {
      // Fixed water cooling ring at shell top — spray nozzles
      lumpSum:               4000,
      perMeterHeight:         220,
      perMeterCircumference:  280
    },

    efrRimInjection: {
      // Additional rim-seal foam injection for EFR tanks storing Class I or Class II.
      // Installed in addition to the main foam system above.
      perMeterCircumference: 520
    }

  }

};
// =============================================================================
// LABOUR — Manhour rates for repair & retrofit works
// =============================================================================
// These rates are separate from fabrication ($/tonne) used in new-build.
// Repair labour is costed as: quantity × unit manhours × trade rate.
//
// BASIS FOR UNIT MANHOURS:
//   Welder productivity: 60 mm/min/pass (site butt welds, per user specification).
//   Representative plate thicknesses assumed:
//     Shell 8 mm → 2 passes → effective weld rate 30 mm/min
//     Bottom/Roof 6 mm → 2 passes → effective weld rate 30 mm/min
//   Weld length per tonne derived from plate dimensions.
//   Fitter, Rigger, Foreman, Helper set as ratios of WLD hours based on
//   typical crew composition for repair work in SE Asia.
//
// UPDATE THESE VALUES when productivity data from completed repair jobs is available.
// =============================================================================

COST_RATES.labour = {

  // ---------------------------------------------------------------------------
  // UNIT MANHOURS per scope quantity (direct trades only)
  // Banksman excluded per project scope decision.
  // ---------------------------------------------------------------------------
  unitMH: {

    // Shell plate replacement/repair — per tonne of new plate
    // Basis: 8mm plate, ~340 m weld/tonne, 2 passes, 60mm/min → ~19 WLD MH/t
    shellRepair:         { WLD: 19, FTR: 14, RIG:  6, FMN: 4, HLP: 3 },

    // Bottom plate replacement — per tonne of new plate
    // Basis: 6mm plate, ~440 m weld/tonne, 2 passes, 60mm/min → ~25 MH raw.
    // Horizontal downhand welding is faster; adjusted to 17 MH/t.
    bottomRepair:        { WLD: 17, FTR: 13, RIG:  5, FMN: 3, HLP: 3 },
    bottomFullReplace:   { WLD: 20, FTR: 15, RIG:  6, FMN: 4, HLP: 4 }, // includes old bottom removal

    // Cone/dome roof replacement — per tonne of new plate
    // Slant cuts and overhead positioning increase time over shell work.
    roofRepair:          { WLD: 21, FTR: 16, RIG:  7, FMN: 4, HLP: 3 },

    // Floating roof removal — per tonne (no new welding; torch cutting + lift)
    floatRoofRemove:     { WLD:  0, FTR:  3, RIG:  4, FMN: 2, HLP: 4 },

    // New IFR installation into existing fixed-roof tank — per tonne
    floatRoofAddIFR:     { WLD: 19, FTR: 14, RIG:  5, FMN: 3, HLP: 3 },

    // IFR/EFR deck patch or pontoon repair — per tonne of new plate
    floatRoofRepairDeck: { WLD: 19, FTR: 14, RIG:  5, FMN: 3, HLP: 3 },

    // Support leg replacement — per leg (weld on base + top stub)
    legReplace:          { WLD:  4, FTR:  3, RIG:  1, FMN: 1, HLP: 1 },

    // Nozzle cut-in to existing shell — per unit, by size band
    nozzleCutIn: {
      small:   { WLD:  8, FTR:  6, RIG: 2, FMN: 1, HLP: 2 },  // <=4" NPS
      medium:  { WLD: 14, FTR: 10, RIG: 3, FMN: 2, HLP: 2 },  // 6"-10" NPS
      large:   { WLD: 22, FTR: 16, RIG: 4, FMN: 3, HLP: 3 },  // 12"-16" NPS
      manhole: { WLD: 28, FTR: 20, RIG: 5, FMN: 4, HLP: 3 }   // 20"/24" manhole
    },

    // Rim seal remove and replace — per metre of tank circumference
    rimSealRR:     { FTR: 1.0, FMN: 0.2, HLP: 0.5 },  // no cutting welds

    // Stilling well installation — per metre of pipe length
    stillingWell:  { WLD: 2.0, FTR: 2.0, RIG: 1.0, FMN: 0.5, HLP: 1.0 },

    // Cathodic protection anode installation — per anode
    cpAnode:       {            FTR: 1.5,             FMN: 0.3, HLP: 1.0 },

    // Vent installation — per unit
    ventInstall:   { WLD: 3.0, FTR: 2.0, RIG: 1.0, FMN: 0.5, HLP: 1.0 },

    // Wind girder ring addition — per tonne
    windGirder:    { WLD: 18,  FTR: 14,  RIG:  5,  FMN: 3,   HLP: 3   },

    // Staircase addition — per metre of shell height
    stairAdd:      { WLD:  8,  FTR:  6,  RIG:  2,  FMN: 1,   HLP: 2   },

    // Roof/shell-top platform addition — per metre of circumference
    platformAdd:   { WLD:  6,  FTR:  5,  RIG:  2,  FMN: 1,   HLP: 2   },

    // Aluminium dome installation supervision — per tonne (vendor installs; site supervision)
    alumDomeInstall: {          FTR: 8,   RIG:  6,  FMN: 3,   HLP: 4   }
  },

  // ---------------------------------------------------------------------------
  // TRADE RATES  (SGD/hr — all-in subcontractor rates including overhead & margin)
  // ---------------------------------------------------------------------------
  rates: {
    WLD: 28,   // Welder
    FTR: 24,   // Fitter
    RIG: 22,   // Rigger
    SCF: 20,   // Scaffolder
    FMN: 32,   // Foreman
    HLP: 15,   // Helper / Labourer
    IND: 35    // Indirect labour — blended rate (Safety Officer, QC Inspector)
  },

  // ---------------------------------------------------------------------------
  // SITE INSTALLATION MANHOURS per scope quantity
  // These are IN ADDITION to shop fabrication MH (unitMH) above.
  // Applies to steel work assembled/welded at site.
  // Scopes with BOTH shop + site MH: R01,R03,R04,R05,R06,R07,R09,R12,R13,R15
  // Scopes with ONLY site MH (no shop fab component): R02,R08,R10,R11,R14
  // ---------------------------------------------------------------------------
  siteMH: {

    // Shell plate replacement — per tonne erected at site
    shellRepair:         { WLD: 12, FTR: 10, RIG:  8, FMN: 3, HLP: 4 },

    // Bottom plate replacement — per tonne laid at site
    bottomRepair:        { WLD: 10, FTR:  8, RIG:  6, FMN: 2, HLP: 4 },
    bottomFullReplace:   { WLD: 14, FTR: 10, RIG:  8, FMN: 3, HLP: 5 },

    // Cone/dome roof — per tonne erected at site
    roofRepair:          { WLD: 14, FTR: 10, RIG:  8, FMN: 3, HLP: 4 },

    // Floating roof removal at site — per tonne (cutting + rigging only)
    floatRoofRemove:     { WLD:  2, FTR:  4, RIG:  6, FMN: 2, HLP: 5 },

    // IFR/EFR assembly and installation at site — per tonne
    floatRoofAddIFR:     { WLD: 12, FTR: 10, RIG:  6, FMN: 3, HLP: 4 },

    // IFR/EFR deck patch or repair at site — per tonne
    floatRoofRepairDeck: { WLD: 12, FTR: 10, RIG:  6, FMN: 3, HLP: 4 },

    // Support leg replacement at site — per leg
    legReplace:          { WLD:  3, FTR:  3, RIG:  2, FMN: 1, HLP: 2 },

    // Nozzle cut-in at site — per unit by size band
    nozzleCutIn: {
      small:   { WLD:  6, FTR:  5, RIG: 2, FMN: 1, HLP: 2 },
      medium:  { WLD: 10, FTR:  8, RIG: 3, FMN: 2, HLP: 3 },
      large:   { WLD: 16, FTR: 12, RIG: 5, FMN: 3, HLP: 4 },
      manhole: { WLD: 20, FTR: 15, RIG: 6, FMN: 4, HLP: 4 }
    },

    // Rim seal removal + reinstall at site — per metre of circumference
    rimSealRR:     { FTR: 1.2, FMN: 0.3, HLP: 0.8 },

    // Stilling well installation at site — per metre of pipe length
    stillingWell:  { WLD: 1.5, FTR: 1.5, RIG: 1.0, FMN: 0.5, HLP: 1.0 },

    // CP anode installation at site — per anode
    cpAnode:       {            FTR: 1.5,             FMN: 0.3, HLP: 1.0 },

    // Vent installation at site — per unit
    ventInstall:   { WLD: 2.5, FTR: 2.0, RIG: 1.0, FMN: 0.5, HLP: 1.0 },

    // Wind girder addition at site — per tonne
    windGirder:    { WLD: 14,  FTR: 10,  RIG:  8,  FMN: 3,   HLP: 4   },

    // Staircase/ladder addition at site — per metre of shell height
    stairAdd:      { WLD:  6,  FTR:  5,  RIG:  3,  FMN: 1,   HLP: 2   },

    // Roof/shell-top platform addition at site — per metre of circumference
    platformAdd:   { WLD:  5,  FTR:  4,  RIG:  3,  FMN: 1,   HLP: 2   },

    // Aluminium dome — vendor installs; site supervision + rigging only
    alumDomeInstall: {          FTR: 6,   RIG:  8,  FMN: 3,   HLP: 4   }
  },

  // ---------------------------------------------------------------------------
  // INDIRECT LABOUR RATIO
  // Indirect MH = indirectPct x total direct MH.
  // Covers Safety Officer, QC Inspector time.
  // ---------------------------------------------------------------------------
  indirectPct: 0.25,   // 25% indirect

  // ---------------------------------------------------------------------------
  // SCAFFOLDER MANHOURS  (erect + dismantle, from scaffold volume/area)
  // ---------------------------------------------------------------------------
  scfMHperM3: 0.125,   // SCF MH per m3 of scaffold volume
  scfMHperM2: 0.167    // SCF MH per m2 of working platform
};
