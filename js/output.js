// =============================================================================
// OUTPUT.JS — Cost Assembly and Estimate Rendering
// =============================================================================

function SGD(v) { return 'S$ ' + Math.round(v).toLocaleString('en-SG'); }

// ── Master Cost Assembly ──────────────────────────────────────────────────────
function assembleEstimate(state) {
  const D    = state.diameter;
  const H    = state.liquidHeight;
  const G    = state.specificGravity;
  const CA_S = state.corrosionAllowanceShell;
  const CA_B = state.corrosionAllowanceBottom;
  const matKey  = state.shellMaterial;
  const mat     = MATERIALS[matKey];
  const matType = mat.type; // 'CS' or 'SS'

  // ── 1. ENGINEERING QUANTITIES ─────────────────────────────────────────────
  const courses      = designShell(D, H, G, matKey, CA_S);
  const shellWeight  = getShellWeight(courses);
  const structWeight = getStructuralWeight(shellWeight);
  const bottomWeight = getBottomWeight(D, CA_B, matKey);
  const capacity     = getTankCapacity(D, H);

  // Outer roof
  let outerRoofWeight = 0;
  let outerRoofArea   = 0;
  let isAlumDome      = false;
  let coneIsSelfSupporting = false;

  if (state.outerRoof === 'coneCS') {
    outerRoofWeight      = getConeRoofWeight(D, CA_S, matKey);
    outerRoofArea        = getConeRoofGeometry(D).area;
    coneIsSelfSupporting = isSelfSupportingCone(D);
  } else if (state.outerRoof === 'domeCS') {
    outerRoofWeight = getDomeRoofWeight(D, CA_S, matKey);
    outerRoofArea   = getDomeRoofArea(D);
  } else if (state.outerRoof === 'domeAL') {
    isAlumDome    = true;
    outerRoofArea = getAlumDomeArea(D);
  }

  // Floating roof
  const ifrPresent   = state.ifrType && state.ifrType !== 'none';
  const efrPresent   = state.outerRoof === 'efr' && !!state.efrType;
  const hasFloatRoof = ifrPresent || efrPresent;
  let floatRoofWeight = 0;
  if (ifrPresent) floatRoofWeight = getIFRWeight(D, state.ifrType);
  else if (efrPresent) floatRoofWeight = getEFRWeight(D, state.efrType);

  const floatDeckArea = getFloatingRoofDeckArea(D, ifrPresent ? state.ifrType : null, efrPresent ? state.efrType : null);

  // Total CS steel weight (aluminium dome excluded — it's a vendor package)
  const totalSteelWeight = getTotalCSWeight(shellWeight, structWeight, bottomWeight, outerRoofWeight, floatRoofWeight);

  // ── 2. MATERIAL SUPPLY ────────────────────────────────────────────────────
  const plateCost   = COST_RATES.plate[matKey];
  const mat_shell   = shellWeight   * plateCost;
  const mat_struct  = structWeight  * plateCost;
  const mat_bottom  = bottomWeight  * plateCost;
  const mat_outerRoof  = isAlumDome ? 0 : outerRoofWeight * plateCost;
  const mat_floatRoof  = floatRoofWeight * plateCost;
  const mat_total   = mat_shell + mat_struct + mat_bottom + mat_outerRoof + mat_floatRoof;

  // ── 3. FABRICATION ────────────────────────────────────────────────────────
  const fabR = COST_RATES.fabrication;
  const fab_shell  = shellWeight  * fabR.shell[matType];
  const fab_struct = structWeight * fabR.structural[matType];
  const fab_bottom = bottomWeight * fabR.bottom[matType];

  let fab_outerRoof = 0;
  if (!isAlumDome) {
    if (state.outerRoof === 'coneCS') {
      fab_outerRoof = outerRoofWeight * fabR.coneRoof[matType];
      if (!state.frangibleRoof) fab_outerRoof *= (1 + fabR.nonFrangiblePremium);
    }
    if (state.outerRoof === 'domeCS') {
      fab_outerRoof = outerRoofWeight * fabR.domeRoof[matType];
      if (!state.frangibleRoof) fab_outerRoof *= (1 + fabR.nonFrangiblePremium);
    }
  }

  let fab_floatRoof = 0;
  if (state.ifrType === 'ifrPontoon')     fab_floatRoof = floatRoofWeight * fabR.ifrPontoon.CS;
  if (state.ifrType === 'ifrFullContact') fab_floatRoof = floatRoofWeight * fabR.ifrFullContact.CS;
  if (state.efrType === 'efrSingle')      fab_floatRoof = floatRoofWeight * fabR.efrSingleDeck.CS;
  if (state.efrType === 'efrDouble')      fab_floatRoof = floatRoofWeight * fabR.efrDoubleDeck.CS;

  const fab_total = fab_shell + fab_struct + fab_bottom + fab_outerRoof + fab_floatRoof;

  // ── 4. ALUMINUM DOME ──────────────────────────────────────────────────────
  const alumDomeCost = isAlumDome
    ? outerRoofArea * COST_RATES.aluminumDome.supplyAndInstall
    : 0;

  // ── 5. NOZZLES & MANHOLES ─────────────────────────────────────────────────
  const nR   = NOZZLE_RATES;
  const nozMatKey = matType === 'SS' ? matKey : 'CS';
  function nRate(cat, size) {
    const tbl = nR[cat][size];
    return tbl ? (tbl[nozMatKey] || tbl['CS'] || 0) : 0;
  }
  const noz = state.nozzles;
  const noz_ss  = noz.shell_small  * nRate('nozzle','small');
  const noz_sm  = noz.shell_medium * nRate('nozzle','medium');
  const noz_sl  = noz.shell_large  * nRate('nozzle','large');
  const noz_smh = noz.shell_mh     * nRate('manhole','shell');
  const noz_rs  = noz.roof_small   * nRate('nozzle','small');
  const noz_rmh = noz.roof_mh      * nRate('manhole','roof');
  const noz_total = noz_ss + noz_sm + noz_sl + noz_smh + noz_rs + noz_rmh;

  // ── 6. SITE ERECTION ──────────────────────────────────────────────────────
  const erectR    = COST_RATES.erection;
  const erectKey  = state.erectionMethod;
  const erect_steel = totalSteelWeight * erectR[erectKey][matType];
  const erect_mob   = erectKey === 'jacking' ? erectR.jacking.mobilisationLumpSum : 0;
  const erect_total = erect_steel + erect_mob;

  // ── 7. PAINTING & COATING ─────────────────────────────────────────────────
  const pAreas = getPaintingAreas(D, H, state.outerRoof, state.internalPaintHeight);
  const pR     = COST_RATES.painting;

  const paint_int_shell  = pAreas.internalShell  * pR.internal[state.internalCoating];
  const paint_int_bottom = pAreas.internalBottom * pR.internal[state.internalCoating];
  const paint_int        = paint_int_shell + paint_int_bottom;

  const paint_ext_shell  = pAreas.externalShell    * (pR.externalShell[state.externalCoating] || 0);
  const paint_ext_roof   = pAreas.externalRoofArea * (pR.externalRoof[state.externalCoating] || 0);
  const paint_ext        = paint_ext_shell + paint_ext_roof;

  // Floating roof paint
  let paint_float_top  = 0;
  let paint_float_btm  = 0;
  if (hasFloatRoof && state.floatingRoofPaint !== 'none') {
    if (state.floatingRoofPaint === 'topOnly' || state.floatingRoofPaint === 'both') {
      paint_float_top = floatDeckArea * pR.floatingRoofTop.CS;
    }
    if (state.floatingRoofPaint === 'undersideOnly' || state.floatingRoofPaint === 'both') {
      paint_float_btm = floatDeckArea * pR.floatingRoofUnderside.CS;
    }
  }
  const paint_total = paint_int + paint_ext + paint_float_top + paint_float_btm;

  // ── 8. ACCESSORIES ────────────────────────────────────────────────────────
  // Stair / ladder
  const stair_cost = getStairCost(H, state.stairType);

  // Roof platform: all fixed-roof tanks and EFR shell top
  const hasRoofPlatform = ['coneCS', 'domeCS', 'domeAL', 'efr'].includes(state.outerRoof);
  const platform_cost   = hasRoofPlatform ? getRoofPlatformCost(D) : 0;

  // Rolling ladder: EFR only
  const rolling_cost = efrPresent ? getRollingLadderCost(H) : 0;

  // Drip ring: all tanks
  const drip_cost = getDripRingCost(D);

  // Anchor chairs: API 650 App B check
  const anchorCheck = checkAnchorage(D, H, G, state.windSpeed, totalSteelWeight);
  const anchor_cost = getAnchorChairCost(anchorCheck.count, matType);

  const acc_total = stair_cost + platform_cost + rolling_cost + drip_cost + anchor_cost;

  // ── 9. RIM SEAL ───────────────────────────────────────────────────────────
  const rimSeal_cost = getRimSealCost(D, state.rimSealType, ifrPresent, efrPresent);

  // ── 10. FIRE PROTECTION ───────────────────────────────────────────────────
  const fireResult = getFireProtectionCost(D, H, state.fluidClass, efrPresent);
  const fire_total = fireResult.total;

  // ── 11. FREIGHT ───────────────────────────────────────────────────────────
  const fR = COST_RATES.freight[state.freightOption];
  const freight_total = fR.lumpSum + fR.perTonne * totalSteelWeight;

  // ── 12. HYDROSTATIC TEST ──────────────────────────────────────────────────
  const hR = COST_RATES.hydrotest;
  const hydrotest_total = hR.lumpSum + hR.perCubicMetre * capacity;

  // ── 13. SUBTOTAL ──────────────────────────────────────────────────────────
  const subtotal = mat_total + fab_total + alumDomeCost + noz_total + erect_total +
                   paint_total + acc_total + rimSeal_cost + fire_total +
                   freight_total + hydrotest_total;

  return {
    D, H, G, capacity, matKey, matType, mat,
    shellWeight, structWeight, bottomWeight, outerRoofWeight, floatRoofWeight,
    totalSteelWeight, outerRoofArea, floatDeckArea, isAlumDome,
    coneIsSelfSupporting, courses, pAreas,
    ifrPresent, efrPresent, hasFloatRoof, hasRoofPlatform,
    noz,
    mat_shell, mat_struct, mat_bottom, mat_outerRoof, mat_floatRoof, mat_total,
    fab_shell, fab_struct, fab_bottom, fab_outerRoof, fab_floatRoof, fab_total,
    alumDomeCost,
    noz_ss, noz_sm, noz_sl, noz_smh, noz_rs, noz_rmh, noz_total,
    erect_steel, erect_mob, erect_total,
    paint_int_shell, paint_int_bottom, paint_int,
    paint_ext_shell, paint_ext_roof, paint_ext,
    paint_float_top, paint_float_btm, paint_total,
    stair_cost, platform_cost, rolling_cost, drip_cost, anchor_cost, anchorCheck, acc_total,
    rimSeal_cost,
    fireResult, fire_total,
    freight_total, hydrotest_total, subtotal
  };
}

