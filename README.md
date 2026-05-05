# API 650 / 653 Tank Cost Estimator — Project Handoff Summary
**Version:** v1.2.0 | **Currency:** SGD | **Basis:** SE Asia market, Q1 2025 | **Accuracy:** ±20–25%

---

## What Was Built
A browser-based tank project cost estimator. Single `index.html` entry point, opened directly from a shared drive — no installation, no server, no admin rights required. All files are in a `tank-estimator/` folder.

---

## File Structure
```
tank-estimator/
  index.html                          ← entry point (landing screen → new-build or repair)
  css/style.css                       ← all styling (includes landing cards + repair layout)
  js/calculations.js                  ← API 650 engineering engine (shared by both modules)
  js/app.js                           ← new-build wizard flow, validation, state (v1.2.0)
  js/output.js                        ← new-build cost assembly and estimate rendering
  js/repair/
    repair_app.js                     ← repair wizard flow & state (4-step)
    repair_calculations.js            ← repair engineering + cost engine (R01–R15)
    repair_output.js                  ← repair estimate rendering with MH breakdown
  data/
    cost_rates.js                     ← ⭐ MAINTAINER EDITS: material, fab, paint rates + COST_RATES.labour
    repair_rates.js                   ← ⭐ MAINTAINER EDITS: scaffolding, jacking, CP, venting, stilling well rates
    nozzle_rates.js                   ← ⭐ MAINTAINER EDITS: nozzle/manhole rates by size and material
    default_nozzle_schedule.js        ← ⭐ MAINTAINER EDITS: default nozzle counts by tank diameter
    materials.js                      ← API 650 allowable stresses (rarely changes)
```
Data files use `const` declarations loaded via `<script src="">` — not `fetch()` — because `file://` protocol blocks dynamic imports.

---

## Application Flow

### Landing Screen
Opens on load. Two choices:
- **New Tank (API 650)** → `initNewBuild()` → shows `#newbuild-wrapper`
- **Repair / Retrofit (API 653)** → `initRepairModule()` → shows `#repair-wrapper`, calls `buildRepairUI()`

### New-Build Module (unchanged from v1.1.0 logic)
3-step wizard: Geometry → Materials & Design → Scope & Options → Output

### Repair Module (new in v1.2.0)
4-step wizard:
1. **Select Repairs** — checklist of R01–R15 (multiple selections allowed; all costs combined into one output)
2. **Existing Tank** — diameter, shell height, SG, material, current roof/IFR/EFR config
3. **Repair Details** — dynamic per-scope input panels for each selected repair
4. **Options** — contingency %
→ **Output** — full itemised estimate with manhour breakdown per trade

---

## Repair Scope List (R01–R15)

| ID  | Repair / Retrofit |
|-----|-------------------|
| R01 | Add Internal Floating Roof (IFR) to existing fixed-roof tank |
| R02 | Remove existing IFR or EFR (complete removal) |
| R03 | Repair IFR or EFR (sub-scopes: deck patch, pontoon, legs, bleeder vents, vacuum breakers, full deck replace) |
| R04 | Tank bottom repair or full replacement (partial scan-and-patch or full lift + replacement) |
| R05 | Shell plate replacement (% of total shell area) |
| R06 | Cone / dome roof replacement (full or partial %) |
| R07 | Add or replace aluminium geodesic dome |
| R08 | Rim seal replacement (primary or primary + secondary) |
| R09 | Nozzle additions or replacements (small/medium/large/manhole, add or replace qty) |
| R10 | Internal coating / lining (glass flake or standard epoxy, full or partial height) |
| R11 | External coating (standard or premium, shell only or shell + roof) |
| R12 | Structural additions (spiral stair, cage ladder, roof walkway, wind girder rings) |
| R13 | Stilling well addition (NPS 6"–12", CS or SS, length defaults to shell height) |
| R14 | Cathodic protection — sacrificial anodes per API 651 (new install or replacement) |
| R15 | Venting upgrades — P/V vents and emergency vents (vendor supply + install) |

---

## Key Engineering Decisions

