// =============================================================================
// APP.JS — Wizard Flow, State Management, Form Logic
// =============================================================================

const APP_VERSION = "v1.3.0";
const APP_DATE    = "2025-01";

function initNewBuild() {
  document.getElementById('landing-screen').style.display   = 'none';
  document.getElementById('repair-wrapper').style.display   = 'none';
  document.getElementById('newbuild-wrapper').style.display = 'block';
  document.getElementById('app-header').querySelector('p').textContent =
    'Indicative project cost estimation for aboveground atmospheric storage tanks';
  goToStep(1);
}

function returnToLanding() {
  document.getElementById('newbuild-wrapper').style.display = 'none';
  document.getElementById('repair-wrapper').style.display   = 'none';
  document.getElementById('landing-screen').style.display   = 'flex';
}

// ── Application State ────────────────────────────────────────────────────────
const STATE = {
  currentStep: 1,

  // Step 1 — Geometry
  diameter:           null,
  liquidHeight:       null,
  outerRoof:          null,   // 'coneCS' | 'domeCS' | 'domeAL' | 'efr' | 'openTop'
  ifrType:            null,   // 'none' | 'ifrPontoon' | 'ifrFullContact'
  efrType:            null,   // 'efrSingle' | 'efrDouble'
  operatingPressure:  'atmospheric',
  frangibleRoof:      true,   // bool — applies to coneCS and domeCS only

  // Step 2 — Materials & Design
  shellMaterial:             null,
  corrosionAllowanceShell:   null,
  corrosionAllowanceBottom:  null,
  specificGravity:           1.0,
  windSpeed:                 35,

  // Step 3 — Scope & Options
  internalCoating:      'glassFlake',
  internalPaintHeight:  null,     // null = full liquid height; number = partial height (m)
  externalCoating:      'standard',
  floatingRoofPaint:    'none',   // 'none' | 'topOnly' | 'undersideOnly' | 'both'
  rimSealType:          'primary',
  fluidClass:           'classIV',
  freightOption:        'mysSg',
  erectionMethod:       'traditional',
  stairType:            'cageLadder', // resolved in populateStep3Defaults

  // Nozzle schedule
  nozzles: {
    shell_small: 0, shell_medium: 0, shell_large: 0,
    shell_mh: 0, roof_small: 0, roof_mh: 0
  }
};

// ── Initialise ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('version-badge').textContent = APP_VERSION + ' — ' + APP_DATE;
  setupStep1();
  setupStep2();
  setupStep3();
  // Show landing; user picks new-build or repair
  document.getElementById('landing-screen').style.display   = 'flex';
  document.getElementById('newbuild-wrapper').style.display = 'none';
  document.getElementById('repair-wrapper').style.display   = 'none';
});

// ── Step Navigation ──────────────────────────────────────────────────────────
function goToStep(step) {
  STATE.currentStep = step;

  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  const outputPanel = document.getElementById('output-panel');

  if (step === 'output') {
    outputPanel.classList.add('active');
    renderOutput();
  } else {
    outputPanel.classList.remove('active');
    const panel = document.getElementById('step-' + step);
    if (panel) panel.classList.add('active');
  }

  // Update sidebar
  const navItems = document.querySelectorAll('.step-nav li[data-step]');
  navItems.forEach(li => {
    li.classList.remove('active', 'done');
    const s = li.dataset.step;
    if (s === 'output') {
      if (step === 'output') li.classList.add('active');
    } else {
      const n = parseInt(s);
      if (n === step) li.classList.add('active');
      else if (typeof step === 'number' && n < step) li.classList.add('done');
      else if (step === 'output') li.classList.add('done');
    }
  });
}

// ── STEP 1: Tank Geometry ────────────────────────────────────────────────────
function setupStep1() {
  bindNum('diameter',            'diameter');
  bindNum('liquidHeight',        'liquidHeight');
  bindNum('specificGravityStep1','specificGravity');

  document.querySelectorAll('.roof-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.roof-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      STATE.outerRoof = card.dataset.value;
      toggleRoofSubOptions();
    });
  });

  document.getElementById('operatingPressure').addEventListener('change', e => {
    STATE.operatingPressure = e.target.value;
    const notice = document.getElementById('pressure-notice');
    if (notice) notice.style.display = STATE.operatingPressure === 'lowPressure' ? 'flex' : 'none';
  });

  document.querySelectorAll('.ifr-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.ifr-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      STATE.ifrType = card.dataset.value;
    });
  });

  document.querySelectorAll('.efr-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.efr-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      STATE.efrType = card.dataset.value;
    });
  });

  document.querySelectorAll('.frangible-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.frangible-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      STATE.frangibleRoof = (card.dataset.value === 'true');
    });
  });

  document.getElementById('next-1').addEventListener('click', () => {
    if (validateStep1()) { populateStep2Defaults(); goToStep(2); }
  });
}

