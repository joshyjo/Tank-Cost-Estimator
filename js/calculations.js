// =============================================================================
// CALCULATIONS.JS — API 650 Engineering Calculation Engine
// =============================================================================
// Reference: API 650, 12th Edition, Addendum 2
// Units: metres (dimensions), mm (thickness), tonnes (weight), MPa (stress)
// DO NOT EDIT unless you are confident with the API 650 design methodology.
// =============================================================================

const PI = Math.PI;
const STEEL_DENSITY    = 7.85;           // tonnes/m³
const STANDARD_COURSE_HEIGHT = 2.440;    // metres — standard 8-ft plate width
const STRUCTURAL_FACTOR      = 0.12;     // Wind girder + stiffeners ≈ 12% of shell weight
const BOTTOM_ANNULAR_OVERHANG = 0.6;     // metres
const IFR_CLEARANCE           = 0.15;    // metres — IFR rim to shell clearance
const CONE_SLOPE_RATIO        = 6;       // run:rise = 6 (≈9.5° slope)
const DOME_RADIUS_FACTOR      = 0.8;     // Crown radius = 0.8 × D
const SELF_SUPPORT_CONE_MAX_D = 12.0;    // metres — cones ≤ this diameter are self-supporting

// ---------------------------------------------------------------------------
// 1. MINIMUM SHELL THICKNESS  (API 650 Table 5-1)
// ---------------------------------------------------------------------------
function getMinShellThickness(D) {
  if (D < 15) return 5;
  if (D < 36) return 6;
  if (D < 60) return 8;
  return 10;
}

// ---------------------------------------------------------------------------
// 2. SHELL COURSES — API 650 §5.6.3 ONE-FOOT METHOD (METRIC)
// ---------------------------------------------------------------------------
// td = [4.9 × D × (H − 0.3) × G / Sd] + CA
// H is the design liquid level measured from the bottom of the course.
// ---------------------------------------------------------------------------
function designShell(D, H, G, materialKey, CA_shell) {
  const mat = MATERIALS[materialKey];
  if (!mat) throw new Error('Unknown material: ' + materialKey);

  const tMin    = getMinShellThickness(D);
  const courses = [];
  const numCourses = Math.ceil(H / STANDARD_COURSE_HEIGHT);

  for (let i = 0; i < numCourses; i++) {
    const elev_bot    = i * STANDARD_COURSE_HEIGHT;
    const elev_top    = Math.min((i + 1) * STANDARD_COURSE_HEIGHT, H);
    const courseH     = elev_top - elev_bot;
    const H_design    = H - elev_bot - 0.3;

    const t_calc = H_design > 0
      ? (4.9 * D * H_design * G / mat.Sd) + CA_shell
      : 0;

    const t_actual  = Math.max(t_calc, tMin, CA_shell);
    const t_ordered = Math.ceil(t_actual); // round up to nearest 1 mm

    const area   = PI * D * courseH;
    const weight = area * (t_ordered / 1000) * STEEL_DENSITY;

    courses.push({ number: i + 1, elevation: elev_bot, height: courseH,
                   t_calc, t_ordered, area, weight });
  }
  return courses;
}

function getShellWeight(courses) {
  return courses.reduce((sum, c) => sum + c.weight, 0);
}

function getStructuralWeight(shellWeight) {
  return shellWeight * STRUCTURAL_FACTOR;
}

// ---------------------------------------------------------------------------
// 3. BOTTOM PLATE  (API 650 §5.4 — min 6 mm + CA)
// ---------------------------------------------------------------------------
function getBottomArea(D) {
  const r = D / 2 + BOTTOM_ANNULAR_OVERHANG;
  return PI * r * r;
}

function getBottomThickness(CA_bottom) {
  return Math.max(6 + CA_bottom, 6);
}

function getBottomWeight(D, CA_bottom, materialKey) {
  const mat = MATERIALS[materialKey];
  const t_m = getBottomThickness(CA_bottom) / 1000;
  return getBottomArea(D) * t_m * (mat ? mat.density / 1000 : STEEL_DENSITY);
}

