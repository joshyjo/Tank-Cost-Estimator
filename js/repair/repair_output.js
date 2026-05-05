// =============================================================================
// REPAIR_OUTPUT.JS — Repair Estimate Rendering
// =============================================================================

const APP_VERSION_REPAIR = 'v1.2.0';

function SGD_R(v) { return 'S$ ' + Math.round(v).toLocaleString('en-SG'); }
function pct(v) { return (v * 100).toFixed(1) + '%'; }
function t2(v) { return (v).toFixed(2); }
function r1(v) { return (v).toFixed(1); }

// ---------------------------------------------------------------------------
// Render one labour breakdown table row-block
// ---------------------------------------------------------------------------
function labourRows(lab, tradeList) {
  if (!lab) return '';
  const trades = tradeList || ['WLD','FTR','RIG','FMN','HLP'];
  const rates  = COST_RATES.labour.rates;
  let rows = '';
  trades.forEach(t => {
    const mh = lab.mh[t] || 0;
    if (mh > 0)
      rows += `<tr class="sub-row"><td>&nbsp;&nbsp;&nbsp;${t} — ${tradeName(t)} (${r1(mh)} MH @ S$${rates[t]}/hr)</td><td class="num">${r1(mh)} MH</td><td class="num">${SGD_R(lab.cost[t]||0)}</td></tr>`;
  });
  if (lab.indirectMH > 0)
    rows += `<tr class="sub-row"><td>&nbsp;&nbsp;&nbsp;Indirect labour — Safety Officer / QC (${r1(lab.indirectMH)} MH @ S$${rates.IND}/hr)</td><td class="num">${r1(lab.indirectMH)} MH</td><td class="num">${SGD_R(lab.indirectCost)}</td></tr>`;
  return rows;
}

function tradeName(t) {
  return {WLD:'Welder',FTR:'Fitter',RIG:'Rigger',SCF:'Scaffolder',FMN:'Foreman',HLP:'Helper',IND:'Indirect'}[t] || t;
}

// ---------------------------------------------------------------------------
// Repair-specific section renderers (one per R-scope)
// ---------------------------------------------------------------------------
function renderR01(res) {
  return `
    <tr class="sub-row"><td>IFR weight (${res.label})</td><td class="num">${t2(res.ifrWeight)} t</td><td class="num">${SGD_R(res.plateCost)}</td></tr>
    <tr class="sub-row"><td>Shop fabrication (repair premium applied)</td><td class="num">—</td><td class="num">${SGD_R(res.fabCost)}</td></tr>
    ${labourRows(res.labour)}
    <tr class="sub-row"><td>Rim seal supply</td><td class="num">—</td><td class="num">${SGD_R(res.rimCost)}</td></tr>
    ${res.paintCost > 0 ? `<tr class="sub-row"><td>Floating roof painting</td><td class="num">—</td><td class="num">${SGD_R(res.paintCost)}</td></tr>` : ''}`;
}

function renderR02(res) {
  return `
    <tr class="sub-row"><td>Floating roof removal — ${res.floatLabel} (${t2(res.floatWeight)} t)</td><td class="num">${t2(res.floatWeight)} t</td><td class="num">—</td></tr>
    ${labourRows(res.labour)}`;
}

function renderR03(res) {
  let rows = '';
  res.results.forEach(sub => {
    rows += `<tr class="sub-row"><td><strong>${sub.desc}</strong></td><td class="num">${sub.weight ? t2(sub.weight)+' t' : '—'}</td><td class="num">${SGD_R(sub.sub)}</td></tr>`;
    if (sub.plateCost) rows += `<tr class="sub-row"><td>&nbsp;&nbsp;&nbsp;Material supply</td><td class="num">—</td><td class="num">${SGD_R(sub.plateCost)}</td></tr>`;
    if (sub.fabCost)   rows += `<tr class="sub-row"><td>&nbsp;&nbsp;&nbsp;Shop fabrication</td><td class="num">—</td><td class="num">${SGD_R(sub.fabCost)}</td></tr>`;
    if (sub.supplyCost) rows += `<tr class="sub-row"><td>&nbsp;&nbsp;&nbsp;Vendor supply</td><td class="num">—</td><td class="num">${SGD_R(sub.supplyCost)}</td></tr>`;
    if (sub.labour)    rows += labourRows(sub.labour);
  });
  return rows;
}

