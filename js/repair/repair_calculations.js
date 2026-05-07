// =============================================================================
// REPAIR_CALCULATIONS.JS — Engineering & Cost Engine for Repair Module
// =============================================================================
// Depends on: calculations.js, cost_rates.js (incl. labour), repair_rates.js,
//             materials.js, nozzle_rates.js
// =============================================================================

// ---------------------------------------------------------------------------
// CORE LABOUR COST ENGINE
// Takes a unitMH object (e.g. { WLD:19, FTR:14, ... }) and a quantity.
// Returns full breakdown of direct + indirect manhours and costs.
// label: 'Shop' | 'Site' — used in output rendering
// ---------------------------------------------------------------------------
function calcLabour(unitMH, qty, label) {
  const rates = COST_RATES.labour.rates;
  const trades = ['WLD','FTR','RIG','FMN','HLP'];
  const mh     = {};
  const cost   = {};
  let directMH   = 0;
  let directCost = 0;

  trades.forEach(t => {
    const h = (unitMH[t] || 0) * qty;
    mh[t]   = h;
    cost[t] = h * (rates[t] || 0);
    directMH   += h;
    directCost += cost[t];
  });

  const indirectPct  = COST_RATES.labour.indirectPct;
  const indirectMH   = directMH * indirectPct;
  const indirectCost = indirectMH * rates.IND;

  return { mh, cost, directMH, directCost, indirectMH, indirectCost,
           totalLabourCost: directCost + indirectCost,
           label: label || 'Shop' };
}

// Convenience: calculate site installation labour
function calcSiteLabour(siteMHKey, qty, subKey) {
  let unitMH;
  if (subKey) {
    unitMH = (COST_RATES.labour.siteMH[siteMHKey] || {})[subKey] || {};
  } else {
    unitMH = COST_RATES.labour.siteMH[siteMHKey] || {};
  }
  return calcLabour(unitMH, qty, 'Site');
}

// ---------------------------------------------------------------------------
// SCAFFOLDING CALCULATION (called once for the whole repair job)
// effectiveExtH: overrides H for external scaffold height (e.g. IFR/EFR cap)
// effectiveIntH: overrides H for internal scaffold height (e.g. IFR/EFR cap)
// skipExternal / skipInternal: true to omit entirely (e.g. paint height ≤ 2m)
// ---------------------------------------------------------------------------
function calcScaffolding(D, H, needsExternal, needsInternal,
                          effectiveExtH, effectiveIntH, skipExternal, skipInternal) {
  const sc  = REPAIR_RATES.scaffolding;
  const lab = COST_RATES.labour;
  let extCost = 0, intCost = 0, scfLabourCost = 0;
  let extVol = 0, extPlatforms = 0, intVol = 0;

  const extH = (effectiveExtH !== undefined && effectiveExtH !== null) ? effectiveExtH : H;
  const intH = (effectiveIntH !== undefined && effectiveIntH !== null) ? effectiveIntH : H;

  if (needsExternal && !skipExternal) {
    extVol       = Math.PI * D * extH * sc.external.width;
    const nPlatforms = Math.max(1, Math.floor(extH / sc.external.platformInterval));
    extPlatforms = Math.PI * D * sc.external.width * nPlatforms;
    extCost      = extVol * sc.external.perM3 + extPlatforms * sc.external.platformPerM2;
    const scfMH  = extVol * lab.scfMHperM3 + extPlatforms * lab.scfMHperM2;
    scfLabourCost += scfMH * lab.rates.SCF;
  }

  if (needsInternal && !skipInternal) {
    intVol    = Math.PI / 4 * D * D * intH;
    intCost   = intVol * sc.internal.perM3;
    const scfMH = intVol * lab.scfMHperM3;
    scfLabourCost += scfMH * lab.rates.SCF;
  }

  return {
    needsExternal, needsInternal,
    extVol, extPlatforms, intVol,
    extCost, intCost, scfLabourCost,
    effectiveExtH: extH, effectiveIntH: intH,
    skippedExt: !!skipExternal, skippedInt: !!skipInternal,
    total: extCost + intCost + scfLabourCost
  };
}

// ---------------------------------------------------------------------------
// MOBILISATION  (1% of direct costs, min/max capped)
// ---------------------------------------------------------------------------
function calcMobilisation(directCostTotal) {
  const m = REPAIR_RATES.mobilisation;
  return Math.min(Math.max(directCostTotal * m.pct, m.min), m.max);
}

// ---------------------------------------------------------------------------
// HELPER: get material type string ('CS' or 'SS') from material key
// ---------------------------------------------------------------------------
function matType(matKey) {
  return (MATERIALS[matKey] && MATERIALS[matKey].type) || 'CS';
}

