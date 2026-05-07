// =============================================================================
// SETTINGS.JS — Cost Input Page: localStorage persistence + export
// =============================================================================
// Loads saved rates from localStorage on startup and merges into live objects.
// Save button writes back to localStorage and re-merges.
// Export button generates a downloadable cost_rates.js + repair_rates.js snapshot.
// =============================================================================

const SETTINGS_KEY = 'tankEstimator_costRates_v1';

// ---------------------------------------------------------------------------
// On page load: merge localStorage overrides into live rate objects
// ---------------------------------------------------------------------------
function loadSavedRates() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return;
    const data = JSON.parse(saved);
    mergeDeep(COST_RATES, data.costRates || {});
    mergeDeep(REPAIR_RATES, data.repairRates || {});
  } catch(e) {
    console.warn('Could not load saved rates:', e);
  }
}

function mergeDeep(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      mergeDeep(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

// ---------------------------------------------------------------------------
// Save rates from form fields into localStorage
// ---------------------------------------------------------------------------
function saveRates() {
  collectFormToRates();
  const snapshot = {
    costRates: JSON.parse(JSON.stringify(COST_RATES)),
    repairRates: JSON.parse(JSON.stringify(REPAIR_RATES))
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(snapshot));
  showSaveConfirm();
}

function showSaveConfirm() {
  const btn = document.getElementById('btn-save-rates');
  if (!btn) return;
  btn.textContent = '✓ Saved';
  btn.style.background = 'var(--success)';
  setTimeout(() => { btn.textContent = '💾 Save Rates'; btn.style.background = ''; }, 2000);
}

// ---------------------------------------------------------------------------
// Collect all form inputs back into COST_RATES / REPAIR_RATES
// ---------------------------------------------------------------------------
function collectFormToRates() {
  document.querySelectorAll('[data-rate-path]').forEach(el => {
    const path = el.dataset.ratePath.split('.');
    const obj  = path[0] === 'CR' ? COST_RATES : REPAIR_RATES;
    const keys = path.slice(1);
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!cur[keys[i]]) cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    const val = parseFloat(el.value);
    if (!isNaN(val)) cur[keys[keys.length - 1]] = val;
  });
}

// ---------------------------------------------------------------------------
// Populate form fields from live rate objects
// ---------------------------------------------------------------------------
function populateSettingsForm() {
  document.querySelectorAll('[data-rate-path]').forEach(el => {
    const path = el.dataset.ratePath.split('.');
    const obj  = path[0] === 'CR' ? COST_RATES : REPAIR_RATES;
    const keys = path.slice(1);
    let cur = obj;
    for (const k of keys) {
      if (cur === undefined || cur === null) { cur = undefined; break; }
      cur = cur[k];
    }
    if (cur !== undefined && cur !== null) el.value = cur;
  });
}

// ---------------------------------------------------------------------------
// Export: generate JS file text and trigger download
// ---------------------------------------------------------------------------
function exportRatesFile() {
  collectFormToRates();
  const cr = COST_RATES;
  const rr = REPAIR_RATES;

  // Build a pretty-printed JS file
  const crText = '// AUTO-EXPORTED by Tank Cost Estimator Settings Page\nconst COST_RATES = ' +
    JSON.stringify(cr, null, 2) + ';\n';
  const rrText = '\nconst REPAIR_RATES = ' + JSON.stringify(rr, null, 2) + ';\n';

  const blob = new Blob([crText + rrText], { type: 'text/javascript' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'cost_rates_export.js';
  a.click();
  URL.revokeObjectURL(url);
}

// Call on page load
loadSavedRates();