function renderR04(res) {
  return `
    <tr class="sub-row"><td>Bottom area to ${res.isFullReplacement ? 'replace' : 'repair'} (${t2(res.repairArea)} m², ${res.t_mm} mm plate)</td><td class="num">${t2(res.weight)} t</td><td class="num">${SGD_R(res.plateCost)}</td></tr>
    <tr class="sub-row"><td>Shop fabrication (repair premium applied)</td><td class="num">—</td><td class="num">${SGD_R(res.fabCost)}</td></tr>
    ${labourRows(res.labour)}
    ${res.jackingCost > 0 ? `<tr class="sub-row"><td>Tank jacking — lump sum mobilisation + per m circumference (π×D)</td><td class="num">1 LS</td><td class="num">${SGD_R(res.jackingCost)}</td></tr>` : ''}`;
}

function renderR05(res) {
  return `
    <tr class="sub-row"><td>Shell repair area (${t2(res.repairArea)} m², avg ${r1(res.avgT_mm)} mm plate)</td><td class="num">${t2(res.weight)} t</td><td class="num">${SGD_R(res.plateCost)}</td></tr>
    <tr class="sub-row"><td>Shop fabrication (repair premium applied)</td><td class="num">—</td><td class="num">${SGD_R(res.fabCost)}</td></tr>
    ${labourRows(res.labour)}`;
}

function renderR06(res) {
  return `
    <tr class="sub-row"><td>Roof plate replacement (${res.pct}% of roof area, ${t2(res.weight)} t)</td><td class="num">${t2(res.weight)} t</td><td class="num">${SGD_R(res.plateCost)}</td></tr>
    <tr class="sub-row"><td>Shop fabrication (repair premium applied)</td><td class="num">—</td><td class="num">${SGD_R(res.fabCost)}</td></tr>
    ${labourRows(res.labour)}`;
}

function renderR07(res) {
  return `
    <tr class="sub-row"><td>Aluminium geodesic dome — vendor supply + install (${r1(res.domeArea)} m²)</td><td class="num">${r1(res.domeArea)} m²</td><td class="num">${SGD_R(res.vendorCost)}</td></tr>
    ${labourRows(res.domeInstLabour, ['FTR','RIG','FMN','HLP'])}
    ${res.removalCost > 0 ? `<tr class="sub-row"><td>Existing roof removal</td><td class="num">—</td><td class="num">${SGD_R(res.removalCost)}</td></tr>` : ''}`;
}

function renderR08(res) {
  return `
    <tr class="sub-row"><td>Rim seal supply — ${res.sealKey} (${r1(res.circumference)} m circ.)</td><td class="num">${r1(res.circumference)} m</td><td class="num">${SGD_R(res.supplyCost)}</td></tr>
    ${labourRows(res.labour, ['FTR','FMN','HLP'])}`;
}

function renderR09(res) {
  let rows = '';
  res.lineItems.forEach(li => {
    rows += `<tr class="sub-row"><td>${li.desc}</td><td class="num">—</td><td class="num">${SGD_R(li.supply + li.labour.totalLabourCost)}</td></tr>`;
    rows += `<tr class="sub-row"><td>&nbsp;&nbsp;&nbsp;Nozzle supply (material)</td><td class="num">—</td><td class="num">${SGD_R(li.supply)}</td></tr>`;
    rows += labourRows(li.labour);
  });
  return rows;
}

function renderR10(res) {
  return `<tr class="sub-row"><td>Internal coating — ${r1(res.totalArea)} m² (shell ${r1(res.paintH)} m ht + bottom)</td><td class="num">${r1(res.totalArea)} m²</td><td class="num">${SGD_R(res.paintCost)}</td></tr>`;
}

function renderR11(res) {
  return `
    <tr class="sub-row"><td>External shell coating — ${r1(res.shellArea)} m²</td><td class="num">${r1(res.shellArea)} m²</td><td class="num">${SGD_R(res.shellCost)}</td></tr>
    ${res.roofCost > 0 ? `<tr class="sub-row"><td>External roof coating — ${r1(res.roofArea)} m²</td><td class="num">${r1(res.roofArea)} m²</td><td class="num">${SGD_R(res.roofCost)}</td></tr>` : ''}`;
}

