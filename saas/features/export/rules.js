var ExportRules = (function () {
    return {
        IDS: {
            export3D: 'btn-export-3d',
            export2D: 'btn-export-2d',
            dropdown: 'fichier-dropdown',
            canvas2D: 'canvas-2d',
            paperFormat: 'paper-format-select',
            projectTitle: 'cartouche-title'
        },
        DEFAULTS: {
            file3D: 'Bouteille',
            file2D: 'Plan_Bouteille',
            paperFormat: 'A4_P',
            jpegQuality: 1.0,
            exportScaleFactor: 8
        },
        PAPER_MAP: {
            A4_P: { orientation: 'p', format: 'a4' },
            A4_L: { orientation: 'l', format: 'a4' },
            A3_P: { orientation: 'p', format: 'a3' },
            A3_L: { orientation: 'l', format: 'a3' },
            A2_P: { orientation: 'p', format: 'a2' },
            A2_L: { orientation: 'l', format: 'a2' }
        }
    };
})();