// ---------------------------------------------------------------------------
// HELPER: fabrication rate with repair shop premium applied
// ---------------------------------------------------------------------------
function repairFabRate(baseRate) {
  return baseRate * (1 + REPAIR_RATES.repairShopPremium);
}

// =============================================================================
// R01 — ADD INTERNAL FLOATING ROOF TO EXISTING FIXED-ROOF TANK
// =============================================================================
function calcR01(state) {
  const D   = state.diameter;
  const mat = state.shellMaterial;
  const r   = state.r01;

  const ifrWeight = getIFRWeight(D, r.ifrType);
  const plateCost = ifrWeight * COST_RATES.plate[mat];

  const fabKey  = r.ifrType === 'ifrPontoon' ? 'ifrPontoon' : 'ifrFullContact';
  const fabRate = repairFabRate(COST_RATES.fabrication[fabKey].CS);
  const fabCost = ifrWeight * fabRate;

  const shopLabour = calcLabour(COST_RATES.labour.unitMH.floatRoofAddIFR, ifrWeight, 'Shop');
  const siteLabour = calcSiteLabour('floatRoofAddIFR', ifrWeight);

  // Rim seal supply
  const circumference = Math.PI * D;
  const sealKey  = r.rimSealType === 'primarySecondary' ? 'primarySecondary' : 'primary';
  const rimCost  = circumference * COST_RATES.rimSeal[sealKey].IFR;

  // Floating roof paint
  const deckArea  = getIFRFloorArea(D);
  let paintTopCost = 0, paintUndCost = 0;
  if (r.floatingRoofPaint === 'topOnly' || r.floatingRoofPaint === 'both')
    paintTopCost = deckArea * COST_RATES.painting.floatingRoofTop.CS;
  if (r.floatingRoofPaint === 'undersideOnly' || r.floatingRoofPaint === 'both')
    paintUndCost = deckArea * COST_RATES.painting.floatingRoofUnderside.CS;
  const paintCost = paintTopCost + paintUndCost;

  const directCost = plateCost + fabCost + shopLabour.totalLabourCost + siteLabour.totalLabourCost + rimCost + paintCost;
  return { ifrWeight, deckArea, plateCost, fabCost, shopLabour, siteLabour, rimCost,
           paintTopCost, paintUndCost, paintCost, directCost,
           needsExternal: false, needsInternal: true,
           label: 'R01 — Add Internal Floating Roof' };
}

// =============================================================================
// R02 — REMOVE EXISTING IFR OR EFR
// =============================================================================
function calcR02(state) {
  const D   = state.diameter;
  let floatWeight = 0;
  let floatLabel  = '';

  if (state.currentIFR && state.currentIFR !== 'none') {
    floatWeight = getIFRWeight(D, state.currentIFR);
    floatLabel  = 'IFR (' + state.currentIFR + ')';
  } else if (state.currentEFR) {
    floatWeight = getEFRWeight(D, state.currentEFR);
    floatLabel  = 'EFR (' + state.currentEFR + ')';
  }

  // R02 is site-only — no shop fab
  const siteLabour = calcSiteLabour('floatRoofRemove', floatWeight);
  const directCost = siteLabour.totalLabourCost;

  return { floatWeight, floatLabel, siteLabour, directCost,
           needsExternal: false, needsInternal: true,
           label: 'R02 — Remove Floating Roof (' + floatLabel + ')' };
}