// ── Labels ───────────────────────────────────────────────────────────────────
const LABELS = {
  outerRoof: {
    coneCS:'Fixed Cone Roof (CS)', domeCS:'Fixed Dome Roof (CS)',
    domeAL:'Fixed Dome Roof (Aluminium Geodesic)', efr:'External Floating Roof', openTop:'Open Top'
  },
  ifrType: {
    none:'None', ifrPontoon:'CS Pontoon IFR', ifrFullContact:'CS Full Contact IFR'
  },
  efrType: { efrSingle:'Single Deck (Pan)', efrDouble:'Double Deck Pontoon' },
  intCoat: { none:'None', epoxy2coat:'Epoxy 2-coat', glassFlake:'Glass Flake Epoxy', passivation:'Passivation (SS)' },
  extCoat: { none:'None', standard:'Standard 3-coat', premium:'Premium 3-coat + stripe' },
  floatPaint: { none:'Not painted', topOnly:'Top deck only', undersideOnly:'Underside only', both:'Both sides' },
  rimSeal: { primary:'Primary seal only (shoe type)', primarySecondary:'Primary + secondary seal' },
  freight: { mysSg:'Malaysia → Singapore', localSg:'Local Singapore', none:'Not included' },
  erection: { traditional:'Traditional (Scaffolding)', jacking:'Jacking Method' },
  stair: { cageLadder:'Cage Ladder', spiralStair:'Spiral Staircase' },
  fluidClass: {
    classIV:'Class IV — fp > 150°C or non-flammable (no fixed fire system)',
    classIII:'Class III — fp 60–150°C (water cooling system)',
    classII:'Class II — fp 23–60°C (fixed foam system)',
    classI:'Class I — fp < 23°C (full foam system)',
    class0:'Class 0 — LPG/LNG (OUT OF SCOPE)'
  }
};

