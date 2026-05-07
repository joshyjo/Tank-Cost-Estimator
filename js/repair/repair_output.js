// =============================================================================
// REPAIR_OUTPUT.JS — Repair Estimate Rendering  v1.3.0
// =============================================================================

const APP_VERSION_REPAIR = 'v1.3.0';

function SGD_R(v) { return 'S$ ' + Math.round(v).toLocaleString('en-SG'); }
function pct(v)   { return (v * 100).toFixed(1) + '%'; }
function t2(v)    { return (+v).toFixed(2); }
function r1(v)    { return (+v).toFixed(1); }
function r0(v)    { return Math.round(+v).toLocaleString(); }

function tradeName(t) {
  return {WLD:'Welder',FTR:'Fitter',RIG:'Rigger',SCF:'Scaffolder',
          FMN:'Foreman',HLP:'Helper',IND:'Indirect'}[t] || t;
}

// ---------------------------------------------------------------------------
// Labour rows — now has unit rate column (shows MH rate as unit rate)
// label: 'Shop Fabrication Labour' or 'Site Installation Labour'
// ---------------------------------------------------------------------------
function labourRows(lab, tradeList, label) {
  if (!lab) return '';
  const trades = tradeList || ['WLD','FTR','RIG','FMN','HLP'];
  const rates  = COST_RATES.labour.rates;
  const sectionLabel = label || (lab.label === 'Site' ? 'Site Installation Labour' : 'Shop Fabrication Labour');
  let rows = `<tr class="sub-row labour-section-header"><td colspan="4">&nbsp;&nbsp;<em>${sectionLabel}</em></td></tr>`;
  trades.forEach(t => {
    const mh = lab.mh[t] || 0;
    if (mh > 0)
      rows += `<tr class="sub-row"><td>&nbsp;&nbsp;&nbsp;&nbsp;${t} — ${tradeName(t)}</td><td class="num">${r1(mh)} MH</td><td class="num">S$${rates[t]}/MH</td><td class="num">${SGD_R(lab.cost[t]||0)}</td></tr>`;
  });
  if (lab.indirectMH > 0)
    rows += `<tr class="sub-row"><td>&nbsp;&nbsp;&nbsp;&nbsp;Indirect — Safety Officer / QC</td><td class="num">${r1(lab.indirectMH)} MH</td><td class="num">S$${rates.IND}/MH</td><td class="num">${SGD_R(lab.indirectCost)}</td></tr>`;
  return rows;
}

// ---------------------------------------------------------------------------
// Repair-specific section renderers (one per R-scope)
// All tables now have 4 columns: Description | Qty | Unit Rate | SGD
// ---------------------------------------------------------------------------
function renderR01(res) {
  const r  = COST_RATES;
  let paintRows = '';
  if (res.paintTopCost > 0)
    paintRows += `<tr class="sub-row"><td>&nbsp;&nbsp;&nbsp;Floating roof top deck painting</td><td class="num">${r1(res.deckArea)} m²</td><td class="num">S$${r.painting.floatingRoofTop.CS}/m²</td><td class="num">${SGD_R(res.paintTopCost)}</td></tr>`;
  if (res.paintUndCost > 0)
    paintRows += `<tr class="sub-row"><td>&nbsp;&nbsp;&nbsp;Floating roof underside painting</td><td class="num">${r1(res.deckArea)} m²</td><td class="num">S$${r.painting.floatingRoofUnderside.CS}/m²</td><td class="num">${SGD_R(res.paintUndCost)}</td></tr>`;
  return `
    <tr class="sub-row"><td>IFR material — plate supply</td><td class="num">${t2(res.ifrWeight)} t</td><td class="num">—</td><td class="num">${SGD_R(res.plateCost)}</td></tr>
    <tr class="sub-row"><td>Shop fabrication (repair premium applied)</td><td class="num">${t2(res.ifrWeight)} t</td><td class="num">—</td><td class="num">${SGD_R(res.fabCost)}</td></tr>
    ${labourRows(res.shopLabour)}
    ${labourRows(res.siteLabour)}
    <tr class="sub-row"><td>Rim seal supply</td><td class="num">—</td><td class="num">—</td><td class="num">${SGD_R(res.rimCost)}</td></tr>
    ${paintRows}`;
}

