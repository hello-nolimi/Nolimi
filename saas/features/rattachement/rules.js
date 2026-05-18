// Règles et constantes partagées pour les rattachements.
var RattachementRules = (function () {
    return {
        PROFILE_OPTIONS_HTML: ''
            + '<option value="ligne">Ligne</option>'
            + '<option value="courbeS">Courbe S</option>'
            + '<option value="rayon">Rayon</option>'
            + '<option value="spline">Spline</option>',
        DEFAULT_EDGE_TYPE: 'ligne',
        DEFAULT_RHO: 0,
        ALLOWED_EDGE_TYPES: ['ligne', 'rayon', 'courbeS', 'spline'],
        RHO_MIN: 0,
        RHO_MAX: 400,
        QUARTER_ARC_TOLERANCE_MM: 0.5,
        /** Angle au coin admissible pour un congé (pas seulement 90°). */
        RAYON_MIN_CORNER_ANGLE_DEG: 25,
        RAYON_MAX_CORNER_ANGLE_DEG: 155,
        SPLINE_STEPS: 48,
        MIN_SAFE_X: 1
    };
})();