function renderR12(res) {
  let rows = '';
  res.lineItems.forEach(li => {
    rows += `<tr class="sub-row"><td>${li.desc} (${t2(li.weight)} t)</td><td class="num">${t2(li.weight)} t</td><td class="num">${SGD_R(li.sub)}</td></tr>`;
    rows += `<tr class="sub-row"><td>&nbsp;&nbsp;&nbsp;Material + shop fabrication</td><td class="num">—</td><td class="num">${SGD_R(li.plateCost + li.fabCost)}</td></tr>`;
    rows += labourRows(li.labour);
  });
  return rows;
}

function renderR13(res) {
  return `
    <tr class="sub-row"><td>Stilling well — pipe material (${r1(res.length)} m, ${t2(res.weight)} t)</td><td class="num">${t2(res.weight)} t</td><td class="num">${SGD_R(res.plateCost)}</td></tr>
    <tr class="sub-row"><td>Shop fabrication + perforation (repair premium applied)</td><td class="num">—</td><td class="num">${SGD_R(res.fabCost)}</td></tr>
    ${labourRows(res.labour)}`;
}

function renderR14(res) {
  return `
    <tr class="sub-row"><td>Sacrificial anodes — ${res.anodeCount} anodes (${r1(res.totalArea)} m² protected area)</td><td class="num">${res.anodeCount} ea</td><td class="num">${SGD_R(res.materialCost)}</td></tr>
    ${labourRows(res.labour, ['FTR','FMN','HLP'])}
    ${res.removalLabourCost > 0 ? `<tr class="sub-row"><td>Existing anode removal</td><td class="num">—</td><td class="num">${SGD_R(res.removalLabourCost)}</td></tr>` : ''}`;
}

function renderR15(res) {
  return `
    ${res.pvSupply  > 0 ? `<tr class="sub-row"><td>P/V vent supply</td><td class="num">—</td><td class="num">${SGD_R(res.pvSupply)}</td></tr>` : ''}
    ${res.emSupply  > 0 ? `<tr class="sub-row"><td>Emergency vent supply</td><td class="num">—</td><td class="num">${SGD_R(res.emSupply)}</td></tr>` : ''}
    ${labourRows(res.labour)}`;
}

