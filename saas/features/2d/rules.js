var Plans2DRules = (function () {
    return {
        IDS: {
            paperFormat: 'paper-format-select',
            drawingScale: 'drawing-scale-select',
            showBottom: 'cb-vue-dessous',
            projectTitle: 'cartouche-title',
            planNumber: 'cartouche-plan-number',
            date: 'cartouche-date',
            drafter: 'cartouche-drafter',
            checker: 'cartouche-checker',
            index: 'cartouche-index'
        },
        PAPER_FORMATS: {
            A4_P: { w: 210, h: 297 },
            A4_L: { w: 297, h: 210 },
            A3_P: { w: 297, h: 420 },
            A3_L: { w: 420, h: 297 },
            A2_P: { w: 420, h: 594 },
            A2_L: { w: 594, h: 420 }
        },
        DEFAULT_PAPER_FORMAT: 'A2_P',
        DEFAULT_DRAWING_SCALE: '1:1',
        DRAW_STYLE: {
            page: {
                margin: 10,
                frameLineWidth: 0.5,
                shadow: { color: 'rgba(0, 0, 0, 0.2)', blur: 12, offsetX: 0, offsetY: 0 }
            },
            mainView: {
                liftY: 20,
                strokeVisibleMm: 0.6,
                strokeHiddenMm: 0.25,
                hiddenDashMm: [6, 3]
            },
            cartouche: {
                referenceFormat: 'A4_P',
                rowHeight: 13,
                unitRowFactor: 0.5,
                labelPadding: 1.2,
                labelPaddingY: 1,
                valueOffsetY: 1.2,
                fontLabel: '2px Arial',
                fontValue: '4.5px Arial',
                fontBrand: '9px Arial',
                fontUnit: '3.5px Arial'
            },
            cotation: {
                strokeColor: '#000000',
                fillColor: '#000000',
                lineWidthFactor: 0.15,
                textFontPx: 3
            }
        }
    };
})();
