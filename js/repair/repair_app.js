// =============================================================================
// REPAIR_APP.JS — Repair Module Wizard Flow & State
// =============================================================================

const REPAIR_STATE = {
  // Existing tank
  diameter:        null,
  shellHeight:     null,
  shellMaterial:   null,
  specificGravity: 1.0,
  currentRoofType: null,  // 'coneCS'|'domeCS'|'domeAL'|'efr'|'openTop'
  currentIFR:      'none',
  currentEFR:      null,

  // Selected repairs
  selected: { r01:false, r02:false, r03:false, r04:false, r05:false, r06:false,
               r07:false, r08:false, r09:false, r10:false, r11:false, r12:false,
               r13:false, r14:false, r15:false },

  // Per-repair detail state
  r01: { ifrType:'ifrPontoon', rimSealType:'primary', floatingRoofPaint:'none' },
  r02: {},
  r03: { subScopes:{ deckPatch:false, pontoonRepair:false, legReplace:false,
                      bleederVent:false, vacuumBreaker:false, fullDeckReplace:false },
          deckPatchPct:0, pontoonRepairPct:0, legCount:0,
          bleederVentQty:0, vacuumBreakerQty:0 },
  r04: { scope:'partial', partialPct:25, newCA:3 },
  r05: { shellAreaPct:25, newCA:3 },
  r06: { scope:'full', partialPct:50 },
  r07: { isReplacement:false, existingDomeMaterial:'CS' },
  r08: { rimSealType:'primary' },
  r09: { material:'CS', nozzles:{ add_small:0, add_medium:0, add_large:0, add_mh:0,
                                    replace_small:0, replace_medium:0, replace_large:0, replace_mh:0 } },
  r10: { coatingType:'glassFlake', paintHeight:null },
  r11: { coatingType:'standard', scope:'shellOnly' },
  r12: { subScopes:{ spiralStair:false, cageLadder:false, roofPlatform:false, windGirder:false },
          windGirderRings:1 },
  r13: { pipeNPS:'8in', length:null },
  r14: { scope:'new', protectionArea:'bottomOnly' },
  r15: { pvVentQty:0, emergencyVentQty:0, material:'CS' },

  contingencyPct: 15
};

const REPAIR_LABELS = {
  r01:'R01 — Add Internal Floating Roof (IFR)',
  r02:'R02 — Remove Existing IFR / EFR',
  r03:'R03 — Repair IFR / EFR',
  r04:'R04 — Tank Bottom Repair or Replacement',
  r05:'R05 — Shell Plate Replacement',
  r06:'R06 — Cone / Dome Roof Replacement',
  r07:'R07 — Add / Replace Aluminium Geodesic Dome',
  r08:'R08 — Rim Seal Replacement',
  r09:'R09 — Nozzle Additions / Replacements',
  r10:'R10 — Internal Coating / Lining',
  r11:'R11 — External Coating',
  r12:'R12 — Structural Additions (Stair / Platform / Wind Girder)',
  r13:'R13 — Stilling Well Addition',
  r14:'R14 — Cathodic Protection',
  r15:'R15 — Venting Upgrades'
};

// ---------------------------------------------------------------------------
// Initialise — called from landing page "Start Repair Estimate"
// ---------------------------------------------------------------------------
function initRepairModule() {
  document.getElementById('landing-screen').style.display    = 'none';
  document.getElementById('newbuild-wrapper').style.display  = 'none';
  document.getElementById('repair-wrapper').style.display    = 'flex';
  document.getElementById('app-header').querySelector('p').textContent =
    'Tank Repair & Retrofit — Indicative Cost Estimation';
  buildRepairUI();
  showRepairStep('select');
}

function exitRepairModule() {
  document.getElementById('repair-wrapper').style.display   = 'none';
  document.getElementById('landing-screen').style.display   = 'flex';
  document.getElementById('app-header').querySelector('p').textContent =
    'Indicative project cost estimation for aboveground atmospheric storage tanks';
}