function renderR02(res) {
  return `
    <tr class="sub-row"><td>Floating roof removal — ${res.floatLabel} (${t2(res.floatWeight)} t)</td><td class="num">${t2(res.floatWeight)} t</td><td class="num">—</td><td class="num">—</td></tr>
    ${labourRows(res.siteLabour, null, 'Site Installation Labour')}`;
}

function renderR03(res) {
  let rows = '';
  res.results.forEach(sub => {
    rows += `<tr class="sub-row"><td><strong>${sub.desc}</strong></td><td class="num">${sub.weight ? t2(sub.weight)+' t' : (sub.weightT ? t2(sub.weightT)+' t' : '—')}</td><td class="num">—</td><td class="num">${SGD_R(sub.sub)}</td></tr>`;
    if (sub.plateCost) rows += `<tr class="sub-row"><td>&nbsp;&nbsp;&nbsp;Material supply</td><td class="num">—</td><td class="num">—</td><td class="num">${SGD_R(sub.plateCost)}</td></tr>`;
    if (sub.fabCost)   rows += `<tr class="sub-row"><td>&nbsp;&nbsp;&nbsp;Shop fabrication</td><td class="num">—</td><td class="num">—</td><td class="num">${SGD_R(sub.fabCost)}</td></tr>`;
    if (sub.supplyCost) rows += `<tr class="sub-row"><td>&nbsp;&nbsp;&nbsp;Vendor supply</td><td class="num">—</td><td class="num">—</td><td class="num">${SGD_R(sub.supplyCost)}</td></tr>`;
    if (sub.shopLabour) rows += labourRows(sub.shopLabour);
    if (sub.siteLabour) rows += labourRows(sub.siteLabour);
  });
  return rows;
}

function renderR04(res) {
  return `
    <tr class="sub-row"><td>Bottom plate material (${t2(res.repairArea)} m², ${res.t_mm} mm)</td><td class="num">${t2(res.weight)} t</td><td class="num">—</td><td class="num">${SGD_R(res.plateCost)}</td></tr>
    <tr class="sub-row"><td>Shop fabrication (repair premium applied)</td><td class="num">${t2(res.weight)} t</td><td class="num">—</td><td class="num">${SGD_R(res.fabCost)}</td></tr>
    ${labourRows(res.shopLabour)}
    ${labourRows(res.siteLabour)}
    ${res.jackingCost > 0 ? `<tr class="sub-row"><td>Tank jacking — mobilisation + per m circumference</td><td class="num">1 LS</td><td class="num">—</td><td class="num">${SGD_R(res.jackingCost)}</td></tr>` : ''}`;
}

function renderR05(res) {
  return `
    <tr class="sub-row"><td>Shell plate material (${t2(res.repairArea)} m², avg ${r1(res.avgT_mm)} mm)</td><td class="num">${t2(res.weight)} t</td><td class="num">—</td><td class="num">${SGD_R(res.plateCost)}</td></tr>
    <tr class="sub-row"><td>Shop fabrication (repair premium applied)</td><td class="num">${t2(res.weight)} t</td><td class="num">—</td><td class="num">${SGD_R(res.fabCost)}</td></tr>
    ${labourRows(res.shopLabour)}
    ${labourRows(res.siteLabour)}`;
}

function renderR06(res) {
  return `
    <tr class="sub-row"><td>Roof plate material (${res.pct}% of roof, ${t2(res.weight)} t)</td><td class="num">${t2(res.weight)} t</td><td class="num">—</td><td class="num">${SGD_R(res.plateCost)}</td></tr>
    <tr class="sub-row"><td>Shop fabrication (repair premium applied)</td><td class="num">${t2(res.weight)} t</td><td class="num">—</td><td class="num">${SGD_R(res.fabCost)}</td></tr>
    ${labourRows(res.shopLabour)}
    ${labourRows(res.siteLabour)}`;
}