// ---------------------------------------------------------------------------
// 4. CONE ROOF  (API 650 §5.10.4)
// ---------------------------------------------------------------------------
// Assumption: D ≤ 12 m → self-supporting cone (no rafters, 6 mm min plate).
//             D >  12 m → rafter-supported cone (5 mm min plate, rafters in structural factor).
// This is an engineering determination based on common practice. The assumption
// is stated explicitly on the estimate output.
// ---------------------------------------------------------------------------
function isSelfSupportingCone(D) {
  return D <= SELF_SUPPORT_CONE_MAX_D;
}

function getConeMinThickness(D, CA) {
  return isSelfSupportingCone(D) ? Math.max(6 + CA, 6) : Math.max(5 + CA, 5);
}

function getConeRoofGeometry(D) {
  const run         = D / 2;
  const rise        = run / CONE_SLOPE_RATIO;
  const slantHeight = Math.sqrt(run * run + rise * rise);
  const area        = PI * run * slantHeight;
  return { run, rise, slantHeight, area };
}

function getConeRoofWeight(D, CA, materialKey) {
  const mat  = MATERIALS[materialKey];
  const t_mm = getConeMinThickness(D, CA);
  const t_m  = t_mm / 1000;
  const geo  = getConeRoofGeometry(D);
  return geo.area * t_m * (mat ? mat.density / 1000 : STEEL_DENSITY);
}

// ---------------------------------------------------------------------------
// 5. DOME ROOF — self-supporting  (API 650 §5.10.5)
//    Crown radius R = 0.8 × D  (within API 650 range of 0.8D – 1.5D)
// ---------------------------------------------------------------------------
function getDomeRoofGeometry(D) {
  const R    = D * DOME_RADIUS_FACTOR;
  const r    = D / 2;
  const h    = R - Math.sqrt(R * R - r * r);
  const area = 2 * PI * R * h;
  return { R, h, area };
}

function getDomeRoofWeight(D, CA, materialKey) {
  const mat  = MATERIALS[materialKey];
  const t_mm = Math.max(5 + CA, 5);
  const t_m  = t_mm / 1000;
  const geo  = getDomeRoofGeometry(D);
  return geo.area * t_m * (mat ? mat.density / 1000 : STEEL_DENSITY);
}

function getDomeRoofArea(D) { return getDomeRoofGeometry(D).area; }

// ---------------------------------------------------------------------------
// 6. ALUMINUM GEODESIC DOME  (vendor package — area only, no steel weight)
// ---------------------------------------------------------------------------
function getAlumDomeArea(D) { return getDomeRoofGeometry(D).area; }

// ---------------------------------------------------------------------------
// 7. INTERNAL FLOATING ROOF (IFR) — Carbon Steel
// ---------------------------------------------------------------------------
const IFR_KG_PER_M2 = {
  ifrPontoon:     35,   // CS pontoon — deck + perimeter pontoon + support legs
  ifrFullContact: 58    // CS full-contact — all-welded full-area deck
};

function getIFRFloorArea(D) {
  const r = D / 2 - IFR_CLEARANCE;
  return PI * r * r;
}

function getIFRWeight(D, ifrType) {
  const kgM2 = IFR_KG_PER_M2[ifrType];
  if (!kgM2) return 0;
  return getIFRFloorArea(D) * kgM2 / 1000;
}

// ---------------------------------------------------------------------------
// 8. EXTERNAL FLOATING ROOF (EFR) — Carbon Steel
// ---------------------------------------------------------------------------
const EFR_KG_PER_M2 = {
  efrSingle: 40,
  efrDouble: 70
};

function getEFRFloorArea(D) { return PI * (D / 2) * (D / 2); }

function getEFRWeight(D, efrType) {
  const kgM2 = EFR_KG_PER_M2[efrType];
  if (!kgM2) return 0;
  return getEFRFloorArea(D) * kgM2 / 1000;
}