// ---------------------------------------------------------------------------
// Step navigation
// ---------------------------------------------------------------------------
function showRepairStep(step) {
  document.querySelectorAll('.repair-step').forEach(p => p.classList.remove('active'));
  document.getElementById('repair-step-' + step).classList.add('active');
  // Sidebar
  document.querySelectorAll('#repair-sidebar li[data-rstep]').forEach(li => {
    li.classList.remove('active','done');
    const s = li.dataset.rstep;
    if (s === step) li.classList.add('active');
    else if (stepOrder(s) < stepOrder(step)) li.classList.add('done');
  });
}

function stepOrder(s) { return {select:0, tank:1, details:2, options:3, output:4}[s] || 0; }

// ---------------------------------------------------------------------------
// STEP: SELECT  (checklist of repairs)
// ---------------------------------------------------------------------------
function buildRepairUI() {
  const list = document.getElementById('repair-select-list');
  list.innerHTML = Object.keys(REPAIR_LABELS).map(id => `
    <label class="repair-check-item" id="check-wrap-${id}">
      <input type="checkbox" id="chk-${id}" onchange="toggleRepairSelection('${id}', this.checked)">
      <span class="repair-check-label">${REPAIR_LABELS[id]}</span>
    </label>`).join('');
}

function toggleRepairSelection(id, checked) {
  REPAIR_STATE.selected[id] = checked;
  validateRepairSelections();
}

function validateRepairSelections() {
  const any = Object.values(REPAIR_STATE.selected).some(v => v);
  document.getElementById('repair-select-next').disabled = !any;
}

// ---------------------------------------------------------------------------
// STEP: TANK DETAILS
// ---------------------------------------------------------------------------
function buildTankDetailsForm() {
  // Pre-fill from state if returning
  setVal('r-diameter',    REPAIR_STATE.diameter);
  setVal('r-shellHeight', REPAIR_STATE.shellHeight);
  setVal('r-sg',         REPAIR_STATE.specificGravity || 1.0);
}

function collectTankDetails() {
  const errs = [];
  const D = parseFloat(document.getElementById('r-diameter').value);
  const H = parseFloat(document.getElementById('r-shellHeight').value);
  const G = parseFloat(document.getElementById('r-sg').value);
  const mat  = document.getElementById('r-material').value;
  const roof = document.getElementById('r-roof-type').value;
  const ifr  = document.getElementById('r-ifr-type').value;
  const efr  = document.getElementById('r-efr-type').value;

  if (!D || D < 1 || D > 120) errs.push('Diameter must be 1–120 m.');
  if (!H || H < 1 || H > 25)  errs.push('Shell height must be 1–25 m.');
  if (!G || G < 0.5 || G > 2.5) errs.push('Specific gravity must be 0.5–2.5.');
  if (!mat)  errs.push('Select a shell material.');
  if (!roof) errs.push('Select the existing roof type.');

  showRepairFormError('tank-err', errs);
  if (errs.length) return false;

  REPAIR_STATE.diameter        = D;
  REPAIR_STATE.shellHeight     = H;
  REPAIR_STATE.specificGravity = G;
  REPAIR_STATE.shellMaterial   = mat;
  REPAIR_STATE.currentRoofType = roof;
  REPAIR_STATE.currentIFR      = ifr || 'none';
  REPAIR_STATE.currentEFR      = efr || null;
  return true;
}

// ---------------------------------------------------------------------------
// STEP: REPAIR DETAILS (dynamic panels per selected repair)
// ---------------------------------------------------------------------------
function buildRepairDetailPanels() {
  const container = document.getElementById('repair-detail-panels');
  container.innerHTML = '';

  Object.keys(REPAIR_STATE.selected).forEach(id => {
    if (!REPAIR_STATE.selected[id]) return;
    const panel = document.createElement('div');
    panel.className = 'card repair-detail-card';
    panel.id = 'detail-' + id;
    panel.innerHTML = `<div class="card-title">${REPAIR_LABELS[id]}</div>${buildDetailForm(id)}`;
    container.appendChild(panel);
  });
}

