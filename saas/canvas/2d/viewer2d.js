const canvas2d = document.getElementById('canvas-2d');
const ctx2d = canvas2d.getContext('2d');
const view2DContainer = document.getElementById('viewport-2d');

let cam2D = (typeof Plans2DState !== 'undefined' && Plans2DState.getCamera)
    ? Plans2DState.getCamera()
    : { x: 0, y: 0, zoom: 0 };

const paperFormats = (typeof Plans2DPaper !== 'undefined' && Plans2DPaper.getFormats)
    ? Plans2DPaper.getFormats()
    : (typeof Plans2DFeature !== 'undefined' && Plans2DFeature.getPaperFormats)
        ? Plans2DFeature.getPaperFormats()
    : {
        'A4_P': { w: 210, h: 297 },
        'A4_L': { w: 297, h: 210 },
        'A3_P': { w: 297, h: 420 },
        'A3_L': { w: 420, h: 297 },
        'A2_P': { w: 420, h: 594 },
        'A2_L': { w: 594, h: 420 }
    };
window.paperFormats = paperFormats;

function resizeCanvas2D() {
    if (view2DContainer.clientWidth === 0 || view2DContainer.clientHeight === 0) return;
    canvas2d.width = view2DContainer.clientWidth;
    canvas2d.height = view2DContainer.clientHeight;
    if (cam2D.zoom === 0) centerPaper();
    draw2D();
}

function centerPaper() {
    if (canvas2d.width === 0 || canvas2d.height === 0) return;
    const paper = (typeof Plans2DPaper !== 'undefined' && Plans2DPaper.getPaperInfo)
        ? Plans2DPaper.getPaperInfo()
        : (typeof Plans2DFeature !== 'undefined' && Plans2DFeature.getPaperInfo)
            ? Plans2DFeature.getPaperInfo()
            : (paperFormats['A4_P'] || { w: 210, h: 297 });
    const scaleX = (canvas2d.width * 0.85) / paper.w;
    const scaleY = (canvas2d.height * 0.85) / paper.h;
    cam2D.zoom = Math.min(scaleX, scaleY);
    cam2D.x = canvas2d.width / 2;
    cam2D.y = canvas2d.height / 2;
    if (typeof Plans2DState !== 'undefined' && Plans2DState.setCamera) Plans2DState.setCamera(cam2D);
}


const fText = (v) => (typeof Plans2DCotation !== 'undefined' && Plans2DCotation.formatValue)
    ? Plans2DCotation.formatValue(v)
    : (typeof Plans2DMath !== 'undefined' && Plans2DMath.formatText)
        ? Plans2DMath.formatText(v)
        : (Number.isInteger(v) ? v : v.toFixed(1));
const plans2DData = (typeof Plans2DData !== 'undefined') ? Plans2DData : null;
const primitives2D = (typeof Canvas2DRenderPrimitives !== 'undefined') ? Canvas2DRenderPrimitives : null;

function getRattachementLabel(rattId) {
    if (typeof Plans2DCotation !== 'undefined' && Plans2DCotation.getRattachementLabel) {
        return Plans2DCotation.getRattachementLabel(rattId);
    }
    return null;
}