function renderR07(res) {
  return `
    <tr class="sub-row"><td>Aluminium dome — vendor supply + install</td><td class="num">${r1(res.domeArea)} m²</td><td class="num">S$${COST_RATES.aluminumDome.supplyAndInstall}/m²</td><td class="num">${SGD_R(res.vendorCost)}</td></tr>
    ${labourRows(res.siteLabour, ['FTR','RIG','FMN','HLP'], 'Site Supervision & Rigging')}
    ${res.removalCost > 0 ? `<tr class="sub-row"><td>Existing roof removal</td><td class="num">—</td><td class="num">—</td><td class="num">${SGD_R(res.removalCost)}</td></tr>` : ''}`;
}

function renderR08(res) {
  return `
    <tr class="sub-row"><td>Rim seal supply — ${res.sealKey} (${r1(res.circumference)} m circ.)</td><td class="num">${r1(res.circumference)} m</td><td class="num">—</td><td class="num">${SGD_R(res.supplyCost)}</td></tr>
    ${labourRows(res.siteLabour, ['FTR','FMN','HLP'], 'Site Installation Labour')}`;
}

function renderR09(res) {
  let rows = '';
  res.lineItems.forEach(li => {
    const total = li.supply + (li.shopLabour ? li.shopLabour.totalLabourCost : 0) + (li.siteLabour ? li.siteLabour.totalLabourCost : 0);
    rows += `<tr class="sub-row"><td><strong>${li.desc}</strong></td><td class="num">—</td><td class="num">—</td><td class="num">${SGD_R(total)}</td></tr>`;
    rows += `<tr class="sub-row"><td>&nbsp;&nbsp;&nbsp;Nozzle/manhole supply</td><td class="num">—</td><td class="num">—</td><td class="num">${SGD_R(li.supply)}</td></tr>`;
    if (li.shopLabour) rows += labourRows(li.shopLabour);
    if (li.siteLabour) rows += labourRows(li.siteLabour);
  });
  return rows;
}

function renderR10(res) {
  return `<tr class="sub-row"><td>Internal coating — shell (ht ${r1(res.paintH)} m)</td><td class="num">${r1(res.shellArea)} m²</td><td class="num">S$${res.rate}/m²</td><td class="num">${SGD_R(res.shellArea * res.rate)}</td></tr>
    <tr class="sub-row"><td>Internal coating — bottom</td><td class="num">${r1(res.bottomArea)} m²</td><td class="num">S$${res.rate}/m²</td><td class="num">${SGD_R(res.bottomArea * res.rate)}</td></tr>`;
}

function renderR11(res) {
  return `
    <tr class="sub-row"><td>External shell coating</td><td class="num">${r1(res.shellArea)} m²</td><td class="num">S$${res.shellRate}/m²</td><td class="num">${SGD_R(res.shellCost)}</td></tr>
    ${res.roofCost > 0 ? `<tr class="sub-row"><td>External roof coating</td><td class="num">${r1(res.roofArea)} m²</td><td class="num">S$${res.roofRate}/m²</td><td class="num">${SGD_R(res.roofCost)}</td></tr>` : ''}`;
}

function renderR12(res) {
  let rows = '';
  res.lineItems.forEach(li => {
    rows += `<tr class="sub-row"><td><strong>${li.desc}</strong> (${t2(li.weight)} t)</td><td class="num">${t2(li.weight)} t</td><td class="num">—</td><td class="num">${SGD_R(li.sub)}</td></tr>`;
    rows += `<tr class="sub-row"><td>&nbsp;&nbsp;&nbsp;Material + shop fabrication</td><td class="num">—</td><td class="num">—</td><td class="num">${SGD_R(li.plateCost + li.fabCost)}</td></tr>`;
    if (li.shopLabour) rows += labourRows(li.shopLabour);
    if (li.siteLabour) rows += labourRows(li.siteLabour);
  });
  return rows;
}