// ---------------------------------------------------------------------------
// 9. SURFACE AREAS FOR PAINTING
// ---------------------------------------------------------------------------
function getPaintingAreas(D, H, outerRoof, internalPaintHeight) {
  const paintH = (internalPaintHeight > 0 && internalPaintHeight <= H)
               ? internalPaintHeight : H;

  const internalShell  = PI * D * paintH;
  const internalBottom = getBottomArea(D);
  const externalShell  = PI * D * H;

  let externalRoofArea = 0;
  if (outerRoof === 'coneCS') {
    externalRoofArea = getConeRoofGeometry(D).area;
  } else if (outerRoof === 'domeCS') {
    externalRoofArea = getDomeRoofArea(D);
  } else if (outerRoof === 'domeAL') {
    externalRoofArea = 0;   // Aluminium geodesic dome — vendor finish, not painted
  }
  // EFR and openTop have no fixed outer roof to paint

  return {
    internalShell,
    internalBottom,
    internalTotal:   internalShell + internalBottom,
    externalShell,
    externalRoofArea,
    paintH            // Actual height painted — for display on output
  };
}

function getFloatingRoofDeckArea(D, ifrType, efrType) {
  if (ifrType && ifrType !== 'none') return getIFRFloorArea(D);
  if (efrType) return getEFRFloorArea(D);
  return 0;
}

// ---------------------------------------------------------------------------
// 10. TANK CAPACITY
// ---------------------------------------------------------------------------
function getTankCapacity(D, H) { return PI * (D / 2) * (D / 2) * H; }

// ---------------------------------------------------------------------------
// 11. TOTAL CS STEEL WEIGHT (for erection and freight)
// ---------------------------------------------------------------------------
function getTotalCSWeight(shellW, structW, bottomW, outerRoofW, floatRoofW) {
  return shellW + structW + bottomW + outerRoofW + floatRoofW;
}

// ---------------------------------------------------------------------------
// 12. ANCHOR CHAIR CHECK — API 650 Appendix B (simplified)
// ---------------------------------------------------------------------------
// Checks whether wind overturning moment exceeds stabilising moments from
// liquid weight and tank dead weight. If so, calculates minimum anchor count.
// Uses LRFD approach per API 650 App B (0.9 factor on liquid weight).
// ---------------------------------------------------------------------------
function checkAnchorage(D, H, G, windSpeed, totalSteelWeightTonnes) {
  const rhoAir = 1.225;    // kg/m³
  const Cd     = 0.7;      // Drag coefficient for cylindrical shell
  const g      = 9.81;     // m/s²

  // Wind overturning moment at tank base
  const pw = 0.5 * rhoAir * windSpeed * windSpeed * Cd; // N/m²
  const Fw = pw * D * H;                                  // N — horizontal force on projected area
  const Mw = Fw * H / 2;                                  // N·m

  // Stabilising moment from liquid (0.9 factor per API 650 LRFD)
  const Wl = (PI / 4) * D * D * H * G * 1000 * g;       // N — total liquid weight
  const Ml = 0.9 * Wl * (D / 4);                          // N·m — acts at D/4 from centre

  // Stabilising moment from tank dead weight (acts at D/2)
  const Ws = totalSteelWeightTonnes * 1000 * g;           // N
  const Ms = Ws * (D / 2);                                 // N·m

  const required = Mw > (Ml + Ms);

  let count = 0;
  if (required) {
    const netUplift    = (Mw - Ml - Ms) * 2 / D;          // N — total uplift force
    const boltCapacity = 50000;                             // N per bolt — M24 Gr 5.8 approx
    const maxBySpacing = Math.floor(PI * D / 0.6);         // Min 600 mm bolt spacing
    count = Math.ceil(netUplift / boltCapacity);
    count = Math.max(count, 4);
    count = Math.min(count, maxBySpacing);
    if (count % 2 !== 0) count++;                          // Round to even number
  }

  return { required, count, Mw, Ml, Ms };
}

// ---------------------------------------------------------------------------
// 13. STAIR / LADDER RECOMMENDATION
// ---------------------------------------------------------------------------
// Returns one of: 'cageLadder_auto' | 'userChoice' | 'spiralStair_auto'
// ---------------------------------------------------------------------------
function getStairRecommendation(H) {
  if (H < 4)  return 'cageLadder_auto';
  if (H <= 6) return 'userChoice';
  return 'spiralStair_auto';
}