### New-Build (v1.1.0, unchanged)
| Decision | What was decided |
|---|---|
| Design standard | API 650, 12th Edition throughout |
| Shell thickness | One-foot method §5.6.3 (metric) |
| Cone roof | D ≤ 12 m → self-supporting (no rafters, 6 mm min). D > 12 m → rafter-supported (5 mm min) |
| Structural allowance | 12% of shell weight (wind girder, stiffeners, top angle) |
| Roof types | Fixed Cone (CS), Fixed Dome (CS), Geodesic Dome (aluminium, $/m²), EFR single/double deck, Open Top |
| IFR types | CS Pontoon, CS Full Contact — priced per tonne |
| Frangible roof | User selects; non-frangible adds 7% fab premium + P/V vent warning |
| Materials | CS: A36, A516 Gr.60, A516 Gr.70. SS: 304, 316, 316L |
| Default SG | G = 1.0 |
| Default wind speed | 35 m/s per SS CP3 (Singapore), user-overridable |

### Repair Module (v1.2.0, new)
| Decision | What was decided |
|---|---|
| Design standard | API 653 repair philosophy |
| Labour costing | Manhour-based: unit MH per trade per scope × SGD/hr subcontractor rate |
| Welder productivity basis | 60 mm/min/pass (site butt welds) — used to derive unit WLD MH rates |
| Trade categories | WLD (Welder), FTR (Fitter), RIG (Rigger), SCF (Scaffolder), FMN (Foreman), HLP (Helper) |
| Indirect labour | 25% of direct MH — Safety Officer + QC Inspector at SGD 35/hr blended rate |
| Labour rates type | All-in subcontractor rates (inclusive of subcontractor overhead & margin) |
| Repair shop fab premium | 5% above new-build fabrication rates in `cost_rates.js` |
| Scaffolding — external | π×D×H×2 m band volume @ SGD 10/m³ + working platforms @ SGD 8/m² (every 2 m height) |
| Scaffolding — internal | Tank volume (π/4×D²×H) @ SGD 13/m³ |
| Scaffolding assignment | Automatic — repair_calculations.js sets `needsExternal` / `needsInternal` per scope |
| Mobilisation | 1% of direct scope cost, min SGD 5,000, max SGD 15,000 |
| Jacking (R04 full bottom) | SGD 15,000 lump sum + SGD 800/m of circumference (scales with tank size) |
| CP anodes (R14) | API 651 — 1 anode per 20 m² of protected surface, 5 kg magnesium anode @ SGD 25/kg |
| Material rates for repair | Reuse existing `cost_rates.js` plate rates — same material, same source |
| Bottom replacement scope | Partial (scan-and-patch, % of area) or Full (jacking method, 100%) |
| Shell replacement input | % of total shell area (π×D×H) |
| Roof replacement input | Full or partial (% of roof area) |
| Stilling well | NPS 6–12", Schedule 40, perforated — material by pipe weight (kg/m), fab + site install |
| Tank cleaning / gas freeing | Excluded — noted explicitly on every repair output page |
| Hydrostatic test (repair) | Excluded — noted as conditional exclusion |

---

## What Is Costed — New-Build (A–K)
A) Material supply (plate, $/t by grade)
B) Fabrication ex-yard Malaysia ($/t by component and material type)
C) Aluminium geodesic dome (vendor supply + install, $/m²)
D) Nozzles & manholes (auto-schedule by diameter band, user-editable, $/ea by size and material)
E) Site erection Singapore ($/t, traditional or jacking method)
F) Painting — internal (full or partial height), external shell, external roof, floating roof top/underside
G) Accessories — spiral stair or cage ladder, roof perimeter walkway, rolling ladder (EFR), drip ring, anchor chairs
H) Rim seal (IFR or EFR, primary or primary+secondary, $/m circumference)
I) Fire protection piping per SS 532 (Class I–III costed; Class IV none)
J) Freight (MYS→SG or local SG, $/t + lump sum)
~~K) Hydrostatic test~~ ← **Removed in v1.2.0**

## What Is Costed — Repair (per selected scope)
- Material supply (reuses `cost_rates.js` plate rates)
- Shop fabrication (new-build rate + 5% repair premium)
- Site labour (MH × rate per trade, visible on output)
- Indirect labour (25% of direct MH)
- Scaffolding (external and/or internal, computed automatically)
- Mobilisation (1%, capped)
- Vendor supply items (rim seals, vents, CP anodes, geodesic dome)
- Contingency (user-adjustable %)