function renderR13(res) {
  return `
    <tr class="sub-row"><td>Stilling well — pipe material (${r1(res.length)} m)</td><td class="num">${t2(res.weight)} t</td><td class="num">—</td><td class="num">${SGD_R(res.plateCost)}</td></tr>
    <tr class="sub-row"><td>Shop fabrication + perforation</td><td class="num">${t2(res.weight)} t</td><td class="num">—</td><td class="num">${SGD_R(res.fabCost)}</td></tr>
    ${labourRows(res.shopLabour)}
    ${labourRows(res.siteLabour)}`;
}

function renderR14(res) {
  return `
    <tr class="sub-row"><td>Sacrificial anodes — ${res.anodeCount} ea (${r1(res.totalArea)} m² area)</td><td class="num">${res.anodeCount} ea</td><td class="num">S$${REPAIR_RATES.cp.anodeWeightKg * REPAIR_RATES.cp.materialPerKg}/ea</td><td class="num">${SGD_R(res.materialCost)}</td></tr>
    ${labourRows(res.siteLabour, ['FTR','FMN','HLP'], 'Site Installation Labour')}
    ${res.removalLabourCost > 0 ? `<tr class="sub-row"><td>Existing anode removal (site)</td><td class="num">—</td><td class="num">—</td><td class="num">${SGD_R(res.removalLabourCost)}</td></tr>` : ''}`;
}

function renderR15(res) {
  const vR = REPAIR_RATES.venting;
  return `
    ${res.pvSupply  > 0 ? `<tr class="sub-row"><td>P/V vent supply</td><td class="num">${'—'}</td><td class="num">—</td><td class="num">${SGD_R(res.pvSupply)}</td></tr>` : ''}
    ${res.emSupply  > 0 ? `<tr class="sub-row"><td>Emergency vent supply</td><td class="num">—</td><td class="num">—</td><td class="num">${SGD_R(res.emSupply)}</td></tr>` : ''}
    ${labourRows(res.shopLabour)}
    ${labourRows(res.siteLabour)}`;
}

const REPAIR_RENDERERS = { r01:renderR01, r02:renderR02, r03:renderR03, r04:renderR04,
  r05:renderR05, r06:renderR06, r07:renderR07, r08:renderR08, r09:renderR09,
  r10:renderR10, r11:renderR11, r12:renderR12, r13:renderR13, r14:renderR14, r15:renderR15 };