// =============================================================================
// R03 — REPAIR IFR OR EFR (multiple sub-scopes)
// =============================================================================
function calcR03(state) {
  const D   = state.diameter;
  const mat = state.shellMaterial;
  const r   = state.r03;
  const rr  = REPAIR_RATES.ifrRepair;
  const DENSITY = 7.85; // t/m3

  let results    = [];
  let directCost = 0;

  // Sub-scope: Deck plate patching
  if (r.subScopes.deckPatch && r.deckPatchPct > 0) {
    const pct      = r.deckPatchPct / 100;
    const area     = getIFRFloorArea(D) * pct;
    const weight   = area * (rr.deckThicknessMm / 1000) * DENSITY;
    const plateCost = weight * COST_RATES.plate[mat];
    const fabCost   = weight * repairFabRate(COST_RATES.fabrication.bottom.CS);
    const shopLabour = calcLabour(COST_RATES.labour.unitMH.floatRoofRepairDeck, weight, 'Shop');
    const siteLabour = calcSiteLabour('floatRoofRepairDeck', weight);
    const sub       = plateCost + fabCost + shopLabour.totalLabourCost + siteLabour.totalLabourCost;
    directCost += sub;
    results.push({ id:'deckPatch', desc:'Deck plate patching (' + r.deckPatchPct + '% of deck area)',
                   weight, plateCost, fabCost, shopLabour, siteLabour, sub });
  }

  // Sub-scope: Pontoon repair
  if (r.subScopes.pontoonRepair && r.pontoonRepairPct > 0) {
    const pct       = r.pontoonRepairPct / 100;
    const pontArea  = getIFRFloorArea(D) * rr.pontoonFractionOfArea * pct;
    const weight    = pontArea * (rr.pontoonThicknessMm / 1000) * DENSITY;
    const plateCost = weight * COST_RATES.plate[mat];
    const fabCost   = weight * repairFabRate(COST_RATES.fabrication.bottom.CS);
    const shopLabour = calcLabour(COST_RATES.labour.unitMH.floatRoofRepairDeck, weight, 'Shop');
    const siteLabour = calcSiteLabour('floatRoofRepairDeck', weight);
    const sub       = plateCost + fabCost + shopLabour.totalLabourCost + siteLabour.totalLabourCost;
    directCost += sub;
    results.push({ id:'pontoonRepair', desc:'Pontoon repair (' + r.pontoonRepairPct + '% of pontoon)',
                   weight, plateCost, fabCost, shopLabour, siteLabour, sub });
  }

  // Sub-scope: Support leg replacement
  if (r.subScopes.legReplace && r.legCount > 0) {
    const weightT   = r.legCount * rr.legWeightKg / 1000;
    const plateCost = weightT * COST_RATES.plate[mat];
    const fabCost   = weightT * repairFabRate(COST_RATES.fabrication.structural.CS);
    const shopLabour = calcLabour(COST_RATES.labour.unitMH.legReplace, r.legCount, 'Shop');
    const siteLabour = calcSiteLabour('legReplace', r.legCount);
    const sub       = plateCost + fabCost + shopLabour.totalLabourCost + siteLabour.totalLabourCost;
    directCost += sub;
    results.push({ id:'legReplace', desc:'Support leg replacement (' + r.legCount + ' legs)',
                   weightT, plateCost, fabCost, shopLabour, siteLabour, sub });
  }

  // Sub-scope: Bleeder vent replacement (site-only install)
  if (r.subScopes.bleederVent && r.bleederVentQty > 0) {
    const supplyCost = r.bleederVentQty * rr.bleederVentSupply;
    const siteLabour = calcSiteLabour('ventInstall', r.bleederVentQty);
    const sub        = supplyCost + siteLabour.totalLabourCost;
    directCost += sub;
    results.push({ id:'bleederVent', desc:'Bleeder vent replacement (' + r.bleederVentQty + ' units)',
                   supplyCost, siteLabour, sub });
  }

  // Sub-scope: Vacuum breaker replacement (site-only install)
  if (r.subScopes.vacuumBreaker && r.vacuumBreakerQty > 0) {
    const supplyCost = r.vacuumBreakerQty * rr.vacuumBreakerSupply;
    const siteLabour = calcSiteLabour('ventInstall', r.vacuumBreakerQty);
    const sub        = supplyCost + siteLabour.totalLabourCost;
    directCost += sub;
    results.push({ id:'vacuumBreaker', desc:'Vacuum breaker replacement (' + r.vacuumBreakerQty + ' units)',
                   supplyCost, siteLabour, sub });
  }

  // Sub-scope: Full deck replacement
  if (r.subScopes.fullDeckReplace) {
    const floatType  = (state.currentIFR && state.currentIFR !== 'none') ? state.currentIFR : state.currentEFR;
    const weight     = floatType ? (state.currentIFR && state.currentIFR !== 'none'
                         ? getIFRWeight(D, state.currentIFR)
                         : getEFRWeight(D, state.currentEFR)) : 0;
    const plateCost  = weight * COST_RATES.plate[mat];
    const fabKey     = (state.currentIFR === 'ifrPontoon') ? 'ifrPontoon'
                     : (state.currentIFR === 'ifrFullContact') ? 'ifrFullContact'
                     : (state.currentEFR === 'efrSingle') ? 'efrSingleDeck' : 'efrDoubleDeck';
    const fabCost    = weight * repairFabRate(COST_RATES.fabrication[fabKey].CS);
    const shopLabour = calcLabour(COST_RATES.labour.unitMH.floatRoofRepairDeck, weight, 'Shop');
    const siteLabour = calcSiteLabour('floatRoofRepairDeck', weight);
    const sub        = plateCost + fabCost + shopLabour.totalLabourCost + siteLabour.totalLabourCost;
    directCost += sub;
    results.push({ id:'fullDeckReplace', desc:'Full deck plate replacement',
                   weight, plateCost, fabCost, shopLabour, siteLabour, sub });
  }

  return { results, directCost,
           needsExternal: false, needsInternal: true,
           label: 'R03 — Repair Floating Roof' };
}

