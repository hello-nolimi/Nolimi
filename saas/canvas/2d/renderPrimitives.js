var Canvas2DRenderPrimitives = (function () {
    function getStrokeStyle(drawingScale) {
        var mv = (typeof Plans2DRules !== 'undefined' && Plans2DRules.DRAW_STYLE && Plans2DRules.DRAW_STYLE.mainView)
            ? Plans2DRules.DRAW_STYLE.mainView
            : {};
        var dash = mv.hiddenDashMm || [6, 3];
        return {
            visibleWidth: (mv.strokeVisibleMm != null ? mv.strokeVisibleMm : 0.6) / drawingScale,
            hiddenWidth: (mv.strokeHiddenMm != null ? mv.strokeHiddenMm : 0.25) / drawingScale,
            hiddenDash: [dash[0] / drawingScale, dash[1] / drawingScale]
        };
    }

    function applyModelStroke(ctx, drawingScale, visible) {
        var s = getStrokeStyle(drawingScale);
        ctx.lineWidth = visible ? s.visibleWidth : s.hiddenWidth;
        ctx.setLineDash(visible ? [] : s.hiddenDash);
        ctx.lineCap = 'round';
    }

    function applyPixelStroke(ctx, visible) {
        ctx.lineWidth = visible ? 0.6 : 0.25;
        ctx.setLineDash(visible ? [] : [4, 2.5]);
        ctx.lineCap = 'round';
    }

    function drawRattachementCalloutRight(ctx, xAnchor, yAnchor, text, drawingScale, offsetX) {
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#000000';
        ctx.lineWidth = 0.15 / drawingScale;
        var aSize = 2.0 / drawingScale;
        var arrowGapX = 2.5 / drawingScale;
        var labelX = xAnchor + offsetX / drawingScale;
        var labelY = yAnchor + (offsetX / drawingScale) * 0.35;
        var textGapX = 1.5 / drawingScale;
        var leadEndX = labelX - textGapX;
        var dx = leadEndX - xAnchor;
        var dy = labelY - yAnchor;
        var ex = xAnchor + arrowGapX;
        var ey = Math.abs(dx) > 1e-6 ? yAnchor + arrowGapX * dy / dx : yAnchor;

        function drawArrow(ax, ay, angle) {
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax - aSize * Math.cos(angle - Math.PI / 10), ay - aSize * Math.sin(angle - Math.PI / 10));
            ctx.lineTo(ax - aSize * Math.cos(angle + Math.PI / 10), ay - aSize * Math.sin(angle + Math.PI / 10));
            ctx.fill();
        }

        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(xAnchor, yAnchor);
        ctx.stroke();
        drawArrow(xAnchor, yAnchor, Math.atan2(yAnchor - ey, xAnchor - ex));

        ctx.beginPath();
        ctx.moveTo(xAnchor, yAnchor);
        ctx.lineTo(leadEndX, labelY);
        ctx.stroke();
        ctx.save();
        ctx.translate(labelX, labelY);
        ctx.scale(1, -1);
        ctx.font = (3 / drawingScale) + 'px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        var txt = String(text);
        var w = ctx.measureText(txt).width;
        var h = 4 / drawingScale;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-0.5 / drawingScale, -h / 2, w + 1 / drawingScale, h);
        ctx.fillStyle = '#000000';
        ctx.fillText(txt, 0, 0);
        ctx.restore();
        ctx.restore();
    }

    function drawSymmetricProfile(ctx, profilePoints, drawingScale, options) {
        if (!profilePoints || profilePoints.length < 2) return;
        ctx.save();
        ctx.strokeStyle = options && options.strokeStyle ? options.strokeStyle : '#000000';
        ctx.lineJoin = 'round';
        var hidden = options && (options.hiddenLine || options.dashed);
        applyModelStroke(ctx, drawingScale, !hidden);
        ctx.beginPath();
        ctx.moveTo(profilePoints[0].x, profilePoints[0].y);
        for (var i = 1; i < profilePoints.length; i++) ctx.lineTo(profilePoints[i].x, profilePoints[i].y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-profilePoints[0].x, profilePoints[0].y);
        for (var j = 1; j < profilePoints.length; j++) ctx.lineTo(-profilePoints[j].x, profilePoints[j].y);
        ctx.stroke();
        ctx.restore();
    }

    function drawSectionLevelLines(ctx, profilePoints, drawingScale, options) {
        if (!profilePoints || profilePoints.length === 0) return;
        ctx.save();
        ctx.strokeStyle = options && options.strokeStyle ? options.strokeStyle : '#000000';
        var hidden = options && (options.hiddenLine || options.dashed);
        applyModelStroke(ctx, drawingScale, !hidden);
        profilePoints.forEach(function (p) {
            ctx.beginPath();
            ctx.moveTo(-p.x, p.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        });
        ctx.restore();
    }

    function drawBagueNeckLinks(ctx, mainProfilePoints, bagueProfilePoints, drawingScale) {
        if (!mainProfilePoints || mainProfilePoints.length === 0) return;
        if (!bagueProfilePoints || bagueProfilePoints.length === 0) return;
        var neck = mainProfilePoints[mainProfilePoints.length - 1];
        var bagueBase = bagueProfilePoints[0];
        if (!neck || !bagueBase) return;
        ctx.save();
        ctx.strokeStyle = '#000000';
        applyModelStroke(ctx, drawingScale, true);
        ctx.beginPath();
        ctx.moveTo(neck.x, neck.y);
        ctx.lineTo(bagueBase.x, bagueBase.y);
        ctx.moveTo(-neck.x, neck.y);
        ctx.lineTo(-bagueBase.x, bagueBase.y);
        ctx.stroke();
        ctx.restore();
    }

    function drawCotation(ctx, x1, y1, x2, y2, dimPos, text, isVertical, drawingScale) {
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#000000';
        ctx.lineWidth = 0.15 / drawingScale;
        var dimX1; var dimY1; var dimX2; var dimY2; var sign;
        ctx.beginPath();
        if (isVertical) {
            sign = dimPos > Math.max(x1, x2) ? 1 : -1;
            dimX1 = dimPos; dimY1 = y1; dimX2 = dimPos; dimY2 = y2;
            ctx.moveTo(x1, y1); ctx.lineTo(dimPos + sign * 2 / drawingScale, y1);
            ctx.moveTo(x2, y2); ctx.lineTo(dimPos + sign * 2 / drawingScale, y2);
        } else {
            sign = dimPos > Math.max(y1, y2) ? 1 : -1;
            dimX1 = x1; dimY1 = dimPos; dimX2 = x2; dimY2 = dimPos;
            if (Math.abs(dimPos - y1) > 0.1) {
                ctx.moveTo(x1, y1 + sign * 1 / drawingScale); ctx.lineTo(x1, dimPos + sign * 2 / drawingScale);
                ctx.moveTo(x2, y2 + sign * 1 / drawingScale); ctx.lineTo(x2, dimPos + sign * 2 / drawingScale);
            }
        }
        var aSize = 2.0 / drawingScale;
        var dxDim = dimX2 - dimX1;
        var dyDim = dimY2 - dimY1;
        var lenDim = Math.sqrt(dxDim * dxDim + dyDim * dyDim);
        var uxDim = lenDim > 1e-9 ? (dxDim / lenDim) : 0;
        var uyDim = lenDim > 1e-9 ? (dyDim / lenDim) : 0;
        ctx.moveTo(dimX1 + uxDim * aSize, dimY1 + uyDim * aSize);
        ctx.lineTo(dimX2 - uxDim * aSize, dimY2 - uyDim * aSize);
        ctx.stroke();
        function drawArrow(ax, ay, angle) {
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax - aSize * Math.cos(angle - Math.PI / 10), ay - aSize * Math.sin(angle - Math.PI / 10));
            ctx.lineTo(ax - aSize * Math.cos(angle + Math.PI / 10), ay - aSize * Math.sin(angle + Math.PI / 10));
            ctx.fill();
        }
        var angle = Math.atan2(dimY2 - dimY1, dimX2 - dimX1);
        drawArrow(dimX2, dimY2, angle);
        drawArrow(dimX1, dimY1, angle + Math.PI);
        ctx.save();
        ctx.translate((dimX1 + dimX2) / 2, (dimY1 + dimY2) / 2);
        ctx.scale(1, -1);
        ctx.font = (3 / drawingScale) + 'px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (isVertical) ctx.rotate(-Math.PI / 2);
        var textWidth = ctx.measureText(text).width;
        var textHeight = 4 / drawingScale;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-textWidth / 2 - 0.5 / drawingScale, -textHeight / 2, textWidth + 1 / drawingScale, textHeight);
        ctx.fillStyle = '#000000';
        ctx.fillText(text, 0, 0);
        ctx.restore();
        ctx.restore();
    }

    function drawDiameterCotationDown(ctx, xLeft, xRight, y, text, drawingScale, gapMm) {
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#000000';
        ctx.lineWidth = 0.15 / drawingScale;
        var aSize = 2.0 / drawingScale;
        var arrowGapY = 2.5 / drawingScale;
        var gap = ((gapMm != null && isFinite(gapMm)) ? gapMm : 14) / drawingScale;
        var yDim = y - gap;
        var labelGap = 2 / drawingScale;

        function drawArrow(ax, ay, angle) {
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax - aSize * Math.cos(angle - Math.PI / 10), ay - aSize * Math.sin(angle - Math.PI / 10));
            ctx.lineTo(ax - aSize * Math.cos(angle + Math.PI / 10), ay - aSize * Math.sin(angle + Math.PI / 10));
            ctx.fill();
        }

        ctx.beginPath();
        ctx.moveTo(xLeft, y - arrowGapY);
        ctx.lineTo(xLeft, yDim);
        ctx.moveTo(xRight, y - arrowGapY);
        ctx.lineTo(xRight, yDim);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(xLeft + aSize, yDim);
        ctx.lineTo(xRight - aSize, yDim);
        ctx.stroke();
        drawArrow(xLeft, yDim, Math.PI);
        drawArrow(xRight, yDim, 0);

        var labelX = (xLeft + xRight) / 2;
        var labelY = yDim + labelGap;
        ctx.save();
        ctx.translate(labelX, labelY);
        ctx.scale(1, -1);
        ctx.font = (3 / drawingScale) + 'px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var txt = String(text);
        var textWidth = ctx.measureText(txt).width;
        var textHeight = 4 / drawingScale;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-textWidth / 2 - 0.5 / drawingScale, -textHeight / 2, textWidth + 1 / drawingScale, textHeight);
        ctx.fillStyle = '#000000';
        ctx.fillText(txt, 0, 0);
        ctx.restore();
        ctx.restore();
    }

    function drawDiameterCotationRight(ctx, xLeft, xRight, y, text, drawingScale) {
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#000000';
        ctx.lineWidth = 0.15 / drawingScale;
        var aSize = 2.0 / drawingScale;
        var arrowGapX = 2.5 / drawingScale;
        var offsetX = 10 / drawingScale;
        var tick = 3 / drawingScale;
        var labelX = xRight + offsetX;
        var labelY = y;

        function drawArrow(ax, ay, angle) {
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax - aSize * Math.cos(angle - Math.PI / 10), ay - aSize * Math.sin(angle - Math.PI / 10));
            ctx.lineTo(ax - aSize * Math.cos(angle + Math.PI / 10), ay - aSize * Math.sin(angle + Math.PI / 10));
            ctx.fill();
        }

        ctx.beginPath();
        ctx.moveTo(xLeft - arrowGapX, y);
        ctx.lineTo(xLeft, y);
        ctx.moveTo(xRight + arrowGapX, y);
        ctx.lineTo(xRight, y);
        ctx.stroke();
        drawArrow(xLeft, y, 0);
        drawArrow(xRight, y, Math.PI);

        ctx.beginPath();
        ctx.moveTo(xRight, y);
        ctx.lineTo(labelX - tick, y);
        ctx.stroke();
        ctx.save();
        ctx.translate(labelX, labelY);
        ctx.scale(1, -1);
        ctx.font = (3 / drawingScale) + 'px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        var txt = String(text);
        var textWidth = ctx.measureText(txt).width;
        var textHeight = 4 / drawingScale;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-0.5 / drawingScale, -textHeight / 2, textWidth + 1 / drawingScale, textHeight);
        ctx.fillStyle = '#000000';
        ctx.fillText(txt, 0, 0);
        ctx.restore();
        ctx.restore();
    }

    return {
        applyModelStroke: applyModelStroke,
        applyPixelStroke: applyPixelStroke,
        drawRattachementCalloutRight: drawRattachementCalloutRight,
        drawSymmetricProfile: drawSymmetricProfile,
        drawSectionLevelLines: drawSectionLevelLines,
        drawBagueNeckLinks: drawBagueNeckLinks,
        drawCotation: drawCotation,
        drawDiameterCotationRight: drawDiameterCotationRight,
        drawDiameterCotationDown: drawDiameterCotationDown
    };
})();