// ---------------------------------------------------------------------------
// Calculation Basis Section
// ---------------------------------------------------------------------------
function renderCalcBasis(rState, est) {
  const D  = rState.diameter;
  const H  = rState.shellHeight;
  const G  = rState.specificGravity;
  const Pi = Math.PI;

  const shellArea   = +(Pi * D * H).toFixed(1);
  const bottomArea  = +(Pi / 4 * D * D).toFixed(1);
  const circumf     = +(Pi * D).toFixed(1);
  const tankVol     = +(Pi / 4 * D * D * H).toFixed(1);
  const maxIfrH     = REPAIR_RATES.scaffolding.ifrEfrMaxScaffoldHeight || 4;
  const repPrem     = (REPAIR_RATES.repairShopPremium * 100).toFixed(0);
  const indPct      = (COST_RATES.labour.indirectPct * 100).toFixed(0);
  const sc          = est.scaffolding;

  // Collect per-scope basis rows
  let scopeBasis = '';
  est.repairs.forEach(res => {
    const id = res.id;
    if (id === 'r01') {
      scopeBasis += `<tr><td>R01 — IFR weight</td><td>Derived from deck area: π/4 × D² = π/4 × ${D}² = ${bottomArea} m². IFR plate t=6mm, density 7.85 t/m³. Result: ${t2(res.ifrWeight)} t</td></tr>`;
    } else if (id === 'r02') {
      scopeBasis += `<tr><td>R02 — Float removal weight</td><td>Existing float weight: ${t2(res.floatWeight)} t. Labour only (no new material).</td></tr>`;
    } else if (id === 'r04') {
      scopeBasis += `<tr><td>R04 — Bottom area</td><td>π/4 × D² = π/4 × ${D}² = ${bottomArea} m². Repair area = ${t2(res.repairArea)} m². Plate t = ${res.t_mm} mm. Weight = ${t2(res.weight)} t.</td></tr>`;
      if (res.jackingCost > 0) {
        const jackCirc = +(Pi * D).toFixed(1);
        scopeBasis += `<tr><td>R04 — Jacking cost</td><td>Base S$${REPAIR_RATES.jacking.baseLumpSum.toLocaleString()} + S$${REPAIR_RATES.jacking.perMCircumference}/m × πD (${jackCirc} m) = S$${Math.round(res.jackingCost).toLocaleString()}</td></tr>`;
      }
    } else if (id === 'r05') {
      scopeBasis += `<tr><td>R05 — Shell area</td><td>π × D × H = π × ${D} × ${H} = ${shellArea} m². Repair area = ${t2(res.repairArea)} m². Avg plate t = ${r1(res.avgT_mm)} mm (from API 650 one-foot method). Weight = ${t2(res.weight)} t.</td></tr>`;
    } else if (id === 'r06') {
      scopeBasis += `<tr><td>R06 — Roof area</td><td>Full roof area = ${t2(res.fullArea)} m². Replacement scope = ${res.pct}%. Weight = ${t2(res.weight)} t.</td></tr>`;
    } else if (id === 'r07') {
      scopeBasis += `<tr><td>R07 — Dome surface area</td><td>Aluminium geodesic dome: spherical cap formula. Area = ${r1(res.domeArea)} m².</td></tr>`;
    } else if (id === 'r08') {
      scopeBasis += `<tr><td>R08 — Rim seal length</td><td>π × D = π × ${D} = ${r1(res.circumference)} m circumference.</td></tr>`;
    } else if (id === 'r10') {
      scopeBasis += `<tr><td>R10 — Internal coating areas</td><td>Shell: π × D × paintH = π × ${D} × ${r1(res.paintH)} = ${r1(res.shellArea)} m². Bottom: π/4 × D² = ${r1(res.bottomArea)} m². Total = ${r1(res.totalArea)} m².</td></tr>`;
    } else if (id === 'r11') {
      scopeBasis += `<tr><td>R11 — External coating areas</td><td>Shell: π × D × H = ${r1(res.shellArea)} m²${res.roofArea > 0 ? `. Roof = ${r1(res.roofArea)} m²` : ' (shell only)'}.</td></tr>`;
    } else if (id === 'r13') {
      scopeBasis += `<tr><td>R13 — Stilling well</td><td>Length = ${r1(res.length)} m. Pipe weight = ${t2(res.weight)} t.</td></tr>`;
    } else if (id === 'r14') {
      scopeBasis += `<tr><td>R14 — CP anode count</td><td>Protected area = ${r1(res.totalArea)} m² (bottom + lower shell). 1 anode per ${REPAIR_RATES.cp.m2PerAnode} m² → ${res.anodeCount} anodes × ${REPAIR_RATES.cp.anodeWeightKg} kg × S$${REPAIR_RATES.cp.materialPerKg}/kg = S$${Math.round(res.materialCost).toLocaleString()}.</td></tr>`;
    }
  });

  return `
    <div class="card">
      <div class="card-title">Basis of Calculations</div>
      <div style="font-size:12px;color:var(--text-sec);line-height:1.8;margin-bottom:14px;">
        All formulae reference API 650 / API 653 geometry. Intermediate quantities shown below.
      </div>
      <table class="basis-table">
        <thead><tr><th>Parameter</th><th>Formula / Derivation</th></tr></thead>
        <tbody>
          <tr class="basis-section"><td colspan="2"><strong>Tank Geometry</strong></td></tr>
          <tr><td>Shell area</td><td>π × D × H = π × ${D} × ${H} = <strong>${shellArea} m²</strong></td></tr>
          <tr><td>Bottom area</td><td>π/4 × D² = π/4 × ${D}² = <strong>${bottomArea} m²</strong></td></tr>
          <tr><td>Tank circumference</td><td>π × D = π × ${D} = <strong>${circumf} m</strong></td></tr>
          <tr><td>Tank volume (for internal scaffold)</td><td>π/4 × D² × H = π/4 × ${D}² × ${H} = <strong>${tankVol} m³</strong></td></tr>

          <tr class="basis-section"><td colspan="2"><strong>Scope-Specific Quantities</strong></td></tr>
          ${scopeBasis}

          <tr class="basis-section"><td colspan="2"><strong>Scaffolding</strong></td></tr>
          ${sc.needsExternal && !sc.skippedExt ? `
          <tr><td>External scaffold volume</td><td>π × D × H_eff × width = π × ${D} × ${r1(sc.effectiveExtH)} × ${REPAIR_RATES.scaffolding.external.width} = <strong>${r1(sc.extVol)} m³</strong>${sc.effectiveExtH < H ? ` (capped at ${maxIfrH} m for IFR/EFR scope)` : ''}</td></tr>
          <tr><td>External platform area</td><td>π × D × width × nPlatforms = <strong>${r1(sc.extPlatforms)} m²</strong> (one platform every ${REPAIR_RATES.scaffolding.external.platformInterval} m)</td></tr>` : sc.skippedExt ? `<tr><td>External scaffold</td><td>Omitted — paint height ≤ 2 m (man height, no scaffold required)</td></tr>` : ''}
          ${sc.needsInternal && !sc.skippedInt ? `
          <tr><td>Internal scaffold volume</td><td>π/4 × D² × H_eff = π/4 × ${D}² × ${r1(sc.effectiveIntH)} = <strong>${r1(sc.intVol)} m³</strong>${sc.effectiveIntH < H ? ` (capped at ${maxIfrH} m for IFR/EFR scope)` : ''}</td></tr>` : sc.skippedInt ? `<tr><td>Internal scaffold</td><td>Omitted — paint height ≤ 2 m (man height, no scaffold required)</td></tr>` : ''}

          <tr class="basis-section"><td colspan="2"><strong>Labour Basis</strong></td></tr>
          <tr><td>Welder productivity</td><td>60 mm/min/pass (site butt welds). Shop MH from unit manhour tables in cost_rates.js. Site MH applied additionally for all site-erected steelwork.</td></tr>
          <tr><td>Indirect labour</td><td>${indPct}% of direct MH × S$${COST_RATES.labour.rates.IND}/hr (Safety Officer, QC Inspector blended rate)</td></tr>
          <tr><td>Shop fabrication premium (repair)</td><td>${repPrem}% above new-build fab rates (small-batch set-up premium)</td></tr>

          <tr class="basis-section"><td colspan="2"><strong>Cost Rates Basis</strong></td></tr>
          <tr><td>Plate material</td><td>SGD/tonne delivered to fabrication yard — from cost_rates.js</td></tr>
          <tr><td>Painting</td><td>All-in $/m² rates (blast preparation included). No separate scaffold for paint height ≤ 2 m.</td></tr>
          <tr><td>Currency / Basis</td><td>SGD. SE Asia market, Q1 2025 (assumed). Accuracy ±20–25%.</td></tr>
        </tbody>
      </table>
    </div>`;
}