function getStairCost(H, stairType) {
  const acc = COST_RATES.accessories;
  if (stairType === 'spiralStair') {
    return acc.spiralStair.lumpSum + acc.spiralStair.perMeterHeight * H;
  }
  return acc.cageLadder.lumpSum + acc.cageLadder.perMeterHeight * H;
}

function getRoofPlatformCost(D) {
  return PI * D * COST_RATES.accessories.roofPlatform.perMeterCircumference;
}

// ---------------------------------------------------------------------------
// 14. ROLLING LADDER  (EFR only)
// ---------------------------------------------------------------------------
function getRollingLadderCost(H) {
  const travelLength = H * 1.155; // Ladder inclined at ~30° from vertical
  return COST_RATES.accessories.rollingLadder.lumpSum +
         COST_RATES.accessories.rollingLadder.perMeterTravel * travelLength;
}

// ---------------------------------------------------------------------------
// 15. DRIP RING  (all tanks, automatic)
// ---------------------------------------------------------------------------
function getDripRingCost(D) {
  return PI * D * COST_RATES.accessories.dripRing.perMeterCircumference;
}

// ---------------------------------------------------------------------------
// 16. ANCHOR CHAIR COST
// ---------------------------------------------------------------------------
function getAnchorChairCost(count, matType) {
  if (count === 0) return 0;
  const rate = matType === 'SS'
    ? COST_RATES.accessories.anchorChair.perUnit_SS
    : COST_RATES.accessories.anchorChair.perUnit_CS;
  return count * rate;
}

// ---------------------------------------------------------------------------
// 17. RIM SEAL COST
// ---------------------------------------------------------------------------
function getRimSealCost(D, rimSealType, ifrPresent, efrPresent) {
  if (!ifrPresent && !efrPresent) return 0;
  const circumference = PI * D;
  const rateKey = rimSealType === 'primarySecondary' ? 'primarySecondary' : 'primary';
  const floatKey = efrPresent ? 'EFR' : 'IFR';
  return circumference * COST_RATES.rimSeal[rateKey][floatKey];
}

// ---------------------------------------------------------------------------
// 18. FIRE PROTECTION COST  (SS 532 classification)
// ---------------------------------------------------------------------------
function getFireProtectionCost(D, H, fluidClass, isEFR) {
  if (!fluidClass || fluidClass === 'classIV' || fluidClass === 'none') {
    return { total: 0, lumpSum: 0, verticalPipe: 0, ringHeader: 0, rimInjection: 0 };
  }

  const fRates      = COST_RATES.fireProtection;
  const circumference = PI * D;
  const rates       = fRates[fluidClass];
  if (!rates) return { total: 0, lumpSum: 0, verticalPipe: 0, ringHeader: 0, rimInjection: 0 };

  const lumpSum     = rates.lumpSum;
  const verticalPipe = rates.perMeterHeight * H;
  const ringHeader  = rates.perMeterCircumference * circumference;
  const rimInjection = (isEFR && (fluidClass === 'classI' || fluidClass === 'classII'))
    ? fRates.efrRimInjection.perMeterCircumference * circumference
    : 0;

  return {
    total: lumpSum + verticalPipe + ringHeader + rimInjection,
    lumpSum, verticalPipe, ringHeader, rimInjection
  };
}

// ---------------------------------------------------------------------------
// 19. DEFAULT NOZZLE SCHEDULE LOOKUP
// ---------------------------------------------------------------------------
function getDefaultNozzleSchedule(D) {
  for (const band of DEFAULT_NOZZLE_SCHEDULE) {
    if (D < band.maxDiameter) return Object.assign({}, band.nozzles);
  }
  return Object.assign({}, DEFAULT_NOZZLE_SCHEDULE[DEFAULT_NOZZLE_SCHEDULE.length - 1].nozzles);
}

// ---------------------------------------------------------------------------
// 20. UTILITY
// ---------------------------------------------------------------------------
function roundTo(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}