function draw2D() {
    if (!ctx2d || canvas2d.width === 0) return;

    ctx2d.clearRect(0, 0, canvas2d.width, canvas2d.height);
    
    // NOUVEAU FOND ICI :
    ctx2d.fillStyle = '#ffffff'; 
    ctx2d.fillRect(0, 0, canvas2d.width, canvas2d.height);

    ctx2d.save();
    ctx2d.translate(cam2D.x, cam2D.y);
    ctx2d.scale(cam2D.zoom, cam2D.zoom);
    const drawStyle = (typeof Plans2DRules !== 'undefined' && Plans2DRules.DRAW_STYLE) ? Plans2DRules.DRAW_STYLE : null;
    const pageStyle = drawStyle && drawStyle.page ? drawStyle.page : { margin: 10, frameLineWidth: 0.5, shadow: { color: 'rgba(0, 0, 0, 0.2)', blur: 12, offsetX: 0, offsetY: 0 } };
    const cartoucheStyle = drawStyle && drawStyle.cartouche ? drawStyle.cartouche : { rowHeight: 13, unitRowFactor: 0.5 };

    // ---- FEUILLE BLANCHE ----
    const paper = (typeof Plans2DPaper !== 'undefined' && Plans2DPaper.getPaperInfo)
        ? Plans2DPaper.getPaperInfo()
        : (typeof Plans2DFeature !== 'undefined' && Plans2DFeature.getPaperInfo)
            ? Plans2DFeature.getPaperInfo()
            : (paperFormats['A4_P'] || { w: 210, h: 297 });
    const paperW = paper.w;
    const paperH = paper.h;
    const startX = -paperW / 2;
    const startY = -paperH / 2;

    // Ombre centree autour de la feuille (pas de decalage droite/bas).
    ctx2d.shadowColor = pageStyle.shadow.color;
    ctx2d.shadowBlur = pageStyle.shadow.blur;
    ctx2d.shadowOffsetX = pageStyle.shadow.offsetX;
    ctx2d.shadowOffsetY = pageStyle.shadow.offsetY;
    ctx2d.fillStyle = '#ffffff';
    ctx2d.fillRect(startX, startY, paperW, paperH);
    ctx2d.shadowColor = 'transparent';

    // ---- CADRE ----
    const margin = pageStyle.margin;
    ctx2d.strokeStyle = '#000000';
    ctx2d.lineWidth = pageStyle.frameLineWidth;
    ctx2d.strokeRect(startX + margin, startY + margin, paperW - margin * 2, paperH - margin * 2);

    // ---- CARTOUCHE (largeur zone utile A4, taille fixe quel que soit le format) ----
    const cartLayout = (typeof Plans2DCartouche !== 'undefined' && Plans2DCartouche.getLayout)
        ? Plans2DCartouche.getLayout(paperW, paperH, margin, cartoucheStyle)
        : null;
    if (cartLayout && typeof Plans2DCartouche !== 'undefined' && Plans2DCartouche.draw) {
        Plans2DCartouche.draw(ctx2d, cartLayout.x, cartLayout.y, Object.assign({}, cartoucheStyle, {
            width: cartLayout.width,
            height: cartLayout.height
        }));
    }

    // ---- GESTION DES VUES (LOGIQUE) ----
    const showBottomView = (typeof Plans2DViews !== 'undefined' && Plans2DViews.getShowBottomView)
        ? Plans2DViews.getShowBottomView()
        : false;

    let mainViewOffsetX = 0;
    if (showBottomView) {
        mainViewOffsetX = -paperW / 6; 
    }

    let drawingScale = (typeof Plans2DViews !== 'undefined' && Plans2DViews.getDrawingScale)
        ? Plans2DViews.getDrawingScale()
        : 1;

    let points = null;
    if (typeof getBottleProfileFromData === 'function') {
        points = getBottleProfileFromData();
    }
    if ((!points || points.length === 0) && typeof generateBottleProfile === 'function') {
        points = generateBottleProfile();
    }
    if (!points || points.length === 0) {
        ctx2d.restore();
        return;
    }
    {
        // Dimensions dérivées du profil (modèle 6 sections)
        const bottleHeight = points[points.length - 1].y;
        let max_R = 0;
        let bodyY = 0;
        for (let i = 0; i < points.length; i++) {
            if (points[i].x > max_R) {
                max_R = points[i].x;
                bodyY = points[i].y;
            }
        }
        const R_base = points[0].x;
        const R_top = points[points.length - 1].x;
        const D_bas = R_base * 2;
        const D_epaule = max_R * 2;
        const D_finish = R_top * 2;
        
        const mainViewLiftY = (drawStyle && drawStyle.mainView && drawStyle.mainView.liftY != null)
            ? drawStyle.mainView.liftY
            : 20;
        const mainViewOffsetY = (bottleHeight * drawingScale) / 2 - mainViewLiftY;

        ctx2d.save();
        ctx2d.translate(mainViewOffsetX, mainViewOffsetY);
        ctx2d.scale(drawingScale, -drawingScale); 

        // 1. Axe de symétrie
        ctx2d.beginPath();
        ctx2d.setLineDash([10, 2, 2, 2]);
        ctx2d.moveTo(0, -10);
        ctx2d.lineTo(0, bottleHeight + 20);
        ctx2d.strokeStyle = '#888888';
        ctx2d.lineWidth = 0.3 / drawingScale; 
        ctx2d.stroke();
        ctx2d.setLineDash([]);

        // 2. Bouteille Principale
        ctx2d.strokeStyle = '#000000';
        ctx2d.lineWidth = 0.6 / drawingScale; 
        ctx2d.lineJoin = 'round';

        ctx2d.beginPath();
        ctx2d.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx2d.lineTo(points[i].x, points[i].y);
        ctx2d.lineTo(0, points[points.length-1].y);
        ctx2d.stroke();

        ctx2d.beginPath();
        ctx2d.moveTo(-points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx2d.lineTo(-points[i].x, points[i].y);
        ctx2d.lineTo(0, points[points.length-1].y);
        ctx2d.moveTo(points[0].x, points[0].y);
        ctx2d.lineTo(-points[0].x, points[0].y);
        ctx2d.stroke();

        // 2bis. Piqûre (pointillés) + bague (trait plein)
        const piqureProfile = (plans2DData && plans2DData.getPiqureProfile2D) ? plans2DData.getPiqureProfile2D() : [];
        const bagueProfile = (plans2DData && plans2DData.getBagueProfile2D) ? plans2DData.getBagueProfile2D() : [];
        if (primitives2D && primitives2D.drawSymmetricProfile) primitives2D.drawSymmetricProfile(ctx2d, piqureProfile, drawingScale, { dashed: true, strokeStyle: '#000000', lineWidth: 0.45 });
        if (primitives2D && primitives2D.drawSymmetricProfile) primitives2D.drawSymmetricProfile(ctx2d, bagueProfile, drawingScale, { dashed: false, strokeStyle: '#000000', lineWidth: 0.45 });
        if (primitives2D && primitives2D.drawBagueNeckLinks) primitives2D.drawBagueNeckLinks(ctx2d, points, bagueProfile, drawingScale);
        // Montrer explicitement toutes les sections de bague (traits horizontaux)
        if (primitives2D && primitives2D.drawSectionLevelLines) primitives2D.drawSectionLevelLines(ctx2d, bagueProfile, drawingScale, { dashed: false, strokeStyle: '#000000', lineWidth: 0.3 });
        // 3. Cotations verticales par section (corps principal uniquement).
        // Chaque cote represente la hauteur entre 2 sections consecutives.
        const mainSections = (plans2DData && plans2DData.getMainSections2D) ? plans2DData.getMainSections2D() : [];
        const sectionDimBaseX = -max_R - 18;
        const sectionDimStep = 9;
        const bottleBase = mainSections.length ? mainSections[0] : null;
        if (bottleBase) {
            for (let i = 1; i < mainSections.length; i++) {
                const y1 = bottleBase.y;
                const y2 = mainSections[i].y;
                const sectionHeight = y2 - y1;
                if (!Number.isFinite(sectionHeight) || sectionHeight <= 0) continue;
                const dimPos = sectionDimBaseX - (i - 1) * sectionDimStep;
                const xRefBase = -(plans2DData && plans2DData.getProfileHalfWidthAtY ? plans2DData.getProfileHalfWidthAtY(points, y1) : 0);
                const xRefTop = -(plans2DData && plans2DData.getProfileHalfWidthAtY ? plans2DData.getProfileHalfWidthAtY(points, y2) : 0);
                if (primitives2D && primitives2D.drawCotation) primitives2D.drawCotation(ctx2d, xRefBase, y1, xRefTop, y2, dimPos, fText(sectionHeight), true, drawingScale);
            }
        }

        // 4. Cotations de diametre a droite pour chaque section principale.
        for (let i = 0; i < mainSections.length; i++) {
            const y = mainSections[i].y;
            const radius = (plans2DData && plans2DData.getProfileHalfWidthAtY) ? plans2DData.getProfileHalfWidthAtY(points, y) : 0;
            if (!Number.isFinite(radius) || radius <= 0) continue;
            const diameter = radius * 2;
            if (primitives2D && primitives2D.drawDiameterCotationRight) primitives2D.drawDiameterCotationRight(ctx2d, -radius, radius, y, "Ø " + fText(diameter), drawingScale);
        }

        // 5. Cotations de raccordements (rayon/courbe/spline/autre) a droite.
        for (let i = 0; i < mainSections.length - 1; i++) {
            const from = i + 1;
            const to = i + 2;
            const rattId = 'r' + from + to;
            const label = getRattachementLabel(rattId);
            if (!label) continue;
            const yMid = (mainSections[i].y + mainSections[i + 1].y) * 0.5;
            const radius = (plans2DData && plans2DData.getProfileHalfWidthAtY) ? plans2DData.getProfileHalfWidthAtY(points, yMid) : 0;
            if (!Number.isFinite(radius) || radius <= 0) continue;
            if (primitives2D && primitives2D.drawRattachementCalloutRight) primitives2D.drawRattachementCalloutRight(ctx2d, radius, yMid, label, drawingScale, 34);
        }

        ctx2d.restore(); 

        // TITRE DE LA VUE DE FACE (Au-dessus)
        if (showBottomView) {
            ctx2d.fillStyle = '#000000';
            ctx2d.font = '4px Arial'; 
            ctx2d.textAlign = 'center';
            ctx2d.textBaseline = 'bottom';
            const titleY = -mainViewOffsetY - 20;
            ctx2d.fillText("VUE DE FACE", mainViewOffsetX, titleY);
        }

        // ====================================================
        // 4. VUE DU DESSOUS (GÉNÉRÉE MATHÉMATIQUEMENT)
        // ====================================================
        if (showBottomView && cartLayout) {
            ctx2d.save();

            const bottomViewX = cartLayout.x + cartLayout.width / 2;
            const maxRadiusScaled = max_R * drawingScale;
            const bottomViewY = cartLayout.y - maxRadiusScaled - 25; 
            
            ctx2d.translate(bottomViewX, bottomViewY);

            // Axes de symétrie (Croix)
            ctx2d.beginPath();
            ctx2d.setLineDash([10, 2, 2, 2]);
            ctx2d.strokeStyle = '#888888';
            ctx2d.lineWidth = 0.3; 
            const crossLen = maxRadiusScaled + 10; 
            ctx2d.moveTo(-crossLen, 0); ctx2d.lineTo(crossLen, 0);
            ctx2d.moveTo(0, -crossLen); ctx2d.lineTo(0, crossLen);
            ctx2d.stroke();
            ctx2d.setLineDash([]);

            // Tracés des diamètres
            ctx2d.strokeStyle = '#000000';
            ctx2d.lineWidth = 0.6; 
            
            ctx2d.beginPath();
            ctx2d.arc(0, 0, R_base * drawingScale, 0, Math.PI * 2);
            ctx2d.stroke();

            if (max_R - R_base > 1) {
                ctx2d.beginPath();
                ctx2d.arc(0, 0, max_R * drawingScale, 0, Math.PI * 2);
                ctx2d.stroke();
            }

            // Titre de la vue
            ctx2d.fillStyle = '#000000';
            ctx2d.font = '4px Arial';
            ctx2d.textAlign = 'center';
            ctx2d.textBaseline = 'bottom';
            ctx2d.fillText("VUE DU DESSOUS", 0, -crossLen - 8);

            ctx2d.restore();
        }
    }
    ctx2d.restore(); 
}

function setup2DControlsListeners() {
    if (typeof Plans2DEvents !== 'undefined' && Plans2DEvents.bindControlRedraw) {
        Plans2DEvents.bindControlRedraw(draw2D);
        return;
    }
    const ids = [
        'paper-format-select', 'drawing-scale-select', 'cb-vue-dessous',
        'cartouche-title', 'cartouche-plan-number', 'cartouche-date',
        'cartouche-drafter', 'cartouche-checker', 'cartouche-index'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const ev = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
        el.addEventListener(ev, () => { if (typeof draw2D === 'function') draw2D(); });
    });
}

window.addEventListener('load', () => {
    if (typeof Canvas2DInteractions !== 'undefined' && Canvas2DInteractions.bind) {
        Canvas2DInteractions.bind({
            canvas: canvas2d,
            container: view2DContainer,
            getCamera: function () { return cam2D; },
            setCamera: function (next) {
                cam2D = next;
                if (typeof Plans2DState !== 'undefined' && Plans2DState.setCamera) Plans2DState.setCamera(cam2D);
            },
            draw: draw2D,
            resize: resizeCanvas2D
        });
    }
    setTimeout(resizeCanvas2D, 100);
    setup2DControlsListeners();
});
