// @ts-nocheck
// Cartouche du plan 2D : grille, placement, textes (menus + resultats Calcul).
var Plans2DCartouche = (function () {
    var COLS = 4;
    var FULL_ROWS = 5;

    function getStyle(style) {
        var base = (typeof Plans2DRules !== 'undefined' && Plans2DRules.DRAW_STYLE && Plans2DRules.DRAW_STYLE.cartouche)
            ? Plans2DRules.DRAW_STYLE.cartouche
            : {};
        var s = style || {};
        return {
            referenceFormat: s.referenceFormat || base.referenceFormat || 'A4_P',
            rowHeight: s.rowHeight || base.rowHeight || 13,
            unitRowFactor: s.unitRowFactor != null ? s.unitRowFactor : (base.unitRowFactor != null ? base.unitRowFactor : 0.5),
            labelPadding: s.labelPadding != null ? s.labelPadding : (base.labelPadding != null ? base.labelPadding : 1.2),
            labelPaddingY: s.labelPaddingY != null ? s.labelPaddingY : (base.labelPaddingY != null ? base.labelPaddingY : 1),
            valueOffsetY: s.valueOffsetY != null ? s.valueOffsetY : (base.valueOffsetY != null ? base.valueOffsetY : 1.2),
            fontLabel: s.fontLabel || base.fontLabel || '2px Arial',
            fontValue: s.fontValue || base.fontValue || '4.5px Arial',
            fontBrand: s.fontBrand || base.fontBrand || '9px Arial',
            fontUnit: s.fontUnit || base.fontUnit || '3.5px Arial'
        };
    }

    function readField(id, fallback) {
        var el = document.getElementById(id);
        if (!el) return fallback || '';
        if (el.tagName === 'SELECT' && el.options && el.selectedIndex >= 0) {
            return el.options[el.selectedIndex].text || el.value || fallback || '';
        }
        return el.value || fallback || '';
    }

    function showText(val) {
        if (val === null || val === undefined) return '-';
        var s = String(val).trim();
        return s === '' ? '-' : s;
    }

    function toUpper(str) {
        return String(str == null ? '' : str).toLocaleUpperCase('fr-FR');
    }

    // --- Donnees affichees dans le cartouche ---

    function readPaperFormatShort() {
        var ids = (typeof Plans2DRules !== 'undefined' && Plans2DRules.IDS) ? Plans2DRules.IDS : {};
        var el = document.getElementById(ids.paperFormat || 'paper-format-select');
        if (!el || !el.value) return 'A4';
        var match = String(el.value).match(/^(A\d+)/i);
        return match ? match[1].toUpperCase() : 'A4';
    }

    function readMenuData() {
        var ids = (typeof Plans2DRules !== 'undefined' && Plans2DRules.IDS) ? Plans2DRules.IDS : {};
        var scale = (typeof Plans2DViews !== 'undefined' && Plans2DViews.getScaleLabel)
            ? Plans2DViews.getScaleLabel()
            : readField(ids.drawingScale || 'drawing-scale-select', '1:1');
        return {
            scale: scale,
            planNumber: readField(ids.planNumber || 'cartouche-plan-number', ''),
            date: readField(ids.date || 'cartouche-date', ''),
            drafter: readField(ids.drafter || 'cartouche-drafter', ''),
            format: readPaperFormatShort(),
            checker: readField(ids.checker || 'cartouche-checker', ''),
            title: readField(ids.projectTitle || 'cartouche-title', ''),
            index: readField(ids.index || 'cartouche-index', '')
        };
    }

    function readCalculeData() {
        var dash = { capaciteNominal: '-', capaciteRasBord: '-', poids: '-', brochage: '-' };
        if (typeof CalculeVolumeFeature === 'undefined' || !CalculeVolumeFeature.getResults) return dash;
        var r = CalculeVolumeFeature.getResults();
        if (!r || !r.available) return dash;
        var brochage = '-';
        if (r.canuleMm > 0) {
            brochage = String.fromCharCode(216) + ' ' + r.canuleMm.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' mm';
        }
        return {
            capaciteNominal: r.capaciteUtileCl.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' cl',
            capaciteRasBord: r.rasBordCl.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' cl',
            poids: r.poidsVerreG.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' g',
            brochage: brochage
        };
    }

    function getData() {
        return {
            menu: readMenuData(),
            calcule: readCalculeData()
        };
    }

    // --- Taille et position sur la feuille ---

    function getWidth(margin, referenceFormat) {
        var m = margin != null ? margin : 10;
        var formats = (typeof Plans2DRules !== 'undefined' && Plans2DRules.PAPER_FORMATS)
            ? Plans2DRules.PAPER_FORMATS
            : { A4_P: { w: 210 } };
        var ref = formats[referenceFormat] || formats.A4_P || { w: 210 };
        return ref.w - m * 2;
    }

    function getLayout(paperW, paperH, margin, style) {
        var s = getStyle(style);
        var w = getWidth(margin, s.referenceFormat);
        var rowH = s.rowHeight;
        var h = rowH * FULL_ROWS + rowH * s.unitRowFactor;
        var left = -paperW / 2 + margin;
        var right = paperW / 2 - margin;
        var bottom = paperH / 2 - margin;
        var innerW = paperW - margin * 2;
        var x = Math.abs(innerW - w) < 0.5 ? left : right - w;
        return { x: x, y: bottom - h, width: w, height: h, rowHeight: rowH, unitHeight: rowH * s.unitRowFactor };
    }

    // --- Dessin ---

    function line(ctx, x1, y1, x2, y2) {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
    }

    function drawGrid(ctx, box) {
        var x = box.x;
        var y = box.y;
        var w = box.width;
        var h = box.height;
        var rowH = box.rowHeight;
        var colW = w / COLS;
        var yBottle = y + rowH * 2;
        var yUnit = y + rowH * FULL_ROWS;

        ctx.beginPath();
        ctx.strokeRect(x, y, w, h);

        for (var r = 1; r <= FULL_ROWS; r++) {
            line(ctx, x, y + rowH * r, x + w, y + rowH * r);
        }

        line(ctx, x + w / 2, y, x + w / 2, yBottle);
        line(ctx, x + colW, y + rowH * 2, x + colW, yUnit);
        line(ctx, x + colW * 3, y + rowH * 2, x + colW * 3, yUnit);
        line(ctx, x + colW * 2, y + rowH * 2, x + colW * 2, y + rowH * 3);

        ctx.stroke();
    }

    function drawCell(ctx, rect, label, value, style) {
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = style.fontLabel;
        ctx.fillText(toUpper(label), rect.x + style.labelPadding, rect.y + style.labelPaddingY);
        ctx.font = style.fontValue;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(toUpper(showText(value)), rect.x + rect.w / 2, rect.y + rect.h / 2 + style.valueOffsetY);
    }

    function cellRect(box, row, col, colSpan) {
        var colW = box.width / COLS;
        colSpan = colSpan || 1;
        return {
            x: box.x + col * colW,
            y: box.y + row * box.rowHeight,
            w: colW * colSpan,
            h: box.rowHeight
        };
    }

    function drawBrandName(ctx, box, style) {
        var rect = cellRect(box, 3, 1, 2);
        ctx.fillStyle = '#000000';
        ctx.font = style.fontBrand;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(toUpper('NOLIMI'), rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    function draw(ctx, cartX, cartY, style) {
        if (!ctx) return;
        var s = getStyle(style);
        var data = getData();
        var menu = data.menu;
        var calc = data.calcule;

        var box = {
            x: cartX,
            y: cartY,
            width: style && style.width ? style.width : getWidth(10, s.referenceFormat),
            height: style && style.height ? style.height : (s.rowHeight * FULL_ROWS + s.rowHeight * s.unitRowFactor),
            rowHeight: s.rowHeight
        };

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.5;
        drawGrid(ctx, box);

        drawCell(ctx, cellRect(box, 0, 0, 2), 'Capacite nominal :', calc.capaciteNominal, s);
        drawCell(ctx, cellRect(box, 0, 2, 2), 'Poid :', calc.poids, s);
        drawCell(ctx, cellRect(box, 1, 0, 2), 'Capacite Ras Bord :', calc.capaciteRasBord, s);
        drawCell(ctx, cellRect(box, 1, 2, 2), 'Brochage :', calc.brochage, s);

        drawCell(ctx, cellRect(box, 2, 0), 'ECH.', menu.scale, s);
        drawCell(ctx, cellRect(box, 2, 1), 'NUMERO PLAN', 'n' + String.fromCharCode(176) + ' ' + showText(menu.planNumber), s);
        drawCell(ctx, cellRect(box, 2, 2), 'DATE', menu.date, s);
        drawCell(ctx, cellRect(box, 2, 3), 'DESSI.', menu.drafter, s);

        drawCell(ctx, cellRect(box, 3, 0), 'FORMAT', menu.format, s);
        drawBrandName(ctx, box, s);
        drawCell(ctx, cellRect(box, 3, 3), 'VERIF.', menu.checker, s);

        drawCell(ctx, cellRect(box, 4, 0), 'PROJ.', 'EUROPEENNE', s);
        drawCell(ctx, cellRect(box, 4, 1, 2), 'TITRE', menu.title, s);
        drawCell(ctx, cellRect(box, 4, 3), 'INDICE', menu.index, s);

        ctx.font = s.fontUnit;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var unitTop = box.y + box.rowHeight * FULL_ROWS;
        var unitH = box.height - box.rowHeight * FULL_ROWS;
        ctx.fillText(toUpper('UNITE : mm'), box.x + box.width / 2, unitTop + unitH / 2);
    }

    return {
        getData: getData,
        getLayout: getLayout,
        draw: draw,
        showText: showText
    };
})();