// =============================================================================
// R04 — BOTTOM REPAIR (FULL REPLACEMENT OR PARTIAL)
// =============================================================================
function calcR04(state) {
  const D   = state.diameter;
  const mat = state.shellMaterial;
  const r   = state.r04;
  const CA  = r.newCA || 0;

  const fullBottomArea   = Math.PI / 4 * D * D;
  const repairArea       = r.scope === 'full' ? fullBottomArea
                         : fullBottomArea * (r.partialPct / 100);
  const t_mm             = Math.max(6 + CA, 6);
  const weight           = repairArea * (t_mm / 1000) * 7.85;

  const plateCost        = weight * COST_RATES.plate[mat];
  const mhKey            = r.scope === 'full' ? 'bottomFullReplace' : 'bottomRepair';
  const fabCost          = weight * repairFabRate(COST_RATES.fabrication.bottom[matType(mat)]);
  const shopLabour       = calcLabour(COST_RATES.labour.unitMH[mhKey], weight, 'Shop');
  const siteLabour       = calcSiteLabour(mhKey, weight);

  // Jacking (full replacement only)
  let jackingCost = 0;
  if (r.scope === 'full') {
    jackingCost = REPAIR_RATES.jacking.baseLumpSum
                + REPAIR_RATES.jacking.perMCircumference * Math.PI * D;
  }

  const directCost = plateCost + fabCost + shopLabour.totalLabourCost + siteLabour.totalLabourCost + jackingCost;
  return { repairArea, t_mm, weight, plateCost, fabCost, shopLabour, siteLabour, jackingCost, directCost,
           isFullReplacement: r.scope === 'full',
           needsExternal: false, needsInternal: true,
           label: 'R04 — Tank Bottom ' + (r.scope === 'full' ? 'Full Replacement' : 'Partial Repair') };
}

// =============================================================================
// R05 — SHELL PLATE REPLACEMENT (% of shell area)
// =============================================================================
function calcR05(state) {
  const D   = state.diameter;
  const H   = state.shellHeight;
  const mat = state.shellMaterial;
  const r   = state.r05;
  const CA  = r.newCA || 0;

  // Compute average shell thickness from existing tank design
  const courses = designShell(D, H, state.specificGravity, mat, CA);
  const avgT_mm = courses.reduce((s, c) => s + c.t_ordered * (c.height / H), 0);

  const totalShellArea   = Math.PI * D * H;
  const repairArea       = totalShellArea * (r.shellAreaPct / 100);
  const weight           = repairArea * (avgT_mm / 1000) * 7.85;

  const plateCost        = weight * COST_RATES.plate[mat];
  const fabCost          = weight * repairFabRate(COST_RATES.fabrication.shell[matType(mat)]);
  const shopLabour       = calcLabour(COST_RATES.labour.unitMH.shellRepair, weight, 'Shop');
  const siteLabour       = calcSiteLabour('shellRepair', weight);

  const directCost = plateCost + fabCost + shopLabour.totalLabourCost + siteLabour.totalLabourCost;
  return { repairArea, avgT_mm, weight, plateCost, fabCost, shopLabour, siteLabour, directCost,
           needsExternal: true, needsInternal: false,
           label: 'R05 — Shell Plate Replacement (' + r.shellAreaPct + '% of shell area)' };
}

// =============================================================================
// R06 — ROOF REPLACEMENT / REPAIR
// =============================================================================
function calcR06(state) {
  const D   = state.diameter;
  const mat = state.shellMaterial;
  const r   = state.r06;
  const CA  = 0; // no CA on replacement roof plates (new design life)
  const mT  = matType(mat);

  let fullWeight = 0;
  let fullArea   = 0;
  let fabRateKey = 'coneRoof';

  if (state.currentRoofType === 'coneCS') {
    fullWeight = getConeRoofWeight(D, CA, mat);
    fullArea   = getConeRoofGeometry(D).area;
    fabRateKey = 'coneRoof';
  } else if (state.currentRoofType === 'domeCS') {
    fullWeight = getDomeRoofWeight(D, CA, mat);
    fullArea   = getDomeRoofArea(D);
    fabRateKey = 'domeRoof';
  }

  const pct    = r.scope === 'full' ? 100 : (r.partialPct || 0);
  const weight = fullWeight * (pct / 100);

  const plateCost  = weight * COST_RATES.plate[mat];
  const fabCost    = weight * repairFabRate(COST_RATES.fabrication[fabRateKey][mT]);
  const shopLabour = calcLabour(COST_RATES.labour.unitMH.roofRepair, weight, 'Shop');
  const siteLabour = calcSiteLabour('roofRepair', weight);

  const directCost = plateCost + fabCost + shopLabour.totalLabourCost + siteLabour.totalLabourCost;
  return { pct, weight, fullArea, plateCost, fabCost, shopLabour, siteLabour, directCost,
           needsExternal: true, needsInternal: false,
           label: 'R06 — Roof Replacement (' + (r.scope === 'full' ? 'Full' : pct + '%') + ')' };
}