function toggleRoofSubOptions() {
  const hasFixedRoof = ['coneCS', 'domeCS', 'domeAL'].includes(STATE.outerRoof);

  // IFR section: show for any fixed-roof tank (cone, dome CS, dome AL)
  document.getElementById('ifr-section').classList.toggle('visible', hasFixedRoof);
  if (!hasFixedRoof) STATE.ifrType = 'none';

  // EFR sub-type: show only for EFR outer roof
  const isEFR = STATE.outerRoof === 'efr';
  document.getElementById('efr-section').classList.toggle('visible', isEFR);
  if (!isEFR) STATE.efrType = null;

  // Frangible section: only relevant for CS fixed roofs (not aluminium dome)
  const showFrangible = STATE.outerRoof === 'coneCS' || STATE.outerRoof === 'domeCS';
  document.getElementById('frangible-section').classList.toggle('visible', showFrangible);
  if (!showFrangible) STATE.frangibleRoof = true; // default to frangible for other types

  // Open top: clear floating roofs
  if (STATE.outerRoof === 'openTop') { STATE.ifrType = 'none'; STATE.efrType = null; }
}

function validateStep1() {
  let ok = true;
  const D = parseFloat(document.getElementById('diameter').value);
  const H = parseFloat(document.getElementById('liquidHeight').value);
  const G = parseFloat(document.getElementById('specificGravityStep1').value);

  if (!D || D < 1 || D > 120) { showError('diameter', 'Enter 1–120 m'); ok = false; }
  else { clearError('diameter'); STATE.diameter = D; }

  if (!H || H < 1 || H > 25) { showError('liquidHeight', 'Enter 1–25 m'); ok = false; }
  else { clearError('liquidHeight'); STATE.liquidHeight = H; }

  if (!G || G < 0.5 || G > 2.5) { showError('specificGravityStep1', 'Enter 0.5–2.5'); ok = false; }
  else { clearError('specificGravityStep1'); STATE.specificGravity = G; }

  if (!STATE.outerRoof) { showNotice('roof-error', 'Please select a roof type'); ok = false; }
  else hideNotice('roof-error');

  if (['coneCS', 'domeCS', 'domeAL'].includes(STATE.outerRoof) && !STATE.ifrType) {
    showNotice('ifr-error', 'Please select whether an IFR is included'); ok = false;
  } else hideNotice('ifr-error');

  if (STATE.outerRoof === 'efr' && !STATE.efrType) {
    showNotice('efr-error', 'Please select the EFR type'); ok = false;
  } else hideNotice('efr-error');

  return ok;
}

// ── STEP 2: Materials & Design ───────────────────────────────────────────────
function setupStep2() {
  document.querySelectorAll('.mat-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.mat-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      STATE.shellMaterial = card.dataset.value;
      applyMaterialDefaults();
    });
  });

  bindNum('corrosionShell',  'corrosionAllowanceShell');
  bindNum('corrosionBottom', 'corrosionAllowanceBottom');
  bindNum('windSpeed',       'windSpeed');

  document.getElementById('back-2').addEventListener('click', () => goToStep(1));
  document.getElementById('next-2').addEventListener('click', () => {
    if (validateStep2()) { populateStep3Defaults(); goToStep(3); }
  });
}

function populateStep2Defaults() { applyMaterialDefaults(); }

function applyMaterialDefaults() {
  if (!STATE.shellMaterial) return;
  const mat = MATERIALS[STATE.shellMaterial];
  if (!mat) return;
  const csEl = document.getElementById('corrosionShell');
  const cbEl = document.getElementById('corrosionBottom');
  if (csEl) { csEl.value = mat.defaultCA_shell; STATE.corrosionAllowanceShell = mat.defaultCA_shell; }
  if (cbEl) { cbEl.value = mat.defaultCA_bottom; STATE.corrosionAllowanceBottom = mat.defaultCA_bottom; }
}