const REPAIR_RENDERERS = { r01:renderR01, r02:renderR02, r03:renderR03, r04:renderR04,
  r05:renderR05, r06:renderR06, r07:renderR07, r08:renderR08, r09:renderR09,
  r10:renderR10, r11:renderR11, r12:renderR12, r13:renderR13, r14:renderR14, r15:renderR15 };

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
  if (sc.needsExternal) scfRows += `
    <tr class="sub-row"><td>External scaffold — volume (${r1(sc.extVol)} m³ @ S$${REPAIR_RATES.scaffolding.external.perM3}/m³)</td><td class="num">${r1(sc.extVol)} m³</td><td class="num">${SGD_R(sc.extVol * REPAIR_RATES.scaffolding.external.perM3)}</td></tr>
    <tr class="sub-row"><td>External scaffold — working platforms (${r1(sc.extPlatforms)} m² @ S$${REPAIR_RATES.scaffolding.external.platformPerM2}/m²)</td><td class="num">${r1(sc.extPlatforms)} m²</td><td class="num">${SGD_R(sc.extPlatforms * REPAIR_RATES.scaffolding.external.platformPerM2)}</td></tr>`;
  if (sc.needsInternal) scfRows += `
    <tr class="sub-row"><td>Internal scaffold — tower system (${r1(sc.intVol)} m³ @ S$${REPAIR_RATES.scaffolding.internal.perM3}/m³)</td><td class="num">${r1(sc.intVol)} m³</td><td class="num">${SGD_R(sc.intVol * REPAIR_RATES.scaffolding.internal.perM3)}</td></tr>`;
  if (sc.scfLabourCost > 0) scfRows += `
    <tr class="sub-row"><td>Scaffolder labour — erect &amp; dismantle</td><td class="num">—</td><td class="num">${SGD_R(sc.scfLabourCost)}</td></tr>`;

  let scopeRows = '';
  est.repairs.forEach((res, idx) => {
    const letter = String.fromCharCode(65 + idx);
    const fn = REPAIR_RENDERERS[res.id];
    scopeRows += `
      <tr class="cat-row"><td colspan="3">${letter} — ${res.label}</td></tr>
      ${fn ? fn(res) : ''}
      <tr class="subtotal-row"><td colspan="2">Subtotal</td><td class="num">${SGD_R(res.directCost)}</td></tr>`;
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
        <thead><tr><th>Description</th><th class="num">Qty / Unit</th><th class="num">SGD</th></tr></thead>
        <tbody>
          ${scopeRows}

          <tr><td colspan="3" style="padding:4px 0;"></td></tr>
          <tr class="cat-row"><td colspan="3">Scaffolding</td></tr>
          ${scfRows}
          <tr class="subtotal-row"><td colspan="2">Scaffolding Subtotal</td><td class="num">${SGD_R(sc.total)}</td></tr>

          <tr class="cat-row"><td colspan="3">Mobilisation</td></tr>
          <tr class="sub-row"><td>Site mobilisation (1% of direct scope, min S$5,000 / max S$15,000)</td><td class="num">1 LS</td><td class="num">${SGD_R(est.mobilisation)}</td></tr>
          <tr class="subtotal-row"><td colspan="2">Mobilisation Subtotal</td><td class="num">${SGD_R(est.mobilisation)}</td></tr>

          <tr><td colspan="3" style="padding:6px 0;"></td></tr>
          <tr class="subtotal-row"><td colspan="2" style="font-size:14px;">Subtotal (before contingency)</td><td class="num" style="font-size:14px;">${SGD_R(est.subtotal)}</td></tr>
          <tr class="contingency-row"><td colspan="2">Contingency (${contingencyPct}%)</td><td class="num">${SGD_R(contingencyAmt)}</td></tr>
          <tr class="total-row"><td colspan="2">TOTAL ESTIMATED REPAIR COST</td><td class="num">${SGD_R(grandTotal)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="exclusions-box">
        <div class="exc-header">⛔ ITEMS EXCLUDED FROM THIS ESTIMATE</div>
        <div class="exc-body">
          <ul>
            <li><strong>Tank cleaning, gas freeing &amp; ventilation</strong> — prior to entry; cost and duration depends on product history. Must be budgeted separately.</li>
            <li><strong>Non-destructive examination (NDE)</strong> — UT scan, radiography, or MPI beyond standard repair QC; scope determined by inspection findings.</li>
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

    <div class="card">
      <div class="card-title">Basis of Estimate</div>
      <div style="font-size:12px;color:var(--text-sec);line-height:2;">
        <p><strong>Design standard:</strong> API 650 / API 653. Labour manhours derived from welder productivity of 60 mm/min/pass (site butt welds).</p>
        <p><strong>Labour basis:</strong> All-in subcontractor rates (inclusive of overhead &amp; margin). Indirect labour at ${pct(COST_RATES.labour.indirectPct)} of direct manhours (Safety Officer, QC Inspector).</p>
        <p><strong>Scaffolding:</strong> External — π×D×H×${REPAIR_RATES.scaffolding.external.width} m band @ S$${REPAIR_RATES.scaffolding.external.perM3}/m³ plus platforms. Internal — tank volume @ S$${REPAIR_RATES.scaffolding.internal.perM3}/m³.</p>
        <p><strong>Repair shop premium:</strong> ${pct(REPAIR_RATES.repairShopPremium)} above new-build fabrication rates (small-batch set-up premium).</p>
        <p><strong>Cost rates basis:</strong> Estimated SE Asia market, Q1 2025 (SGD). Rates are assumed — calibrate against completed repair projects. Accuracy: ±20–25%.</p>
        <p><strong>Prepared by:</strong> API 650 Tank Cost Estimator ${APP_VERSION_REPAIR} &nbsp;|&nbsp; ${dateStr}</p>
      </div>
    </div>
  `;

  document.getElementById('repair-output-content').innerHTML = html;
}

function roofLabel(rt) {
  return { coneCS:'Fixed Cone (CS)', domeCS:'Fixed Dome (CS)', domeAL:'Geodesic Dome (Alum)', efr:'External Floating Roof', openTop:'Open Top' }[rt] || rt || '—';
}
function floatLabel(rs) {
  if (rs.currentIFR && rs.currentIFR !== 'none') return 'IFR — ' + (rs.currentIFR === 'ifrPontoon' ? 'Pontoon' : 'Full Contact');
  if (rs.currentEFR) return 'EFR — ' + (rs.currentEFR === 'efrSingle' ? 'Single Deck' : 'Double Deck');
  return 'None';
}