// ---------------------------------------------------------------------------
// Master render
// ---------------------------------------------------------------------------
function renderRepairOutput(rState, contingencyPct) {
  const est = assembleRepairEstimate(rState);
  const contingencyAmt = est.subtotal * (contingencyPct / 100);
  const grandTotal     = est.subtotal + contingencyAmt;
  const now            = new Date();
  const dateStr        = now.toLocaleDateString('en-SG', { year:'numeric', month:'long', day:'numeric' });

  const sc  = est.scaffolding;
  let scfRows = '';
  if (sc.needsExternal && !sc.skippedExt) {
    scfRows += `
    <tr class="sub-row"><td>External scaffold — volume (${r1(sc.extVol)} m³)</td><td class="num">${r1(sc.extVol)} m³</td><td class="num">S$${REPAIR_RATES.scaffolding.external.perM3}/m³</td><td class="num">${SGD_R(sc.extVol * REPAIR_RATES.scaffolding.external.perM3)}</td></tr>
    <tr class="sub-row"><td>External scaffold — working platforms (${r1(sc.extPlatforms)} m²)</td><td class="num">${r1(sc.extPlatforms)} m²</td><td class="num">S$${REPAIR_RATES.scaffolding.external.platformPerM2}/m²</td><td class="num">${SGD_R(sc.extPlatforms * REPAIR_RATES.scaffolding.external.platformPerM2)}</td></tr>`;
  } else if (sc.needsExternal && sc.skippedExt) {
    scfRows += `<tr class="sub-row"><td>External scaffold — omitted (paint height ≤ 2 m)</td><td class="num">—</td><td class="num">—</td><td class="num">S$ 0</td></tr>`;
  }
  if (sc.needsInternal && !sc.skippedInt) {
    scfRows += `
    <tr class="sub-row"><td>Internal scaffold — tower system (${r1(sc.intVol)} m³)</td><td class="num">${r1(sc.intVol)} m³</td><td class="num">S$${REPAIR_RATES.scaffolding.internal.perM3}/m³</td><td class="num">${SGD_R(sc.intVol * REPAIR_RATES.scaffolding.internal.perM3)}</td></tr>`;
  } else if (sc.needsInternal && sc.skippedInt) {
    scfRows += `<tr class="sub-row"><td>Internal scaffold — omitted (paint height ≤ 2 m)</td><td class="num">—</td><td class="num">—</td><td class="num">S$ 0</td></tr>`;
  }
  if (sc.scfLabourCost > 0)
    scfRows += `<tr class="sub-row"><td>Scaffolder labour — erect &amp; dismantle</td><td class="num">—</td><td class="num">—</td><td class="num">${SGD_R(sc.scfLabourCost)}</td></tr>`;

  let scopeRows = '';
  est.repairs.forEach((res, idx) => {
    const letter = String.fromCharCode(65 + idx);
    const fn = REPAIR_RENDERERS[res.id];
    scopeRows += `
      <tr class="cat-row"><td colspan="4">${letter} — ${res.label}</td></tr>
      ${fn ? fn(res) : ''}
      <tr class="subtotal-row"><td colspan="3">Subtotal</td><td class="num">${SGD_R(res.directCost)}</td></tr>`;
  });

  const html = `
    <div class="output-header">
      <div class="output-header-left">
        <div class="output-title">Tank Repair / Retrofit</div>
        <div class="output-subtitle">Indicative Cost Estimate — ${APP_VERSION_REPAIR}</div>
      </div>
      <div class="accuracy-badge">±20–25%<br><span>Indicative</span></div>
    </div>

    <div class="card">
      <div class="card-title">Existing Tank</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px 20px;font-size:13px;">
        <div><span style="color:var(--text-muted)">Diameter</span><br><strong>${r1(rState.diameter)} m</strong></div>
        <div><span style="color:var(--text-muted)">Shell Height</span><br><strong>${r1(rState.shellHeight)} m</strong></div>
        <div><span style="color:var(--text-muted)">Material</span><br><strong>${rState.shellMaterial}</strong></div>
        <div><span style="color:var(--text-muted)">Outer Roof</span><br><strong>${roofLabel(rState.currentRoofType)}</strong></div>
        <div><span style="color:var(--text-muted)">Floating Roof</span><br><strong>${floatLabel(rState)}</strong></div>
        <div><span style="color:var(--text-muted)">Specific Gravity</span><br><strong>${rState.specificGravity}</strong></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Repair Scope — Cost Estimate</div>
      <table class="cost-table">
        <thead><tr><th>Description</th><th class="num">Qty / Unit</th><th class="num">Unit Rate</th><th class="num">SGD</th></tr></thead>
        <tbody>
          ${scopeRows}

          <tr><td colspan="4" style="padding:4px 0;"></td></tr>
          <tr class="cat-row"><td colspan="4">Scaffolding</td></tr>
          ${scfRows}
          <tr class="subtotal-row"><td colspan="3">Scaffolding Subtotal</td><td class="num">${SGD_R(sc.total)}</td></tr>

          <tr class="cat-row"><td colspan="4">Mobilisation</td></tr>
          <tr class="sub-row"><td>Site mobilisation (1% of direct scope, min S$5,000 / max S$15,000)</td><td class="num">1 LS</td><td class="num">—</td><td class="num">${SGD_R(est.mobilisation)}</td></tr>
          <tr class="subtotal-row"><td colspan="3">Mobilisation Subtotal</td><td class="num">${SGD_R(est.mobilisation)}</td></tr>

          <tr><td colspan="4" style="padding:6px 0;"></td></tr>
          <tr class="subtotal-row"><td colspan="3" style="font-size:14px;">Subtotal (before contingency)</td><td class="num" style="font-size:14px;">${SGD_R(est.subtotal)}</td></tr>
          <tr class="contingency-row"><td colspan="3">Contingency (${contingencyPct}%)</td><td class="num">${SGD_R(contingencyAmt)}</td></tr>
          <tr class="total-row"><td colspan="3">TOTAL ESTIMATED REPAIR COST</td><td class="num">${SGD_R(grandTotal)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="exclusions-box">
        <div class="exc-header">⛔ ITEMS EXCLUDED FROM THIS ESTIMATE</div>
        <div class="exc-body">
          <ul>
            <li><strong>Tank cleaning, gas freeing &amp; ventilation</strong> — prior to entry; cost depends on product history. Budget separately.</li>
            <li><strong>NDE beyond standard QC</strong> — UT scan, radiography, MPI scope per inspection findings.</li>
            <li><strong>Foundation &amp; civil works</strong> — ring beam, settlement repair, bund walls</li>
            <li><strong>Nozzle internals</strong> — suction strainers, dip pipes</li>
            <li><strong>Instrumentation</strong> — level gauges, sensors, transmitters</li>
            <li><strong>External pipework</strong> — beyond nozzle face</li>
            <li><strong>Regulatory submissions</strong> — SCDF, NEA or other authority approvals</li>
            <li><strong>Engineering &amp; project management fees</strong></li>
            <li><strong>Hydrostatic test</strong> — if required following bottom or shell repair; budget separately</li>
          </ul>
          <div class="exc-warn">⚠ Tank cleaning / gas freeing can be a significant cost and schedule driver. Obtain a specialist quote early.</div>
        </div>
      </div>
    </div>

    ${renderCalcBasis(rState, est)}
  `;

  document.getElementById('repair-output-content').innerHTML = html;
}

function roofLabel(rt) {
  return { coneCS:'Fixed Cone (CS)', domeCS:'Fixed Dome (CS)', domeAL:'Geodesic Dome (Alum)',
           efr:'External Floating Roof', openTop:'Open Top' }[rt] || rt || '—';
}
function floatLabel(rs) {
  if (rs.currentIFR && rs.currentIFR !== 'none')
    return 'IFR — ' + (rs.currentIFR === 'ifrPontoon' ? 'Pontoon' : 'Full Contact');
  if (rs.currentEFR) return 'EFR — ' + (rs.currentEFR === 'efrSingle' ? 'Single Deck' : 'Double Deck');
  return 'None';
}
