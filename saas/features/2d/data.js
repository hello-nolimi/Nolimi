var Plans2DData = (function () {
    function getNumericValue(id, fallback) {
        if (typeof Plans2DMath !== 'undefined' && Plans2DMath.getNumericValue) return Plans2DMath.getNumericValue(id, fallback);
        var el = document.getElementById(id);
        if (!el) return fallback;
        var v = parseFloat(el.value);
        return Number.isFinite(v) ? v : fallback;
    }

    function getIndexedHeights(prefix) {
        if (typeof Plans2DMath !== 'undefined' && Plans2DMath.getIndexedHeights) return Plans2DMath.getIndexedHeights(prefix);
        var inputs = document.querySelectorAll('input[id^="' + prefix + '"][id$="-h"]');
        var out = [];
        inputs.forEach(function (el) {
            var m = (el.id || '').match(new RegExp('^' + prefix + '(\\d+)-h$'));
            if (!m) return;
            var idx = parseInt(m[1], 10);
            if (Number.isFinite(idx)) out.push(idx);
        });
        out.sort(function (a, b) { return a - b; });
        return out.filter(function (v, i) { return i === 0 || v !== out[i - 1]; });
    }

    function getPiqureProfile2D() {
        var points = [];
        var s1h = getNumericValue('s1-h', 0);
        var spL = getNumericValue('sp-L', 55);
        points.push({ x: Math.max(0, spL / 2), y: s1h });
        var spIdxs = getIndexedHeights('sp');
        spIdxs.forEach(function (k) {
            var h = getNumericValue('sp' + k + '-h', null);
            var L = getNumericValue('sp' + k + '-L', 40);
            if (h == null) return;
            points.push({ x: Math.max(0, L / 2), y: h });
        });
        var rp3h = getNumericValue('rp3-h', null);
        if (rp3h != null) points.push({ x: 0, y: rp3h });
        points.sort(function (a, b) { return a.y - b.y; });
        return points;
    }

    function getBagueProfile2D() {
        var points = [];
        var sbIdxs = getIndexedHeights('sb');
        sbIdxs.forEach(function (k) {
            var h = getNumericValue('sb' + k + '-h', null);
            var L = getNumericValue('sb' + k + '-L', null);
            if (h == null || L == null) return;
            points.push({ x: Math.max(0, L / 2), y: h });
        });
        points.sort(function (a, b) { return a.y - b.y; });
        return points;
    }

    function getMainSections2D() {
        var sections = [];
        var sIdxs = getIndexedHeights('s');
        sIdxs.forEach(function (k) {
            var h = getNumericValue('s' + k + '-h', null);
            var L = getNumericValue('s' + k + '-L', null);
            if (h == null || L == null) return;
            sections.push({ y: h, x: Math.max(0, L / 2) });
        });
        sections.sort(function (a, b) { return a.y - b.y; });
        return sections;
    }

    function getProfileHalfWidthAtY(profilePoints, yTarget) {
        if (!profilePoints || profilePoints.length === 0 || !Number.isFinite(yTarget)) return 0;
        var maxRadius = 0;
        var eps = 1e-6;
        for (var i = 0; i < profilePoints.length; i++) {
            var p = profilePoints[i];
            if (Math.abs(p.y - yTarget) < eps) maxRadius = Math.max(maxRadius, Math.abs(p.x));
        }
        for (var j = 1; j < profilePoints.length; j++) {
            var p0 = profilePoints[j - 1];
            var p1 = profilePoints[j];
            var minY = Math.min(p0.y, p1.y);
            var maxY = Math.max(p0.y, p1.y);
            if (yTarget < minY - eps || yTarget > maxY + eps) continue;
            var dy = p1.y - p0.y;
            if (Math.abs(dy) < eps) continue;
            var t = (yTarget - p0.y) / dy;
            var xAtY = p0.x + (p1.x - p0.x) * t;
            maxRadius = Math.max(maxRadius, Math.abs(xAtY));
        }
        return maxRadius;
    }

    return {
        getPiqureProfile2D: getPiqureProfile2D,
        getBagueProfile2D: getBagueProfile2D,
        getMainSections2D: getMainSections2D,
        getProfileHalfWidthAtY: getProfileHalfWidthAtY
    };
})();