// =============================================================================
// R07 — ADD OR REPLACE ALUMINIUM GEODESIC DOME
// =============================================================================
function calcR07(state) {
  const D = state.diameter;
  const r = state.r07;

  const domeArea    = getAlumDomeArea(D);
  const vendorCost  = domeArea * COST_RATES.aluminumDome.supplyAndInstall;
  // Site supervision + rigging (vendor installs dome; our trades supervise + rig)
  const siteLabour = calcSiteLabour('alumDomeInstall', domeArea / 10);

  // CS dome removal (if applicable) — site-only work
  let removalCost   = 0;
  let removalLabour = null;
  if (r.isReplacement && r.existingDomeMaterial === 'CS') {
    const oldRoofWeight = getConeRoofWeight(D, 0, state.shellMaterial);
    removalLabour = calcSiteLabour('floatRoofRemove', oldRoofWeight);
    removalCost   = removalLabour.totalLabourCost;
  }

  const directCost = vendorCost + siteLabour.totalLabourCost + removalCost;
  return { domeArea, vendorCost, siteLabour, removalCost, removalLabour, directCost,
           isReplacement: r.isReplacement,
           needsExternal: true, needsInternal: false,
           label: 'R07 — Aluminium Geodesic Dome (' + (r.isReplacement ? 'Replacement' : 'New Installation') + ')' };
}

// =============================================================================
// R08 — RIM SEAL REPLACEMENT
// =============================================================================
function calcR08(state) {
  const D   = state.diameter;
  const r   = state.r08;
  const circumference = Math.PI * D;

  const floatKey  = (state.currentIFR && state.currentIFR !== 'none') ? 'IFR' : 'EFR';
  const sealKey   = r.rimSealType === 'primarySecondary' ? 'primarySecondary' : 'primary';
  const supplyCost = circumference * COST_RATES.rimSeal[sealKey][floatKey];

  // R08 is site-only (remove + reinstall) — ×1.5 factor for removal + new install
  const siteLabour = calcSiteLabour('rimSealRR', circumference * 1.5);

  const directCost = supplyCost + siteLabour.totalLabourCost;
  return { circumference, floatKey, sealKey, supplyCost, siteLabour, directCost,
           needsExternal: false, needsInternal: false,
           label: 'R08 — Rim Seal Replacement' };
}

// =============================================================================
// R09 — NOZZLE ADDITIONS / REPLACEMENTS
// =============================================================================
function calcR09(state) {
  const r    = state.r09;
  const mKey = r.material === 'SS' ? state.shellMaterial : 'CS';
  const nR   = NOZZLE_RATES;
  function rate(cat, sz) {
    const t = nR[cat][sz];
    return t ? (t[mKey] || t['CS'] || 0) : 0;
  }

  const sizeMap = { small: 'small', medium: 'medium', large: 'large', mh: 'shell' };
  const mhKey   = { small: 'small', medium: 'medium', large: 'large', mh: 'manhole' };
  const cats    = ['small','medium','large','mh'];

  let lineItems  = [];
  let supplyCost = 0;
  let labourTotal = { mh:{}, cost:{}, directMH:0, directCost:0, indirectMH:0, indirectCost:0, totalLabourCost:0 };

  cats.forEach(sz => {
    const addQty  = r.nozzles['add_'+sz]  || 0;
    const repQty  = r.nozzles['replace_'+sz] || 0;
    const catName = sz === 'mh' ? 'manhole' : 'nozzle';
    const rKey    = sz === 'mh' ? 'shell' : sizeMap[sz];

    if (addQty > 0) {
      const supply     = addQty * rate(catName, rKey);
      const shopLab    = calcLabour(COST_RATES.labour.unitMH.nozzleCutIn[mhKey[sz]], addQty, 'Shop');
      const siteLab    = calcSiteLabour('nozzleCutIn', addQty, mhKey[sz]);
      supplyCost      += supply;
      mergeLabour(labourTotal, shopLab);
      mergeLabour(labourTotal, siteLab);
      lineItems.push({ desc: 'Add nozzle ' + sz + ' (' + addQty + ' off)', supply, shopLabour: shopLab, siteLabour: siteLab });
    }
    if (repQty > 0) {
      const supply  = repQty * rate(catName, rKey);
      // Shop: replacement = remove old (50%) + cut-in new (100%)
      const shopNew = calcLabour(COST_RATES.labour.unitMH.nozzleCutIn[mhKey[sz]], repQty, 'Shop');
      const shopRem = calcLabour(COST_RATES.labour.unitMH.nozzleCutIn[mhKey[sz]], repQty * 0.5, 'Shop');
      const shopLab = { mh:{}, cost:{}, label:'Shop',
                        directMH: shopNew.directMH + shopRem.directMH,
                        directCost: shopNew.directCost + shopRem.directCost,
                        indirectMH: shopNew.indirectMH + shopRem.indirectMH,
                        indirectCost: shopNew.indirectCost + shopRem.indirectCost,
                        totalLabourCost: shopNew.totalLabourCost + shopRem.totalLabourCost };
      // Site: similar split
      const siteNew = calcSiteLabour('nozzleCutIn', repQty, mhKey[sz]);
      const siteRem = calcSiteLabour('nozzleCutIn', repQty * 0.5, mhKey[sz]);
      const siteLab = { mh:{}, cost:{}, label:'Site',
                        directMH: siteNew.directMH + siteRem.directMH,
                        directCost: siteNew.directCost + siteRem.directCost,
                        indirectMH: siteNew.indirectMH + siteRem.indirectMH,
                        indirectCost: siteNew.indirectCost + siteRem.indirectCost,
                        totalLabourCost: siteNew.totalLabourCost + siteRem.totalLabourCost };
      supplyCost   += supply;
      mergeLabour(labourTotal, shopLab);
      mergeLabour(labourTotal, siteLab);
      lineItems.push({ desc: 'Replace nozzle ' + sz + ' (' + repQty + ' off)', supply, shopLabour: shopLab, siteLabour: siteLab });
    }
  });

  const directCost = supplyCost + labourTotal.totalLabourCost;
  return { lineItems, supplyCost, labourTotal, directCost,
           needsExternal: false, needsInternal: false,
           label: 'R09 — Nozzle Additions / Replacements' };
}