function buildDetailForm(id) {
  const D = REPAIR_STATE.diameter;
  const H = REPAIR_STATE.shellHeight;
  const hasIFR = REPAIR_STATE.currentIFR && REPAIR_STATE.currentIFR !== 'none';
  const hasEFR = REPAIR_STATE.currentEFR;

  const forms = {
    r01: () => `
      <div class="form-row">
        <div class="form-group"><label>IFR Type</label>
          <select id="r01-ifrType" onchange="REPAIR_STATE.r01.ifrType=this.value">
            <option value="ifrPontoon" ${REPAIR_STATE.r01.ifrType==='ifrPontoon'?'selected':''}>Pontoon type</option>
            <option value="ifrFullContact" ${REPAIR_STATE.r01.ifrType==='ifrFullContact'?'selected':''}>Full contact type</option>
          </select>
        </div>
        <div class="form-group"><label>Rim Seal</label>
          <select id="r01-rimSeal" onchange="REPAIR_STATE.r01.rimSealType=this.value">
            <option value="primary">Primary only</option>
            <option value="primarySecondary">Primary + Secondary</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>IFR Paint</label>
        <select onchange="REPAIR_STATE.r01.floatingRoofPaint=this.value">
          <option value="none">No painting</option>
          <option value="topOnly">Top surface only</option>
          <option value="undersideOnly">Underside only</option>
          <option value="both">Both top and underside</option>
        </select>
      </div>`,

    r02: () => `<div class="notice info"><span class="notice-icon">ℹ</span>
      <div>Removal costed from existing floating roof weight (read from existing tank details above). No additional inputs required.</div></div>`,

    r03: () => {
      if (!hasIFR && !hasEFR) return `<div class="notice warn"><span class="notice-icon">⚠</span><div>No floating roof specified in existing tank details. Please go back and set the floating roof type.</div></div>`;
      return `
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">Select all sub-scopes that apply:</p>
        <label class="repair-check-item"><input type="checkbox" onchange="REPAIR_STATE.r03.subScopes.deckPatch=this.checked;toggle('r03-deck',this.checked)"> Deck plate patching</label>
        <div id="r03-deck" style="display:none;margin-left:20px;margin-bottom:8px;">
          <div class="form-group"><label>% of total deck area to replace</label>
            <input type="number" min="1" max="100" value="${REPAIR_STATE.r03.deckPatchPct||10}" oninput="REPAIR_STATE.r03.deckPatchPct=+this.value"><span class="hint">1–100%</span></div></div>
        <label class="repair-check-item"><input type="checkbox" onchange="REPAIR_STATE.r03.subScopes.pontoonRepair=this.checked;toggle('r03-pont',this.checked)"> Pontoon repair</label>
        <div id="r03-pont" style="display:none;margin-left:20px;margin-bottom:8px;">
          <div class="form-group"><label>% of pontoon area to repair</label>
            <input type="number" min="1" max="100" value="${REPAIR_STATE.r03.pontoonRepairPct||20}" oninput="REPAIR_STATE.r03.pontoonRepairPct=+this.value"><span class="hint">1–100%</span></div></div>
        <label class="repair-check-item"><input type="checkbox" onchange="REPAIR_STATE.r03.subScopes.legReplace=this.checked;toggle('r03-leg',this.checked)"> Support leg replacement</label>
        <div id="r03-leg" style="display:none;margin-left:20px;margin-bottom:8px;">
          <div class="form-group"><label>Number of legs to replace</label>
            <input type="number" min="1" value="${REPAIR_STATE.r03.legCount||4}" oninput="REPAIR_STATE.r03.legCount=+this.value"></div></div>
        <label class="repair-check-item"><input type="checkbox" onchange="REPAIR_STATE.r03.subScopes.bleederVent=this.checked;toggle('r03-bleed',this.checked)"> Bleeder vent replacement</label>
        <div id="r03-bleed" style="display:none;margin-left:20px;margin-bottom:8px;">
          <div class="form-group"><label>Quantity</label>
            <input type="number" min="1" value="${REPAIR_STATE.r03.bleederVentQty||4}" oninput="REPAIR_STATE.r03.bleederVentQty=+this.value"></div></div>
        <label class="repair-check-item"><input type="checkbox" onchange="REPAIR_STATE.r03.subScopes.vacuumBreaker=this.checked;toggle('r03-vb',this.checked)"> Vacuum breaker replacement</label>
        <div id="r03-vb" style="display:none;margin-left:20px;margin-bottom:8px;">
          <div class="form-group"><label>Quantity</label>
            <input type="number" min="1" value="${REPAIR_STATE.r03.vacuumBreakerQty||2}" oninput="REPAIR_STATE.r03.vacuumBreakerQty=+this.value"></div></div>
        <label class="repair-check-item"><input type="checkbox" onchange="REPAIR_STATE.r03.subScopes.fullDeckReplace=this.checked"> Full deck plate replacement (entire deck)</label>`;
    },

    r04: () => `
      <div class="form-row">
        <div class="form-group"><label>Scope</label>
          <select onchange="REPAIR_STATE.r04.scope=this.value;toggle('r04-pct',this.value==='partial')">
            <option value="partial" selected>Partial repair (scan-and-patch)</option>
            <option value="full">Full replacement (lift tank)</option>
          </select>
        </div>
        <div class="form-group" id="r04-pct"><label>% of bottom area to repair</label>
          <input type="number" min="1" max="99" value="${REPAIR_STATE.r04.partialPct}" oninput="REPAIR_STATE.r04.partialPct=+this.value">
          <span class="hint">e.g. 25 = 25% of bottom area</span>
        </div>
      </div>
      <div class="form-group"><label>New corrosion allowance (mm)</label>
        <input type="number" min="0" max="10" step="0.5" value="${REPAIR_STATE.r04.newCA}" oninput="REPAIR_STATE.r04.newCA=+this.value">
        <span class="hint">Applied to new bottom plate thickness calculation</span>
      </div>`,

    r05: () => `
      <div class="form-row">
        <div class="form-group"><label>Shell area to replace (% of total)</label>
          <input type="number" min="1" max="100" value="${REPAIR_STATE.r05.shellAreaPct}" oninput="REPAIR_STATE.r05.shellAreaPct=+this.value">
          <span class="hint">Total shell area = π × ${r1(D)} × ${r1(H)} = ${r1(Math.PI*D*H)} m²</span>
        </div>
        <div class="form-group"><label>New corrosion allowance (mm)</label>
          <input type="number" min="0" max="10" step="0.5" value="${REPAIR_STATE.r05.newCA}" oninput="REPAIR_STATE.r05.newCA=+this.value">
        </div>
      </div>`,

    r06: () => `
      <div class="form-row">
        <div class="form-group"><label>Scope</label>
          <select onchange="REPAIR_STATE.r06.scope=this.value;toggle('r06-pct',this.value==='partial')">
            <option value="full" selected>Full replacement</option>
            <option value="partial">Partial replacement</option>
          </select>
        </div>
        <div class="form-group" id="r06-pct" style="display:none"><label>% of roof area to replace</label>
          <input type="number" min="1" max="99" value="${REPAIR_STATE.r06.partialPct}" oninput="REPAIR_STATE.r06.partialPct=+this.value">
        </div>
      </div>`,

    r07: () => `
      <div class="form-row">
        <div class="form-group"><label>Installation type</label>
          <select onchange="REPAIR_STATE.r07.isReplacement=(this.value==='replace');toggle('r07-existMat',this.value==='replace')">
            <option value="new">New installation (no existing dome)</option>
            <option value="replace">Replacement (remove existing)</option>
          </select>
        </div>
        <div class="form-group" id="r07-existMat" style="display:none"><label>Existing dome material</label>
          <select onchange="REPAIR_STATE.r07.existingDomeMaterial=this.value">
            <option value="CS">Carbon steel</option>
            <option value="AL">Aluminium</option>
          </select>
        </div>
      </div>`,

    r08: () => `
      <div class="form-group"><label>Seal type to install</label>
        <select onchange="REPAIR_STATE.r08.rimSealType=this.value">
          <option value="primary">Primary seal only</option>
          <option value="primarySecondary">Primary + Secondary</option>
        </select>
      </div>`,

    r09: () => {
      const szLabels = { small:'Small (≤ 4" NPS)', medium:'Medium (6"–10" NPS)', large:'Large (12"–16" NPS)', mh:'Shell Manhole (20"/24")' };
      let rows = Object.keys(szLabels).map(sz => `
        <tr>
          <td style="padding:4px 8px;">${szLabels[sz]}</td>
          <td><input type="number" min="0" value="0" style="width:60px" oninput="REPAIR_STATE.r09.nozzles.add_${sz}=+this.value"></td>
          <td><input type="number" min="0" value="0" style="width:60px" oninput="REPAIR_STATE.r09.nozzles.replace_${sz}=+this.value"></td>
        </tr>`).join('');
      return `<div class="form-group"><label>Nozzle material</label>
        <select onchange="REPAIR_STATE.r09.material=this.value">
          <option value="CS">Carbon Steel</option>
          <option value="SS">Stainless Steel (match shell)</option>
        </select></div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr><th style="text-align:left;padding:4px 8px;">Size</th><th style="padding:4px;">Add (qty)</th><th style="padding:4px;">Replace (qty)</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    },

    r10: () => `
      <div class="form-row">
        <div class="form-group"><label>Coating system</label>
          <select onchange="REPAIR_STATE.r10.coatingType=this.value">
            <option value="glassFlake">Glass flake epoxy (heavy-duty)</option>
            <option value="standard">Standard epoxy</option>
          </select>
        </div>
        <div class="form-group"><label>Paint height (m) — blank = full shell height</label>
          <input type="number" min="0.1" max="${H}" step="0.1" placeholder="${r1(H)}" oninput="REPAIR_STATE.r10.paintHeight=this.value?+this.value:null">
          <span class="hint">Leave blank to coat full ${r1(H)} m shell height</span>
        </div>
      </div>`,

    r11: () => `
      <div class="form-row">
        <div class="form-group"><label>Coating system</label>
          <select onchange="REPAIR_STATE.r11.coatingType=this.value">
            <option value="standard">Standard epoxy (2-coat)</option>
            <option value="premium">Premium (3-coat zinc/epoxy/PU)</option>
          </select>
        </div>
        <div class="form-group"><label>Scope</label>
          <select onchange="REPAIR_STATE.r11.scope=this.value">
            <option value="shellOnly">Shell only</option>
            <option value="shellAndRoof">Shell + Roof</option>
          </select>
        </div>
      </div>`,

    r12: () => `
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">Select structural items to add:</p>
      <label class="repair-check-item"><input type="checkbox" onchange="REPAIR_STATE.r12.subScopes.spiralStair=this.checked"> Spiral staircase</label>
      <label class="repair-check-item"><input type="checkbox" onchange="REPAIR_STATE.r12.subScopes.cageLadder=this.checked"> Cage ladder</label>
      <label class="repair-check-item"><input type="checkbox" onchange="REPAIR_STATE.r12.subScopes.roofPlatform=this.checked"> Roof perimeter walkway</label>
      <label class="repair-check-item"><input type="checkbox" onchange="REPAIR_STATE.r12.subScopes.windGirder=this.checked;toggle('r12-wg',this.checked)"> Wind girder ring(s)</label>
      <div id="r12-wg" style="display:none;margin-left:20px;">
        <div class="form-group"><label>Number of rings</label>
          <input type="number" min="1" max="5" value="1" oninput="REPAIR_STATE.r12.windGirderRings=+this.value"></div></div>`,

    r13: () => `
      <div class="form-row">
        <div class="form-group"><label>Pipe NPS</label>
          <select onchange="REPAIR_STATE.r13.pipeNPS=this.value">
            <option value="6in">6" NPS</option>
            <option value="8in" selected>8" NPS</option>
            <option value="10in">10" NPS</option>
            <option value="12in">12" NPS</option>
          </select>
        </div>
        <div class="form-group"><label>Length (m) — blank = shell height (${r1(H)} m)</label>
          <input type="number" min="0.5" step="0.1" placeholder="${r1(H)}" oninput="REPAIR_STATE.r13.length=this.value?+this.value:null">
        </div>
      </div>`,

    r14: () => `
      <div class="form-row">
        <div class="form-group"><label>Installation type</label>
          <select onchange="REPAIR_STATE.r14.scope=this.value">
            <option value="new">New installation</option>
            <option value="replacement">Replacement of existing anodes</option>
          </select>
        </div>
        <div class="form-group"><label>Protection area</label>
          <select onchange="REPAIR_STATE.r14.protectionArea=this.value">
            <option value="bottomOnly">Bottom plate only</option>
            <option value="bottomAndShell">Bottom + lower shell (${REPAIR_RATES.cp.shellProtectionHeight*1000} mm)</option>
          </select>
        </div>
      </div>`,

    r15: () => `
      <div class="form-row">
        <div class="form-group"><label>P/V Vents — quantity</label>
          <input type="number" min="0" value="${REPAIR_STATE.r15.pvVentQty}" oninput="REPAIR_STATE.r15.pvVentQty=+this.value">
        </div>
        <div class="form-group"><label>Emergency Vents — quantity</label>
          <input type="number" min="0" value="${REPAIR_STATE.r15.emergencyVentQty}" oninput="REPAIR_STATE.r15.emergencyVentQty=+this.value">
        </div>
      </div>
      <div class="form-group"><label>Body material</label>
        <select onchange="REPAIR_STATE.r15.material=this.value">
          <option value="CS">Carbon Steel</option>
          <option value="SS">Stainless Steel</option>
        </select>
      </div>`
  };

  return (forms[id] && forms[id]()) || '<p style="color:var(--text-muted)">No additional inputs required.</p>';
}

// ---------------------------------------------------------------------------
// STEP: OPTIONS
// ---------------------------------------------------------------------------
function buildRepairOptions() {
  const el = document.getElementById('r-contingency');
  if (el) el.value = REPAIR_STATE.contingencyPct;
}

// ---------------------------------------------------------------------------
// Calculation & output
// ---------------------------------------------------------------------------
function runRepairCalculation() {
  REPAIR_STATE.contingencyPct = parseFloat(document.getElementById('r-contingency').value) || 15;
  try {
    renderRepairOutput(REPAIR_STATE, REPAIR_STATE.contingencyPct);
    showRepairStep('output');
    document.getElementById('output-content').scrollIntoView({ behavior:'smooth' });
  } catch(e) {
    alert('Calculation error: ' + e.message + '\n\nCheck browser console for details.');
    console.error(e);
  }
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
function toggle(id, show) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? '' : 'none';
}
function setVal(id, v) {
  const el = document.getElementById(id);
  if (el && v !== null && v !== undefined) el.value = v;
}
function r1(v) { return v ? v.toFixed(1) : '0.0'; }
function showRepairFormError(id, errs) {
  const el = document.getElementById(id);
  if (!el) return;
  if (errs && errs.length) {
    el.style.display = '';
    el.querySelector('span').textContent = errs.join(' ');
  } else {
    el.style.display = 'none';
  }
}
