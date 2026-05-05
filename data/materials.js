// =============================================================================
// MATERIALS.JS — API 650 Material Properties
// =============================================================================
// Reference: API 650, 12th Edition, Table 5-2a (Allowable Design Stresses)
// This file changes very rarely. Only update if API 650 is revised or new
// materials are added to scope.
// Last updated: 2025-01
// =============================================================================

const MATERIALS = {

  "CS-A36": {
    label:          "Carbon Steel — ASTM A36",
    shortLabel:     "CS — A36",
    type:           "CS",
    Sd:             137.9,    // Allowable design stress, MPa (API 650 Table 5-2a)
    St:             158.6,    // Allowable hydrostatic test stress, MPa
    density:        7850,     // kg/m³
    defaultCA_shell: 3,       // Recommended corrosion allowance, mm
    defaultCA_bottom: 3
  },

  "CS-A516-60": {
    label:          "Carbon Steel — ASTM A516 Gr.60",
    shortLabel:     "CS — A516 Gr.60",
    type:           "CS",
    Sd:             137.9,
    St:             158.6,
    density:        7850,
    defaultCA_shell: 3,
    defaultCA_bottom: 3
  },

  "CS-A516-70": {
    label:          "Carbon Steel — ASTM A516 Gr.70",
    shortLabel:     "CS — A516 Gr.70",
    type:           "CS",
    Sd:             158.6,    // Higher yield strength → higher allowable stress
    St:             182.7,
    density:        7850,
    defaultCA_shell: 3,
    defaultCA_bottom: 3
  },

  "SS-304": {
    label:          "Stainless Steel — AISI 304 (A240 TP304)",
    shortLabel:     "SS — 304",
    type:           "SS",
    Sd:             120.0,
    St:             138.0,
    density:        7900,
    defaultCA_shell: 0,       // SS does not require corrosion allowance in most services
    defaultCA_bottom: 0
  },

  "SS-316": {
    label:          "Stainless Steel — AISI 316 (A240 TP316)",
    shortLabel:     "SS — 316",
    type:           "SS",
    Sd:             120.0,
    St:             138.0,
    density:        7900,
    defaultCA_shell: 0,
    defaultCA_bottom: 0
  },

  "SS-316L": {
    label:          "Stainless Steel — AISI 316L (A240 TP316L)",
    shortLabel:     "SS — 316L",
    type:           "SS",
    Sd:             115.0,    // Slightly lower due to reduced carbon content
    St:             132.0,
    density:        7900,
    defaultCA_shell: 0,
    defaultCA_bottom: 0
  }

};