function mergeLabour(target, src) {
  target.directMH      += src.directMH;
  target.directCost    += src.directCost;
  target.indirectMH    += src.indirectMH;
  target.indirectCost  += src.indirectCost;
  target.totalLabourCost += src.totalLabourCost;
}

// =============================================================================
// R10 — INTERNAL COATING / LINING
// =============================================================================
function calcR10(state) {
  const D  = state.diameter;
  const H  = state.shellHeight;
  const r  = state.r10;
  const paintH = r.paintHeight ? Math.min(r.paintHeight, H) : H;

  const shellArea  = Math.PI * D * paintH;
  const bottomArea = Math.PI / 4 * D * D;
  const totalArea  = shellArea + bottomArea;
  const rate       = COST_RATES.painting.internal[r.coatingType] || 0;
  const paintCost  = totalArea * rate;

  const directCost = paintCost;
  return { shellArea, bottomArea, totalArea, paintH, rate, paintCost, directCost,
           needsExternal: false, needsInternal: true,
           label: 'R10 — Internal Coating / Lining' };
}

// =============================================================================
// R11 — EXTERNAL COATING
// =============================================================================
function calcR11(state) {
  const D = state.diameter;
  const H = state.shellHeight;
  const r = state.r11;

  const shellArea   = Math.PI * D * H;
  const roofArea    = r.scope === 'shellAndRoof' ? getConeRoofGeometry(D).area : 0;
  const shellRate   = COST_RATES.painting.externalShell[r.coatingType] || 0;
  const roofRate    = COST_RATES.painting.externalRoof[r.coatingType]  || 0;
  const shellCost   = shellArea * shellRate;
  const roofCost    = roofArea  * roofRate;
  const paintCost   = shellCost + roofCost;

  const directCost  = paintCost;
  return { shellArea, roofArea, shellRate, roofRate, shellCost, roofCost, paintCost, directCost,
           needsExternal: true, needsInternal: false,
           label: 'R11 — External Coating' };
}