function validateStep2() {
  let ok = true;
  if (!STATE.shellMaterial) { showNotice('mat-error', 'Please select a shell material'); ok = false; }
  else hideNotice('mat-error');

  const caS = parseFloat(document.getElementById('corrosionShell').value);
  const caB = parseFloat(document.getElementById('corrosionBottom').value);
  const ws  = parseFloat(document.getElementById('windSpeed').value);

  if (isNaN(caS) || caS < 0 || caS > 10) { showError('corrosionShell', 'Enter 0–10 mm'); ok = false; }
  else { clearError('corrosionShell'); STATE.corrosionAllowanceShell = caS; }

  if (isNaN(caB) || caB < 0 || caB > 10) { showError('corrosionBottom', 'Enter 0–10 mm'); ok = false; }
  else { clearError('corrosionBottom'); STATE.corrosionAllowanceBottom = caB; }

  if (isNaN(ws) || ws < 20 || ws > 80) { showError('windSpeed', 'Enter 20–80 m/s'); ok = false; }
  else { clearError('windSpeed'); STATE.windSpeed = ws; }

  return ok;
}

// ── STEP 3: Scope & Options ──────────────────────────────────────────────────
function setupStep3() {
  // Internal coating
  document.querySelectorAll('.int-coat-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.int-coat-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      STATE.internalCoating = card.dataset.value;
    });
  });

  // Internal paint height
  const paintHInput = document.getElementById('internalPaintHeight');
  if (paintHInput) {
    paintHInput.addEventListener('input', () => {
      const v = parseFloat(paintHInput.value);
      STATE.internalPaintHeight = (!v || v <= 0) ? null : v;
    });
    document.getElementById('paintHeightFull').addEventListener('change', e => {
      const row = document.getElementById('paintHeightRow');
      if (e.target.checked) {
        STATE.internalPaintHeight = null;
        row.style.display = 'none';
      }
    });
    document.getElementById('paintHeightPartial').addEventListener('change', e => {
      const row = document.getElementById('paintHeightRow');
      if (e.target.checked) {
        row.style.display = 'flex';
        paintHInput.focus();
      }
    });
  }

  // External coating
  document.querySelectorAll('.ext-coat-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.ext-coat-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      STATE.externalCoating = card.dataset.value;
    });
  });

  // Floating roof paint
  document.querySelectorAll('.float-paint-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.float-paint-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      STATE.floatingRoofPaint = card.dataset.value;
    });
  });

  // Rim seal
  document.querySelectorAll('.rim-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.rim-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      STATE.rimSealType = card.dataset.value;
    });
  });

  // Stair (user choice, only shown when H 4–6 m)
  document.querySelectorAll('.stair-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.stair-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      STATE.stairType = card.dataset.value;
    });
  });

  // Fluid class
  document.querySelectorAll('.fluid-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.fluid-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      STATE.fluidClass = card.dataset.value;
      updateFireNotice();
    });
  });

  // Freight
  document.querySelectorAll('.freight-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.freight-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      STATE.freightOption = card.dataset.value;
    });
  });

  // Erection method
  document.querySelectorAll('.erect-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.erect-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      STATE.erectionMethod = card.dataset.value;
    });
  });

  // Nozzle quantities
  document.querySelectorAll('.nozzle-qty').forEach(input => {
    input.addEventListener('change', () => {
      STATE.nozzles[input.dataset.key] = parseInt(input.value) || 0;
    });
  });

  document.getElementById('back-3').addEventListener('click', () => goToStep(2));
  document.getElementById('calc-btn').addEventListener('click', () => {
    if (validateStep3()) goToStep('output');
  });
}