// ── Render Output ─────────────────────────────────────────────────────────────
function renderOutput() {
  const state = STATE;
  const est   = assembleEstimate(state);
  const contingencyPct = parseFloat(document.getElementById('contingency-pct')?.value || 10);
  const contingencyAmt = est.subtotal * contingencyPct / 100;
  const grandTotal     = est.subtotal + contingencyAmt;

  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-SG', { day:'2-digit', month:'short', year:'numeric' });

  function roofConfig() {
    let s = LABELS.outerRoof[state.outerRoof] || state.outerRoof;
    if (state.ifrType && state.ifrType !== 'none') s += ' + ' + LABELS.ifrType[state.ifrType];
    if (state.efrType) s += ' — ' + LABELS.efrType[state.efrType];
    return s;
  }

  function frangibleNote() {
    if (state.outerRoof !== 'coneCS' && state.outerRoof !== 'domeCS') return '';
    return state.frangibleRoof
      ? 'Frangible joint'
      : '<span style="color:var(--danger);font-weight:600;">Non-frangible joint</span>';
  }

  const showExtRoofLine = est.paint_ext_roof > 0;
  const showAlumDome    = est.alumDomeCost > 0;
  const showIFREFRFab   = est.fab_floatRoof > 0;
  const showFireSystem  = est.fire_total > 0;
  const showRimSeal     = est.rimSeal_cost > 0;
  const showRolling     = est.rolling_cost > 0;
  const showAnchor      = est.anchorCheck.required;

  const html = `
    <div class="output-header">
      <div>
        <h2>Estimate Report</h2>
        <div class="output-meta">Generated: ${dateStr} &nbsp;|&nbsp; ${APP_VERSION} &nbsp;|&nbsp; API 650, 12th Edition</div>
      </div>
      <div class="output-actions">
        <button class="btn btn-secondary" onclick="goToStep(3)">← Revise</button>
        <button class="btn btn-primary" onclick="window.print()">🖨 Print / PDF</button>
        <button class="btn btn-secondary" onclick="goToStep(1)">New Estimate</button>
      </div>
    </div>

    <div class="notice warn">
      <span class="notice-icon">⚠</span>
      <div><strong>Indicative estimate — accuracy ±20–25%.</strong>
      Cost rates are assumed market values not yet validated against completed project data.
      Calibrate <code>data/cost_rates.js</code> and <code>data/nozzle_rates.js</code> against
      actual project costs to improve accuracy. This estimate must not be used as a contract
      price or tender submission without further engineering and commercial review.</div>
    </div>

    <!-- Tank Configuration Summary -->
    <div class="card">
      <div class="card-title">Tank Configuration</div>
      <div class="tech-grid">
        <div class="tech-item"><div class="tl">Nominal Diameter</div><div class="tv">${est.D.toFixed(1)} m</div></div>
        <div class="tech-item"><div class="tl">Shell / Liquid Height</div><div class="tv">${est.H.toFixed(1)} m</div></div>
        <div class="tech-item"><div class="tl">Gross Capacity</div><div class="tv">${Math.round(est.capacity).toLocaleString()} m³</div></div>
        <div class="tech-item"><div class="tl">Design Liquid S.G.</div><div class="tv">${est.G.toFixed(2)}</div></div>
        <div class="tech-item"><div class="tl">Shell Material</div><div class="tv">${est.mat.label}</div></div>
        <div class="tech-item"><div class="tl">Roof Configuration</div><div class="tv">${roofConfig()}</div></div>
        <div class="tech-item"><div class="tl">Roof Joint Type</div><div class="tv">${frangibleNote() || '—'}</div></div>
        <div class="tech-item"><div class="tl">CA — Shell / Bottom</div><div class="tv">${state.corrosionAllowanceShell} mm / ${state.corrosionAllowanceBottom} mm</div></div>
        <div class="tech-item"><div class="tl">Shell Courses</div><div class="tv">${est.courses.length} courses, bottom plate ${est.courses[0].t_ordered} mm</div></div>
        <div class="tech-item"><div class="tl">Design Wind Speed</div><div class="tv">${state.windSpeed} m/s (SS CP3)</div></div>
        <div class="tech-item"><div class="tl">Total CS Steel Weight</div><div class="tv">${roundTo(est.totalSteelWeight,1).toLocaleString()} t</div></div>
        <div class="tech-item"><div class="tl">Erection Method</div><div class="tv">${LABELS.erection[state.erectionMethod]}</div></div>
        <div class="tech-item"><div class="tl">Fluid Classification (SS 532)</div><div class="tv">${LABELS.fluidClass[state.fluidClass] || state.fluidClass}</div></div>
        <div class="tech-item"><div class="tl">Access</div><div class="tv">${LABELS.stair[state.stairType]}</div></div>
        ${showAnchor ? `<div class="tech-item"><div class="tl">Anchor Chairs</div><div class="tv">${est.anchorCheck.count} chairs required (API 650 App B)</div></div>` : '<div class="tech-item"><div class="tl">Anchor Chairs</div><div class="tv">Not required (wind check passed)</div></div>'}
        ${est.coneIsSelfSupporting ? `<div class="tech-item" style="grid-column:1/-1"><div class="tl">Cone Roof Assumption</div><div class="tv" style="color:var(--accent)">D ≤ 12 m — self-supporting cone assumed (no internal rafters). Verify with structural analysis if required.</div></div>` : ''}
      </div>
    </div>

    <!-- Contingency -->
    <div class="contingency-control">
      <span class="notice-icon">📊</span>
      <label for="contingency-pct">Contingency (%)</label>
      <input type="number" id="contingency-pct" value="${contingencyPct}" min="0" max="50" step="1" onchange="renderOutput()">
      <span>Applied to all line items. Default 10%. Adjust to reflect project risk.</span>
    </div>

    <!-- Cost Table -->
    <div class="card">
      <div class="card-title">Itemised Cost Estimate (SGD)</div>
      <table class="cost-table">
        <thead><tr><th>Description</th><th class="num">Qty / Basis</th><th class="num">Unit Rate</th><th class="num">Cost (SGD)</th></tr></thead>
        <tbody>

          <!-- A: Material Supply -->
          <tr class="cat-row"><td colspan="3">A — Material Supply</td></tr>
          <tr class="sub-row"><td>Shell plates</td><td class="num">${roundTo(est.shellWeight,1)} t</td><td class="num">S$${COST_RATES.plate[matKey]}/t</td><td class="num">${SGD(est.mat_shell)}</td></tr>
          <tr class="sub-row"><td>Structural steel — wind girder, stiffeners, top angle (12% of shell)</td><td class="num">${roundTo(est.structWeight,1)} t</td><td class="num">S$${COST_RATES.plate[matKey]}/t</td><td class="num">${SGD(est.mat_struct)}</td></tr>
          <tr class="sub-row"><td>Bottom plates — annular + sketch plates</td><td class="num">${roundTo(est.bottomWeight,1)} t</td><td class="num">S$${COST_RATES.plate[matKey]}/t</td><td class="num">${SGD(est.mat_bottom)}</td></tr>
          ${est.mat_outerRoof > 0 ? `<tr class="sub-row"><td>Outer roof plates (${LABELS.outerRoof[state.outerRoof]})</td><td class="num">${roundTo(est.outerRoofWeight,1)} t</td><td class="num">S$${COST_RATES.plate[matKey]}/t</td><td class="num">${SGD(est.mat_outerRoof)}</td></tr>` : ''}
          ${est.mat_floatRoof > 0 ? `<tr class="sub-row"><td>Floating roof plates</td><td class="num">${roundTo(est.floatRoofWeight,1)} t</td><td class="num">S$${COST_RATES.plate[matKey]}/t</td><td class="num">${SGD(est.mat_floatRoof)}</td></tr>` : ''}
          <tr class="subtotal-row"><td colspan="3">Material Supply Subtotal</td><td class="num">${SGD(est.mat_total)}</td></tr>

          <!-- B: Fabrication -->
          <tr class="cat-row"><td colspan="3">B — Fabrication (ex-yard, Malaysia)</td></tr>
          <tr class="sub-row"><td>Shell fabrication — rolling, fit-up, welding, NDE</td><td class="num">${roundTo(est.shellWeight,1)} t</td><td class="num">S$${COST_RATES.fabrication.shell[matType]}/t</td><td class="num">${SGD(est.fab_shell)}</td></tr>
          <tr class="sub-row"><td>Structural steel fabrication</td><td class="num">${roundTo(est.structWeight,1)} t</td><td class="num">S$${COST_RATES.fabrication.structural[matType]}/t</td><td class="num">${SGD(est.fab_struct)}</td></tr>
          <tr class="sub-row"><td>Bottom plate fabrication</td><td class="num">${roundTo(est.bottomWeight,1)} t</td><td class="num">S$${COST_RATES.fabrication.bottom[matType]}/t</td><td class="num">${SGD(est.fab_bottom)}</td></tr>
          ${est.fab_outerRoof > 0 ? `<tr class="sub-row"><td>Outer roof fabrication${!state.frangibleRoof ? ' (non-frangible premium +7%)' : ''}</td><td class="num">${roundTo(est.outerRoofWeight,1)} t</td><td class="num">—</td><td class="num">${SGD(est.fab_outerRoof)}</td></tr>` : ''}
          ${showIFREFRFab ? `<tr class="sub-row"><td>Floating roof fabrication</td><td class="num">${roundTo(est.floatRoofWeight,1)} t</td><td class="num">—</td><td class="num">${SGD(est.fab_floatRoof)}</td></tr>` : ''}
          <tr class="subtotal-row"><td colspan="3">Fabrication Subtotal</td><td class="num">${SGD(est.fab_total)}</td></tr>

          <!-- C: Aluminium Dome -->
          ${showAlumDome ? `
          <tr class="cat-row"><td colspan="3">C — Aluminium Geodesic Dome (Vendor Supply &amp; Install)</td></tr>
          <tr class="sub-row"><td>Vendor engineering, panels, framing &amp; site installation</td><td class="num">${roundTo(est.outerRoofArea,1)} m²</td><td class="num">S$${COST_RATES.aluminumDome.supplyAndInstall}/m²</td><td class="num">${SGD(est.alumDomeCost)}</td></tr>
          <tr class="subtotal-row"><td colspan="3">Aluminium Dome Subtotal</td><td class="num">${SGD(est.alumDomeCost)}</td></tr>` : ''}

          <!-- D: Nozzles -->
          <tr class="cat-row"><td colspan="3">D — Nozzles &amp; Manholes</td></tr>
          ${est.noz.shell_small  > 0 ? `<tr class="sub-row"><td>Shell nozzles ≤4" NPS — ${est.noz.shell_small} off</td><td class="num">${est.noz.shell_small} ea</td><td class="num">—</td><td class="num">${SGD(est.noz_ss)}</td></tr>` : ''}
          ${est.noz.shell_medium > 0 ? `<tr class="sub-row"><td>Shell nozzles 6"–10" NPS — ${est.noz.shell_medium} off</td><td class="num">${est.noz.shell_medium} ea</td><td class="num">—</td><td class="num">${SGD(est.noz_sm)}</td></tr>` : ''}
          ${est.noz.shell_large  > 0 ? `<tr class="sub-row"><td>Shell nozzles 12"–16" NPS — ${est.noz.shell_large} off</td><td class="num">${est.noz.shell_large} ea</td><td class="num">—</td><td class="num">${SGD(est.noz_sl)}</td></tr>` : ''}
          ${est.noz.shell_mh     > 0 ? `<tr class="sub-row"><td>Shell manholes 20"/24" — ${est.noz.shell_mh} off</td><td class="num">${est.noz.shell_mh} ea</td><td class="num">—</td><td class="num">${SGD(est.noz_smh)}</td></tr>` : ''}
          ${est.noz.roof_small   > 0 ? `<tr class="sub-row"><td>Roof nozzles ≤4" NPS — ${est.noz.roof_small} off</td><td class="num">${est.noz.roof_small} ea</td><td class="num">—</td><td class="num">${SGD(est.noz_rs)}</td></tr>` : ''}
          ${est.noz.roof_mh      > 0 ? `<tr class="sub-row"><td>Roof manholes 20" — ${est.noz.roof_mh} off</td><td class="num">${est.noz.roof_mh} ea</td><td class="num">—</td><td class="num">${SGD(est.noz_rmh)}</td></tr>` : ''}
          <tr class="subtotal-row"><td colspan="3">Nozzles &amp; Manholes Subtotal</td><td class="num">${SGD(est.noz_total)}</td></tr>

          <!-- E: Erection -->
          <tr class="cat-row"><td colspan="3">E — Site Erection, Singapore</td></tr>
          <tr class="sub-row"><td>Erection labour &amp; crane (${LABELS.erection[state.erectionMethod]})</td><td class="num">${roundTo(est.totalSteelWeight,1)} t</td><td class="num">S$${COST_RATES.erection[state.erectionMethod][matType]}/t</td><td class="num">${SGD(est.erect_steel)}</td></tr>
          ${est.erect_mob > 0 ? `<tr class="sub-row"><td>Jacking rig mobilisation (lump sum)</td><td class="num">1 LS</td><td class="num">LS</td><td class="num">${SGD(est.erect_mob)}</td></tr>` : ''}
          <tr class="subtotal-row"><td colspan="3">Erection Subtotal</td><td class="num">${SGD(est.erect_total)}</td></tr>

          <!-- F: Painting -->
          <tr class="cat-row"><td colspan="3">F — Painting &amp; Coating</td></tr>
          <tr class="sub-row"><td>Internal coating — ${LABELS.intCoat[state.internalCoating]} (shell, height ${roundTo(est.pAreas.paintH,1)} m)</td><td class="num">${roundTo(est.pAreas.internalShell,0)} m²</td><td class="num">S$${COST_RATES.painting.internal[state.internalCoating]}/m²</td><td class="num">${SGD(est.paint_int_shell)}</td></tr>
          <tr class="sub-row"><td>Internal coating — ${LABELS.intCoat[state.internalCoating]} (bottom)</td><td class="num">${roundTo(est.pAreas.internalBottom,0)} m²</td><td class="num">S$${COST_RATES.painting.internal[state.internalCoating]}/m²</td><td class="num">${SGD(est.paint_int_bottom)}</td></tr>
          <tr class="sub-row"><td>External coating — ${LABELS.extCoat[state.externalCoating]} (shell)</td><td class="num">${roundTo(est.pAreas.externalShell,0)} m²</td><td class="num">S$${COST_RATES.painting.externalShell[state.externalCoating]}/m²</td><td class="num">${SGD(est.paint_ext_shell)}</td></tr>
          ${showExtRoofLine ? `<tr class="sub-row"><td>External coating — ${LABELS.extCoat[state.externalCoating]} (roof — higher rate for horizontal surface)</td><td class="num">${roundTo(est.pAreas.externalRoofArea,0)} m²</td><td class="num">S$${COST_RATES.painting.externalRoof[state.externalCoating]}/m²</td><td class="num">${SGD(est.paint_ext_roof)}</td></tr>` : ''}
          ${est.paint_float_top  > 0 ? `<tr class="sub-row"><td>Floating roof — top deck external coating</td><td class="num">${roundTo(est.floatDeckArea,0)} m²</td><td class="num">S$${COST_RATES.painting.floatingRoofTop.CS}/m²</td><td class="num">${SGD(est.paint_float_top)}</td></tr>` : ''}
          ${est.paint_float_btm  > 0 ? `<tr class="sub-row"><td>Floating roof — underside (product contact) coating</td><td class="num">${roundTo(est.floatDeckArea,0)} m²</td><td class="num">S$${COST_RATES.painting.floatingRoofUnderside.CS}/m²</td><td class="num">${SGD(est.paint_float_btm)}</td></tr>` : ''}
          <tr class="subtotal-row"><td colspan="3">Painting &amp; Coating Subtotal</td><td class="num">${SGD(est.paint_total)}</td></tr>

          <!-- G: Accessories -->
          <tr class="cat-row"><td colspan="3">G — Accessories &amp; Structural Appurtenances</td></tr>
          <tr class="sub-row"><td>${LABELS.stair[state.stairType]}</td><td class="num">${roundTo(est.H,1)} m height</td><td class="num">—</td><td class="num">${SGD(est.stair_cost)}</td></tr>
          ${est.hasRoofPlatform ? `<tr class="sub-row"><td>Roof / shell-top perimeter walkway (handrail + grating)</td><td class="num">${roundTo(PI * est.D,1)} m</td><td class="num">S$${COST_RATES.accessories.roofPlatform.perMeterCircumference}/m</td><td class="num">${SGD(est.platform_cost)}</td></tr>` : ''}
          ${showRolling ? `<tr class="sub-row"><td>Rolling ladder (EFR access — guide rails, wheeled, self-levelling)</td><td class="num">${roundTo(est.H * 1.155,1)} m travel</td><td class="num">—</td><td class="num">${SGD(est.rolling_cost)}</td></tr>` : ''}
          <tr class="sub-row"><td>Drip ring (50×50×6 angle at bottom annular — per API 650 good practice)</td><td class="num">${roundTo(PI * est.D,1)} m</td><td class="num">S$${COST_RATES.accessories.dripRing.perMeterCircumference}/m</td><td class="num">${SGD(est.drip_cost)}</td></tr>
          ${showAnchor ? `<tr class="sub-row"><td>Anchor chairs — ${est.anchorCheck.count} off (API 650 Appendix B wind uplift check)</td><td class="num">${est.anchorCheck.count} ea</td><td class="num">—</td><td class="num">${SGD(est.anchor_cost)}</td></tr>` : `<tr class="sub-row"><td>Anchor chairs — not required (wind overturning check passed, API 650 App B)</td><td class="num">—</td><td class="num">—</td><td class="num">${SGD(0)}</td></tr>`}
          <tr class="subtotal-row"><td colspan="3">Accessories Subtotal</td><td class="num">${SGD(est.acc_total)}</td></tr>

          <!-- H: Rim Seal -->
          ${showRimSeal ? `
          <tr class="cat-row"><td colspan="3">H — Rim Seal System</td></tr>
          <tr class="sub-row"><td>${LABELS.rimSeal[state.rimSealType]} — ${est.efrPresent ? 'EFR' : 'IFR'}</td><td class="num">${roundTo(PI * est.D,1)} m circumference</td><td class="num">—</td><td class="num">${SGD(est.rimSeal_cost)}</td></tr>
          <tr class="subtotal-row"><td colspan="3">Rim Seal Subtotal</td><td class="num">${SGD(est.rimSeal_cost)}</td></tr>` : ''}

          <!-- I: Fire Protection -->
          ${showFireSystem ? `
          <tr class="cat-row"><td colspan="3">I — Fire Protection System Piping (SS 532 ${LABELS.fluidClass[state.fluidClass]?.split('—')[0].trim()})</td></tr>
          <tr class="sub-row"><td>System mobilisation, manifold, isolation valve, flanged tie-in at shell bottom</td><td class="num">1 LS</td><td class="num">LS</td><td class="num">${SGD(est.fireResult.lumpSum)}</td></tr>
          <tr class="sub-row"><td>Vertical supply pipe (exterior of shell)</td><td class="num">${roundTo(est.H,1)} m</td><td class="num">—</td><td class="num">${SGD(est.fireResult.verticalPipe)}</td></tr>
          <tr class="sub-row"><td>Top-of-shell ring header + foam pourers / spray nozzles</td><td class="num">${roundTo(PI * est.D,1)} m</td><td class="num">—</td><td class="num">${SGD(est.fireResult.ringHeader)}</td></tr>
          ${est.fireResult.rimInjection > 0 ? `<tr class="sub-row"><td>EFR rim-seal foam injection system (Class I/II EFR requirement)</td><td class="num">${roundTo(PI * est.D,1)} m</td><td class="num">—</td><td class="num">${SGD(est.fireResult.rimInjection)}</td></tr>` : ''}
          <tr class="subtotal-row"><td colspan="3">Fire Protection Subtotal</td><td class="num">${SGD(est.fire_total)}</td></tr>` : ''}

          <!-- J: Freight -->
          <tr class="cat-row"><td colspan="3">${showFireSystem ? 'J' : showRimSeal ? 'I' : 'H'} — Freight</td></tr>
          <tr class="sub-row"><td>Transport (${LABELS.freight[state.freightOption]})</td><td class="num">${roundTo(est.totalSteelWeight,1)} t</td><td class="num">S$${COST_RATES.freight[state.freightOption].perTonne}/t + LS</td><td class="num">${SGD(est.freight_total)}</td></tr>
          <tr class="subtotal-row"><td colspan="3">Freight Subtotal</td><td class="num">${SGD(est.freight_total)}</td></tr>

          <!-- K: Hydrotest -->
          <tr class="cat-row"><td colspan="3">Hydrostatic Test (mandatory — API 650 §7.3.6)</td></tr>
          <tr class="sub-row"><td>Test supervision, equipment &amp; water supply</td><td class="num">${Math.round(est.capacity).toLocaleString()} m³</td><td class="num">S$${COST_RATES.hydrotest.perCubicMetre}/m³ + LS</td><td class="num">${SGD(est.hydrotest_total)}</td></tr>
          <tr class="subtotal-row"><td colspan="3">Hydrotest Subtotal</td><td class="num">${SGD(est.hydrotest_total)}</td></tr>

          <!-- Totals -->
          <tr><td colspan="3" style="padding:6px 0;"></td></tr>
          <tr class="subtotal-row"><td colspan="2" style="font-size:14px;">Subtotal (before contingency)</td><td class="num" style="font-size:14px;">${SGD(est.subtotal)}</td></tr>
          <tr class="contingency-row"><td colspan="3">Contingency (${contingencyPct}%)</td><td class="num">${SGD(contingencyAmt)}</td></tr>
          <tr class="total-row"><td colspan="3">TOTAL ESTIMATED PROJECT COST</td><td class="num">${SGD(grandTotal)}</td></tr>

        </tbody>
      </table>
    </div>

    <!-- Non-frangible notice -->
    ${state.frangibleRoof === false && (state.outerRoof === 'coneCS' || state.outerRoof === 'domeCS') ? `
    <div class="notice danger">
      <span class="notice-icon">⚠</span>
      <div><strong>Non-frangible roof specified.</strong> A non-frangible roof-to-shell joint
      requires that pressure/vacuum (P/V) relief vents be sized and installed to protect the tank
      against internal overpressure. P/V relief vents are <strong>excluded</strong> from this
      estimate and must be budgeted separately. Confirm P/V vent sizing with the process engineer.</div>
    </div>` : ''}

    <!-- Exclusions -->
    <div class="card">
      <div class="exclusions-box">
        <div class="exc-header">⛔ ITEMS EXCLUDED FROM THIS ESTIMATE</div>
        <div class="exc-body">
          <p>The following are NOT included and must be budgeted separately:</p>
          <ul>
            <li><strong>Tank foundation</strong> — ring beam, raft slab, piling, soil improvement as required by geotechnical assessment</li>
            <li><strong>Civil works</strong> — bund walls, secondary containment, paved hardstand</li>
            <li><strong>Nozzle internals</strong> — suction strainers, dip pipes, internal distribution headers</li>
            <li><strong>Instrumentation</strong> — level gauges, float switches, radar transmitters, temperature sensors</li>
            ${state.frangibleRoof === false ? '<li><strong>Pressure/vacuum relief vents</strong> — mandatory for non-frangible roof tanks</li>' : '<li><strong>Emergency vents</strong> — for frangible roof tanks where process conditions require</li>'}
            <li><strong>Fire water / foam ring main</strong> — main supply header outside tank bund (fire protection piping costed to tank flange only)</li>
            <li><strong>Insulation and cladding</strong> — where thermally insulated tanks are required</li>
            <li><strong>External pipework</strong> — all pipework beyond nozzle face</li>
            <li><strong>Engineering and project management fees</strong> — detailed design, procurement support, construction management</li>
            <li><strong>Regulatory submissions</strong> — SCDF, NEA, or other authority approvals and inspection fees</li>
            <li><strong>Commissioning and initial product fill</strong></li>
          </ul>
          <div class="exc-warn">
            ⚠ Foundation and civil works can represent 20–50% of the above tank cost in Singapore.
            Do not commit to a project budget without a separate foundation cost provision from a geotechnical and civil engineer.
          </div>
        </div>
      </div>
    </div>

    <!-- Basis of Calculations -->
    <div class="card">
      <div class="card-title">Basis of Calculations</div>
      <div style="font-size:12px;color:var(--text-sec);margin-bottom:14px;">All quantities derived per API 650, 12th Edition. Intermediate values shown below.</div>
      <table class="basis-table">
        <thead><tr><th>Parameter</th><th>Formula / Derivation</th></tr></thead>
        <tbody>
          <tr class="basis-section"><td colspan="2"><strong>Tank Geometry</strong></td></tr>
          <tr><td>Shell area</td><td>π × D × H = π × ${est.D} × ${est.H} = <strong>${roundTo(Math.PI*est.D*est.H,1)} m²</strong></td></tr>
          <tr><td>Bottom area</td><td>π/4 × D² = π/4 × ${est.D}² = <strong>${roundTo(Math.PI/4*est.D*est.D,1)} m²</strong></td></tr>
          <tr><td>Gross capacity</td><td>π/4 × D² × H = <strong>${Math.round(est.capacity).toLocaleString()} m³</strong></td></tr>
          <tr><td>Tank circumference</td><td>π × D = <strong>${roundTo(Math.PI*est.D,1)} m</strong></td></tr>
          ${!est.isAlumDome && state.outerRoof !== 'efr' && state.outerRoof !== 'openTop' ? `<tr><td>Roof area (${LABELS.outerRoof[state.outerRoof]})</td><td>Slant height geometry → <strong>${roundTo(est.outerRoofArea,1)} m²</strong></td></tr>` : ''}
          ${est.hasFloatRoof ? `<tr><td>Floating roof deck area</td><td>π/4 × D² (approx.) = <strong>${roundTo(est.floatDeckArea,1)} m²</strong></td></tr>` : ''}

          <tr class="basis-section"><td colspan="2"><strong>Shell Design — API 650 One-Foot Method (§5.6.3)</strong></td></tr>
          <tr><td>Shell courses</td><td>${est.courses.map((c,i)=>`Course ${i+1}: ${c.height} m, t_des=${c.t_design.toFixed(2)} mm → t_ord=${c.t_ordered} mm`).join(' | ')}</td></tr>
          <tr><td>Shell weight</td><td>Σ(area per course × t_ordered × 7.85 t/m³) = <strong>${roundTo(est.shellWeight,2)} t</strong></td></tr>
          <tr><td>Structural steel (12% allowance)</td><td>12% × shell weight = 0.12 × ${roundTo(est.shellWeight,2)} = <strong>${roundTo(est.structWeight,2)} t</strong> (wind girder, stiffeners, top angle)</td></tr>

          <tr class="basis-section"><td colspan="2"><strong>Bottom Plate Weight</strong></td></tr>
          <tr><td>Bottom weight</td><td>Sketch + annular plates. Area = π/4 × D² + 0.6 m overlap. t = max(6, CA) mm + min tck per API 650. Result: <strong>${roundTo(est.bottomWeight,2)} t</strong></td></tr>

          <tr class="basis-section"><td colspan="2"><strong>Roof Weight</strong></td></tr>
          ${est.isAlumDome ? `<tr><td>Aluminium dome</td><td>Vendor supply + install. Area = ${roundTo(est.outerRoofArea,1)} m² × S$${COST_RATES.aluminumDome.supplyAndInstall}/m²</td></tr>` : `<tr><td>Outer roof weight</td><td>${est.coneIsSelfSupporting ? 'Self-supporting cone (D ≤ 12 m, no rafters, t_min = 6 mm)' : 'Rafter-supported cone/dome (D > 12 m, t_min = 5 mm)'}. Result: <strong>${roundTo(est.outerRoofWeight,2)} t</strong></td></tr>`}
          ${est.hasFloatRoof ? `<tr><td>Floating roof weight</td><td>Deck + pontoon geometry. Result: <strong>${roundTo(est.floatRoofWeight,2)} t</strong></td></tr>` : ''}
          <tr><td>Total steel weight</td><td>Shell + Struct + Bottom + Roof + Float = <strong>${roundTo(est.totalSteelWeight,2)} t</strong></td></tr>

          <tr class="basis-section"><td colspan="2"><strong>Painting Areas</strong></td></tr>
          <tr><td>Internal shell paint area</td><td>π × D × paintH = π × ${est.D} × ${roundTo(est.pAreas.paintH,1)} = <strong>${roundTo(est.pAreas.internalShell,1)} m²</strong></td></tr>
          <tr><td>Internal bottom paint area</td><td>π/4 × D² = <strong>${roundTo(est.pAreas.internalBottom,1)} m²</strong></td></tr>
          <tr><td>External shell paint area</td><td>π × D × H = <strong>${roundTo(est.pAreas.externalShell,1)} m²</strong></td></tr>
          ${est.paint_ext_roof > 0 ? `<tr><td>External roof paint area</td><td>Roof surface geometry = <strong>${roundTo(est.pAreas.externalRoofArea,1)} m²</strong> (higher rate — horizontal surface)</td></tr>` : ''}

          <tr class="basis-section"><td colspan="2"><strong>Anchorage — API 650 Appendix B</strong></td></tr>
          <tr><td>Wind overturning moment Mw</td><td><strong>${Math.round(est.anchorCheck.Mw/1000)} kN·m</strong> (wind on shell at ${state.windSpeed} m/s)</td></tr>
          <tr><td>Stabilising moments</td><td>Liquid Ml = ${Math.round(est.anchorCheck.Ml/1000)} kN·m | Shell Ms = ${Math.round(est.anchorCheck.Ms/1000)} kN·m | Total = <strong>${Math.round((est.anchorCheck.Ml+est.anchorCheck.Ms)/1000)} kN·m</strong></td></tr>
          <tr><td>Anchor chairs</td><td>${est.anchorCheck.required ? `Required: ${est.anchorCheck.count} chairs (Mw > Mstab)` : 'Not required (Mw < Mstab)'}</td></tr>

          <tr class="basis-section"><td colspan="2"><strong>Cost Rates Basis</strong></td></tr>
          <tr><td>Plate material</td><td>${matKey} @ S$${COST_RATES.plate[matKey]}/t delivered to fab yard</td></tr>
          <tr><td>Fabrication (shell)</td><td>S$${COST_RATES.fabrication.shell[matType]}/t ex-yard Malaysia</td></tr>
          <tr><td>Site erection</td><td>S$${COST_RATES.erection[state.erectionMethod][matType]}/t — ${LABELS.erection[state.erectionMethod]}</td></tr>
          <tr><td>Currency / Basis</td><td>SGD. SE Asia market, Q1 2025 (assumed). Accuracy ±20–25%.</td></tr>
          <tr><td>Prepared by</td><td>API 650 Tank Cost Estimator ${APP_VERSION} | ${dateStr}</td></tr>
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('output-content').innerHTML = html;
}