// =============================================================================
// R12 — STRUCTURAL ADDITIONS (stair / platform / wind girder)
// =============================================================================
function calcR12(state) {
  const D   = state.diameter;
  const H   = state.shellHeight;
  const mat = state.shellMaterial;
  const r   = state.r12;
  const s   = REPAIR_RATES.structural;
  const mT  = matType(mat);

  let lineItems  = [];
  let directCost = 0;

  // Spiral stair
  if (r.subScopes.spiralStair) {
    const weight     = H * s.spiralStairKgPerM / 1000;
    const plateCost  = weight * COST_RATES.plate[mat];
    const fabCost    = weight * repairFabRate(COST_RATES.fabrication.structural[mT]);
    const shopLabour = calcLabour(COST_RATES.labour.unitMH.stairAdd, H, 'Shop');
    const siteLabour = calcSiteLabour('stairAdd', H);
    const sub        = plateCost + fabCost + shopLabour.totalLabourCost + siteLabour.totalLabourCost;
    directCost += sub;
    lineItems.push({ desc: 'Spiral staircase addition', weight, plateCost, fabCost, shopLabour, siteLabour, sub });
  }

  // Cage ladder
  if (r.subScopes.cageLadder) {
    const weight     = H * s.cageLadderKgPerM / 1000;
    const plateCost  = weight * COST_RATES.plate[mat];
    const fabCost    = weight * repairFabRate(COST_RATES.fabrication.structural[mT]);
    const shopLabour = calcLabour(COST_RATES.labour.unitMH.stairAdd, H, 'Shop');
    const siteLabour = calcSiteLabour('stairAdd', H);
    const sub        = plateCost + fabCost + shopLabour.totalLabourCost + siteLabour.totalLabourCost;
    directCost += sub;
    lineItems.push({ desc: 'Cage ladder addition', weight, plateCost, fabCost, shopLabour, siteLabour, sub });
  }

  // Roof perimeter walkway
  if (r.subScopes.roofPlatform) {
    const circumference = Math.PI * D;
    const weight        = circumference * s.platformKgPerM / 1000;
    const plateCost     = weight * COST_RATES.plate[mat];
    const fabCost       = weight * repairFabRate(COST_RATES.fabrication.structural[mT]);
    const shopLabour    = calcLabour(COST_RATES.labour.unitMH.platformAdd, circumference, 'Shop');
    const siteLabour    = calcSiteLabour('platformAdd', circumference);
    const sub           = plateCost + fabCost + shopLabour.totalLabourCost + siteLabour.totalLabourCost;
    directCost += sub;
    lineItems.push({ desc: 'Roof perimeter walkway addition', weight, plateCost, fabCost, shopLabour, siteLabour, sub });
  }

  // Wind girder
  if (r.subScopes.windGirder && r.windGirderRings > 0) {
    const circumference = Math.PI * D;
    const weight        = circumference * s.windGirderKgPerM / 1000 * r.windGirderRings;
    const plateCost     = weight * COST_RATES.plate[mat];
    const fabCost       = weight * repairFabRate(COST_RATES.fabrication.structural[mT]);
    const shopLabour    = calcLabour(COST_RATES.labour.unitMH.windGirder, weight, 'Shop');
    const siteLabour    = calcSiteLabour('windGirder', weight);
    const sub           = plateCost + fabCost + shopLabour.totalLabourCost + siteLabour.totalLabourCost;
    directCost += sub;
    lineItems.push({ desc: 'Wind girder addition (' + r.windGirderRings + ' ring' + (r.windGirderRings>1?'s':'') + ')',
                     weight, plateCost, fabCost, shopLabour, siteLabour, sub });
  }

  return { lineItems, directCost,
           needsExternal: true, needsInternal: false,
           label: 'R12 — Structural Additions' };
}

// =============================================================================
// R13 — STILLING WELL
// =============================================================================
function calcR13(state) {
  const H   = state.shellHeight;
  const mat = state.shellMaterial;
  const r   = state.r13;
  const sw  = REPAIR_RATES.stillingWell;
  const mT  = matType(mat);
  const matStr = mT === 'SS' ? 'SS' : 'CS';

  const length  = r.length || H;
  const kgPerM  = sw.pipeWeightKgPerM[r.pipeNPS] || sw.pipeWeightKgPerM['8in'];
  const weight  = length * kgPerM / 1000;

  const plateCost  = weight * sw.materialRatePerTonne[matStr];
  const fabCost    = weight * repairFabRate(COST_RATES.fabrication.shell[mT]);
  const shopLabour = calcLabour(COST_RATES.labour.unitMH.stillingWell, length, 'Shop');
  const siteLabour = calcSiteLabour('stillingWell', length);

  const directCost = plateCost + fabCost + shopLabour.totalLabourCost + siteLabour.totalLabourCost;
  return { length, weight, plateCost, fabCost, shopLabour, siteLabour, directCost,
           needsExternal: false, needsInternal: false,
           label: 'R13 — Stilling Well (' + r.pipeNPS + ', ' + matStr + ')' };
}

// =============================================================================
// R14 — CATHODIC PROTECTION
// =============================================================================
function calcR14(state) {
  const D  = state.diameter;
  const H  = state.shellHeight;
  const r  = state.r14;
  const cp = REPAIR_RATES.cp;

  const bottomArea   = Math.PI / 4 * D * D;
  const shellArea    = r.protectionArea === 'bottomAndShell'
                     ? Math.PI * D * cp.shellProtectionHeight : 0;
  const totalArea    = bottomArea + shellArea;
  const anodeCount   = Math.ceil(totalArea / cp.m2PerAnode);

  const materialCost = anodeCount * cp.anodeWeightKg * cp.materialPerKg;
  // R14 is site-only — no shop fab
  const siteLabour   = calcSiteLabour('cpAnode', anodeCount);

  // Anode removal for replacement (site-only)
  let removalLabourCost = 0;
  if (r.scope === 'replacement') {
    removalLabourCost = calcSiteLabour('cpAnode', anodeCount * 0.5).totalLabourCost;
  }

  const directCost = materialCost + siteLabour.totalLabourCost + removalLabourCost;
  return { totalArea, anodeCount, materialCost, siteLabour, removalLabourCost, directCost,
           needsExternal: false, needsInternal: true,
           label: 'R14 — Cathodic Protection (' + (r.scope === 'replacement' ? 'Replacement' : 'New Install') + ')' };
}