function populateStep3Defaults() {
  const H = STATE.liquidHeight || 0;

  // --- Paint height default ---
  const paintHInput   = document.getElementById('internalPaintHeight');
  const paintFull     = document.getElementById('paintHeightFull');
  const paintHeightRow = document.getElementById('paintHeightRow');
  if (paintHInput)    { paintHInput.value = H; STATE.internalPaintHeight = null; }
  if (paintFull)      { paintFull.checked = true; }
  if (paintHeightRow) { paintHeightRow.style.display = 'none'; }

  // --- Floating roof paint section ---
  const hasFloat = (STATE.ifrType && STATE.ifrType !== 'none') || STATE.outerRoof === 'efr';
  const floatSection = document.getElementById('floatPaintSection');
  if (floatSection) floatSection.style.display = hasFloat ? 'block' : 'none';

  // --- Rim seal section ---
  const rimSection = document.getElementById('rimSealSection');
  if (rimSection) rimSection.style.display = hasFloat ? 'block' : 'none';

  // --- Stair / ladder ---
  const rec = getStairRecommendation(H);
  const autoMsg      = document.getElementById('stair-auto-msg');
  const choiceBlock  = document.getElementById('stair-choice-block');

  if (rec === 'cageLadder_auto') {
    STATE.stairType = 'cageLadder';
    autoMsg.style.display = 'flex';
    autoMsg.querySelector('.stair-auto-text').textContent =
      `Shell height ${H.toFixed(1)} m < 4 m — cage ladder provided (automatic).`;
    choiceBlock.style.display = 'none';
  } else if (rec === 'spiralStair_auto') {
    STATE.stairType = 'spiralStair';
    autoMsg.style.display = 'flex';
    autoMsg.querySelector('.stair-auto-text').textContent =
      `Shell height ${H.toFixed(1)} m > 6 m — spiral staircase mandatory (working-at-height regulations).`;
    choiceBlock.style.display = 'none';
  } else {
    // userChoice: H between 4 and 6 m
    STATE.stairType = 'spiralStair'; // default to stair
    autoMsg.style.display = 'none';
    choiceBlock.style.display = 'block';
    // Select spiral stair as default
    document.querySelectorAll('.stair-card').forEach(c => c.classList.remove('selected'));
    const def = document.querySelector('.stair-card[data-value="spiralStair"]');
    if (def) def.classList.add('selected');
  }

  // --- Nozzle defaults ---
  const schedule = getDefaultNozzleSchedule(STATE.diameter);
  STATE.nozzles = schedule;
  Object.keys(schedule).forEach(key => {
    const input = document.querySelector(`.nozzle-qty[data-key="${key}"]`);
    if (input) input.value = schedule[key];
  });

  // Default fluid class card selection
  document.querySelectorAll('.fluid-card').forEach(c => c.classList.remove('selected'));
  const defFluid = document.querySelector(`.fluid-card[data-value="${STATE.fluidClass}"]`);
  if (defFluid) defFluid.classList.add('selected');

  updateFireNotice();
}

function updateFireNotice() {
  const notice = document.getElementById('fire-class0-notice');
  if (notice) notice.style.display = STATE.fluidClass === 'class0' ? 'flex' : 'none';
}

function validateStep3() {
  let ok = true;

  // Partial paint height validation
  if (document.getElementById('paintHeightPartial').checked) {
    const v = parseFloat(document.getElementById('internalPaintHeight').value);
    const H = STATE.liquidHeight;
    if (isNaN(v) || v <= 0 || v > H) {
      showError('internalPaintHeight', `Enter a height > 0 and ≤ ${H} m`);
      ok = false;
    } else {
      clearError('internalPaintHeight');
      STATE.internalPaintHeight = v;
    }
  } else {
    STATE.internalPaintHeight = null;
  }

  // Class 0 is out of scope
  if (STATE.fluidClass === 'class0') {
    showNotice('fluid-error', 'Class 0 (LPG/LNG) is out of scope for API 650. Please consult a specialist.');
    ok = false;
  } else hideNotice('fluid-error');

  // Nozzle validation
  let nozzleOk = true;
  document.querySelectorAll('.nozzle-qty').forEach(input => {
    const v = parseInt(input.value);
    if (isNaN(v) || v < 0) { input.classList.add('error'); nozzleOk = false; }
    else { input.classList.remove('error'); STATE.nozzles[input.dataset.key] = v; }
  });
  if (!nozzleOk) { showNotice('nozzle-error', 'Nozzle quantities must be 0 or a positive whole number'); ok = false; }
  else hideNotice('nozzle-error');

  return ok;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function bindNum(htmlId, stateKey) {
  const el = document.getElementById(htmlId);
  if (!el) return;
  el.addEventListener('input', () => { STATE[stateKey] = parseFloat(el.value); });
}

function showError(id, msg) {
  const el  = document.getElementById(id);
  const err = document.getElementById(id + '-err');
  if (el)  el.classList.add('error');
  if (err) { err.textContent = msg; err.style.display = 'block'; }
}

function clearError(id) {
  const el  = document.getElementById(id);
  const err = document.getElementById(id + '-err');
  if (el)  el.classList.remove('error');
  if (err) err.style.display = 'none';
}

function showNotice(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.querySelector('span:last-child').textContent = msg; el.style.display = 'flex'; }
}

function hideNotice(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