---

## Fixed Exclusions — New-Build
Foundation & civil works, nozzle internals, instrumentation, P/V relief valves (unless non-frangible), fire water ring main, insulation/cladding, external pipework beyond nozzle face, EPCM fees, regulatory approvals, commissioning.

## Fixed Exclusions — Repair
Tank cleaning / gas freeing, NDE beyond standard QC, foundation & civil works, nozzle internals, instrumentation, external pipework, regulatory submissions, EPCM fees, hydrostatic test (conditional).

---

## Maintainer Rate Files

### `data/cost_rates.js` — top-level keys
```
COST_RATES.plate              — SGD/tonne by material key (e.g. "CS-A36", "SS-316")
COST_RATES.fabrication        — SGD/tonne by component (shell, bottom, coneRoof, domeRoof,
                                ifrPontoon, ifrFullContact, efrSingleDeck, efrDoubleDeck, structural)
COST_RATES.aluminumDome       — SGD/m² vendor supply + install
COST_RATES.siteErection       — SGD/tonne by method (traditional, jacking)
COST_RATES.painting           — SGD/m² by surface (internal.glassFlake, internal.standard,
                                externalShell.standard, externalShell.premium,
                                externalRoof.standard, externalRoof.premium,
                                floatingRoofTop.CS, floatingRoofUnderside.CS)
COST_RATES.rimSeal            — SGD/m circumference by type (primary/primarySecondary) and IFR/EFR
COST_RATES.freight            — SGD/tonne + lump sum by option (mysSg, localSg)
COST_RATES.labour             — ADDED v1.2.0:
  .unitMH                     — MH per trade per repair scope (WLD, FTR, RIG, FMN, HLP)
  .rates                      — SGD/hr per trade (WLD:28, FTR:24, RIG:22, SCF:20, FMN:32, HLP:15, IND:35)
  .indirectPct                — 0.25 (25% indirect ratio, editable)
  .scfMHperM3 / scfMHperM2    — scaffolder MH per volume/area unit
```

### `data/repair_rates.js` — top-level keys
```
REPAIR_RATES.mobilisation     — { pct:0.01, min:5000, max:15000 }
REPAIR_RATES.scaffolding      — external { width, perM3, platformPerM2, platformInterval }
                                internal { perM3 }
REPAIR_RATES.jacking          — { baseLumpSum:15000, perMCircumference:800 }
REPAIR_RATES.repairShopPremium — 0.05 (5%)
REPAIR_RATES.cp               — anode sizing parameters (API 651)
REPAIR_RATES.venting          — PV vent and emergency vent supply rates
REPAIR_RATES.stillingWell     — pipe weight (kg/m) by NPS, material supply rate (SGD/t)
REPAIR_RATES.ifrRepair        — deck/pontoon thickness, pontoon area fraction, leg weight, vendor items
REPAIR_RATES.structural       — kg/m for wind girder, stair, ladder, platform
```

---

## Known Limitations / Open Items
- All rates are **assumed, not validated** — calibrate against completed project data. Priority: `cost_rates.js` plate + fab rates, then `repair_rates.js` labour rates.
- Repair labour MH rates derived from 60 mm/min/pass first principles — validate against site timesheets.
- Seismic loading not considered (wind governs Singapore).
- No Excel export — print-to-PDF via browser only.
- Version number must be manually updated in `app.js` (`APP_VERSION`) and `repair_output.js` (`APP_VERSION_REPAIR`) and `index.html` title/badge when changes are made.
- Hydrotest item removed from new-build in v1.2.0 (per client decision).
- R03 sub-scope checkboxes (deck patch, pontoon, etc.) use `toggle()` helper — verify JS console is clean on first load.

---

## Version History
| Version | Key Changes |
|---|---|
| v1.0.0 | Initial new-build estimator |
| v1.1.0 | IFR/EFR types, painting sub-items, rim seal, fire protection, freight, nozzle schedule |
| v1.2.0 | Landing screen, repair module (R01–R15), manhour-based labour, scaffolding engine, `COST_RATES.labour` added to `cost_rates.js`, hydrotest removed |