// =============================================================================
// R15 — VENTING UPGRADES
// =============================================================================
function calcR15(state) {
  const r  = state.r15;
  const vR = REPAIR_RATES.venting;
  const mT = matType(state.shellMaterial);

  const ssPremiumFactor = (r.material === 'SS') ? (1 + vR.pvVent.supplyPremiumSS) : 1;

  const pvSupply  = r.pvVentQty       * vR.pvVent.supply        * ssPremiumFactor;
  const emSupply  = r.emergencyVentQty * vR.emergencyVent.supply * ssPremiumFactor;
  const supplyCost = pvSupply + emSupply;

  const totalVents = r.pvVentQty + r.emergencyVentQty;
  const shopLabour = calcLabour(COST_RATES.labour.unitMH.ventInstall, totalVents, 'Shop');
  const siteLabour = calcSiteLabour('ventInstall', totalVents);

  const directCost = supplyCost + shopLabour.totalLabourCost + siteLabour.totalLabourCost;
  return { pvSupply, emSupply, supplyCost, shopLabour, siteLabour, directCost,
           needsExternal: false, needsInternal: false,
           label: 'R15 — Venting Upgrades' };
}

// =============================================================================
// MASTER REPAIR ESTIMATE ASSEMBLY
// =============================================================================
function assembleRepairEstimate(rState) {
  const repairs    = [];
  const calcMap = {
    r01: calcR01, r02: calcR02, r03: calcR03, r04: calcR04,
    r05: calcR05, r06: calcR06, r07: calcR07, r08: calcR08,
    r09: calcR09, r10: calcR10, r11: calcR11, r12: calcR12,
    r13: calcR13, r14: calcR14, r15: calcR15
  };

  let needsExternal = false;
  let needsInternal = false;
  let directScopeTotal = 0;

  Object.keys(calcMap).forEach(id => {
    if (rState.selected[id]) {
      try {
        const result = calcMap[id](rState);
        repairs.push({ id, ...result });
        if (result.needsExternal) needsExternal = true;
        if (result.needsInternal) needsInternal = true;
        directScopeTotal += result.directCost;
      } catch(e) {
        console.error('Error in ' + id + ':', e);
      }
    }
  });

  // Determine effective scaffold heights and any omissions
  const ifrEfrScopes = ['r01','r02','r03','r08'];
  const hasIFREFRScope = repairs.some(r => ifrEfrScopes.includes(r.id));
  const maxIfrH = REPAIR_RATES.scaffolding.ifrEfrMaxScaffoldHeight || 4;

  // For painting scopes: omit scaffold if paint height ≤ 2m (man height)
  const r10res = repairs.find(r => r.id === 'r10');
  const r11res = repairs.find(r => r.id === 'r11');
  const skipExtForPainting = r11res && r11res.shellArea > 0
    && (rState.shellHeight <= 2);
  const skipIntForPainting = r10res && r10res.paintH <= 2;

  // External scaffold: cap at 4m if only IFR/EFR scopes need external;
  //   otherwise use full H. Omit if painting-only and ≤2m.
  const externalScopesNonIFREFR = repairs.filter(r =>
    r.needsExternal && !ifrEfrScopes.includes(r.id));
  const effectiveExtH = (needsExternal && externalScopesNonIFREFR.length === 0 && hasIFREFRScope)
    ? Math.min(rState.shellHeight, maxIfrH)
    : rState.shellHeight;

  // Internal scaffold: cap at 4m if only IFR/EFR scopes need internal.
  const internalScopesNonIFREFR = repairs.filter(r =>
    r.needsInternal && !ifrEfrScopes.includes(r.id));
  const effectiveIntH = (needsInternal && internalScopesNonIFREFR.length === 0 && hasIFREFRScope)
    ? Math.min(rState.shellHeight, maxIfrH)
    : rState.shellHeight;

  const skipExt = needsExternal && skipExtForPainting && externalScopesNonIFREFR.length === 0;
  const skipInt = needsInternal && skipIntForPainting && internalScopesNonIFREFR.length === 0;

  const scaffolding    = calcScaffolding(rState.diameter, rState.shellHeight,
                                          needsExternal, needsInternal,
                                          effectiveExtH, effectiveIntH,
                                          skipExt, skipInt);
  const mobilisation   = calcMobilisation(directScopeTotal);
  const subtotal       = directScopeTotal + scaffolding.total + mobilisation;

  return { repairs, scaffolding, mobilisation, directScopeTotal, subtotal };
}
