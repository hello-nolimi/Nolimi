// Calculs géométriques des liaisons du profil 2D.
var RattachementMath = (function () {
    var K = (typeof GeomKernel !== 'undefined') ? GeomKernel : null;
    var SPLINE_STEPS = (typeof RattachementRules !== 'undefined' && RattachementRules.SPLINE_STEPS) || 48;
    var MIN_SAFE_X = (typeof RattachementRules !== 'undefined' && RattachementRules.MIN_SAFE_X) || 1;
    var DEFAULT_EDGE_TYPE = (typeof RattachementRules !== 'undefined' && RattachementRules.DEFAULT_EDGE_TYPE) || 'ligne';
    var DEFAULT_RHO = (typeof RattachementRules !== 'undefined' && RattachementRules.DEFAULT_RHO) || 0;

    function dist2d(A, B) {
        var dx = B.x - A.x;
        var dy = B.y - A.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    var RULES = (typeof RattachementRules !== 'undefined') ? RattachementRules : {};
    var RAYON_TOL_MM = RULES.QUARTER_ARC_TOLERANCE_MM || 0.5;
    var RAYON_MIN_ANGLE_DEG = RULES.RAYON_MIN_CORNER_ANGLE_DEG || 25;
    var RAYON_MAX_ANGLE_DEG = RULES.RAYON_MAX_CORNER_ANGLE_DEG || 155;

    /** T ∈ [A,B] (sur le segment fini, pas sur le prolongement de la droite). */
    function pointOnSegment(A, B, T, tol) {
        tol = tol != null ? tol : 1e-4;
        var abx = B.x - A.x;
        var aby = B.y - A.y;
        var ab2 = abx * abx + aby * aby;
        if (ab2 < 1e-12) return dist2d(A, T) <= tol;
        var t = ((T.x - A.x) * abx + (T.y - A.y) * aby) / ab2;
        if (t < -tol || t > 1 + tol) return false;
        var qx = A.x + t * abx;
        var qy = A.y + t * aby;
        return dist2d({ x: qx, y: qy }, T) <= tol;
    }

    function distPointToLine(P, A, B) {
        var dx = B.x - A.x;
        var dy = B.y - A.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1e-9) return dist2d(P, A);
        return Math.abs(dx * (A.y - P.y) - (A.x - P.x) * dy) / len;
    }

    /** Les deux segments (droites) admettent-ils un centre à égale distance ? (non parallèles) */
    function segmentsAllowEqualDistanceCenter(P0, corner, P1) {
        var leg1 = dist2d(P0, corner);
        var leg2 = dist2d(corner, P1);
        if (leg1 < 1e-6 || leg2 < 1e-6) return false;
        var ux = (P0.x - corner.x) / leg1;
        var uy = (P0.y - corner.y) / leg1;
        var vx = (P1.x - corner.x) / leg2;
        var vy = (P1.y - corner.y) / leg2;
        var cross = Math.abs(ux * vy - uy * vx);
        return cross > 1e-5;
    }

    /** dist(centre, droite₁) = dist(centre, droite₂) = R (droites supports, pas seulement segments). */
    function centerEquidistantFromLines(fillet, P0, corner, P1, tol) {
        if (!fillet || !fillet.center) return false;
        tol = tol != null ? tol : RAYON_TOL_MM;
        var C = fillet.center;
        var R = fillet.R;
        if (!(R > 1e-6)) return false;
        var d1 = distPointToLine(C, P0, corner);
        var d2 = distPointToLine(C, corner, P1);
        return Math.abs(d1 - d2) <= tol && Math.abs(d1 - R) <= tol && Math.abs(d2 - R) <= tol;
    }

    function isValidRayonFillet(fillet, P0, corner, P1) {
        if (!fillet || !fillet.center || !fillet.T1 || !fillet.T2) return false;
        if (!(fillet.R > 1e-6)) return false;
        if (!centerEquidistantFromLines(fillet, P0, corner, P1)) return false;
        if (!pointOnSegment(P0, corner, fillet.T1) || !pointOnSegment(corner, P1, fillet.T2)) return false;
        if (fillet.center.x < MIN_SAFE_X - 1e-6) return false;
        if (!hasArcSweep(fillet)) return false;
        return true;
    }

    function cornerInteriorAngleRad(P0, corner, P1) {
        var ax = P0.x - corner.x;
        var ay = P0.y - corner.y;
        var bx = P1.x - corner.x;
        var by = P1.y - corner.y;
        var la = Math.sqrt(ax * ax + ay * ay);
        var lb = Math.sqrt(bx * bx + by * by);
        if (la < 1e-6 || lb < 1e-6) return null;
        var c = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)));
        return Math.acos(c);
    }

    function cornerAngleIsAllowed(thetaRad) {
        if (thetaRad == null) return false;
        var deg = thetaRad * 180 / Math.PI;
        return deg >= RAYON_MIN_ANGLE_DEG - 1e-6 && deg <= RAYON_MAX_ANGLE_DEG + 1e-6;
    }

    function filletFromKernel(raw) {
        if (!raw || !raw.center) return null;
        return {
            center: { x: raw.center.x, y: raw.center.y },
            T1: { x: raw.T1.x, y: raw.T1.y },
            T2: { x: raw.T2.x, y: raw.T2.y },
            R: raw.R,
            startAngle: raw.startAngle,
            endAngle: raw.endAngle
        };
    }

    function radiusForEqualLegs(legLen, thetaRad) {
        var tanHalf = Math.tan(thetaRad / 2);
        if (tanHalf < 1e-6) return 0;
        return (legLen / tanHalf) * 0.99;
    }

    function buildFilletFromKernel(P0, corner, P1, R) {
        if (!K || !K.computeFilletTangentPoints || !K.vec2 || R <= 0) return null;
        var raw = K.computeFilletTangentPoints(
            K.vec2(P0.x, P0.y),
            K.vec2(corner.x, corner.y),
            K.vec2(P1.x, P1.y),
            R
        );
        return filletFromKernel(raw);
    }

    /** Congé tangent aux deux branches S0–coin et coin–S1 (angle variable, pas seulement 90°). */
    function buildFilletAtCorner(P0, corner, P1, legLen) {
        if (!K || legLen < 1e-6) return null;
        var theta = cornerInteriorAngleRad(P0, corner, P1);
        if (!cornerAngleIsAllowed(theta)) return null;

        var R = radiusForEqualLegs(legLen, theta);
        if (R < 1e-6) return null;

        var fillet = buildFilletFromKernel(P0, corner, P1, R);
        if (fillet && isValidRayonFillet(fillet, P0, corner, P1)) return fillet;

        fillet = buildFilletFromKernel(P1, corner, P0, R);
        if (fillet && isValidRayonFillet(fillet, P0, corner, P1)) return fillet;

        return null;
    }

    /** Les deux perpendiculaires (section → intersection) ont la même longueur. */
    function perpendicularLegsAreEqual(layout) {
        if (!layout) return false;
        return Math.abs(layout.lenFromP0 - layout.lenFromP1) <= RAYON_TOL_MM;
    }

    function normalize2d(v) {
        var L = Math.sqrt(v.x * v.x + v.y * v.y);
        if (L < 1e-9) return null;
        return { x: v.x / L, y: v.y / L };
    }

    function perpLeftVec(v) {
        return { x: -v.y, y: v.x };
    }

    function orientPerpToward(perp, from, toward) {
        var tx = toward.x - from.x;
        var ty = toward.y - from.y;
        if (perp.x * tx + perp.y * ty < 0) {
            return { x: -perp.x, y: -perp.y };
        }
        return perp;
    }

    function rayRayIntersection(P, d, Q, e) {
        var det = d.x * e.y - d.y * e.x;
        if (Math.abs(det) < 1e-9) return null;
        var dx = Q.x - P.x;
        var dy = Q.y - P.y;
        var t = (dx * e.y - dy * e.x) / det;
        return { x: P.x + t * d.x, y: P.y + t * d.y };
    }

    /** Coin du L entre deux sections (orientation selon le profil voisin). */
    function pickTransitionCorner(P0, P1, prevPoint, nextPoint) {
        var dx = P1.x - P0.x;
        var dy = P1.y - P0.y;
        if (Math.abs(dx) < 1e-6 || Math.abs(dy) < 1e-6) return null;

        var cornerHR = { x: P1.x, y: P0.y };
        var cornerRH = { x: P0.x, y: P1.y };

        if (prevPoint) {
            var vinX = P0.x - prevPoint.x;
            var vinY = P0.y - prevPoint.y;
            if (Math.abs(vinX) >= Math.abs(vinY)) return cornerHR;
            return cornerRH;
        }
        if (nextPoint) {
            var voutX = nextPoint.x - P1.x;
            var voutY = nextPoint.y - P1.y;
            if (Math.abs(voutX) >= Math.abs(voutY)) return cornerRH;
            return cornerHR;
        }
        if (dy >= 0 && dx >= 0) return cornerHR;
        if (dy >= 0 && dx < 0) return cornerRH;
        if (dy < 0 && dx >= 0) return cornerHR;
        return cornerRH;
    }

    /**
     * Perpendiculaires imaginaires depuis chaque section, ⟂ à la ligne/courbe du profil
     * à cette section (prev→S0 et S1→next, ou jambes du rattachement en secours).
     * Même longueur jusqu'à l'intersection → rayon admissible.
     * Le congé suit le coin du L (S0–coin–S1).
     */
    function getProfileTangentLayout(P0, P1, prevPoint, nextPoint) {
        var cornerM = pickTransitionCorner(P0, P1, prevPoint, nextPoint);
        if (!cornerM) return null;

        var leg1Len = dist2d(P0, cornerM);
        var leg2Len = dist2d(cornerM, P1);
        if (leg1Len < 1e-6 || leg2Len < 1e-6) return null;

        var d1raw = prevPoint
            ? { x: P0.x - prevPoint.x, y: P0.y - prevPoint.y }
            : { x: cornerM.x - P0.x, y: cornerM.y - P0.y };
        var d2raw = nextPoint
            ? { x: nextPoint.x - P1.x, y: nextPoint.y - P1.y }
            : { x: P1.x - cornerM.x, y: P1.y - cornerM.y };

        var d1 = normalize2d(d1raw);
        var d2 = normalize2d(d2raw);
        if (!d1 || !d2) return null;
        if (Math.abs(d1.x * d2.x + d1.y * d2.y) > 0.9999) return null;

        var profileMeet = rayRayIntersection(P0, d1, P1, d2);
        var perpTarget0 = profileMeet || cornerM;
        var perpTarget1 = profileMeet || cornerM;

        var perp0 = orientPerpToward(perpLeftVec(d1), P0, perpTarget0);
        var perp1 = orientPerpToward(perpLeftVec(d2), P1, perpTarget1);
        var perpMeet = rayRayIntersection(P0, perp0, P1, perp1);
        if (!perpMeet) return null;

        return {
            corner: cornerM,
            lenFromP0: dist2d(P0, perpMeet),
            lenFromP1: dist2d(P1, perpMeet)
        };
    }

    function resolveRayonLayout(P0, P1, prevPoint, nextPoint) {
        return getProfileTangentLayout(P0, P1, prevPoint, nextPoint);
    }

    function hasArcSweep(fillet) {
        var da = fillet.endAngle - fillet.startAngle;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        return Math.abs(da) > 1e-4;
    }

    function tryRayonAtSections(P0, P1, prevPoint, nextPoint) {
        var layout = resolveRayonLayout(P0, P1, prevPoint, nextPoint);
        if (!layout || !perpendicularLegsAreEqual(layout)) return null;

        var legLen = layout.lenFromP0;
        if (legLen < 1e-6) return null;

        var fillet = buildFilletAtCorner(P0, layout.corner, P1, legLen);
        if (!fillet) return null;

        return { fillet: fillet, corner: layout.corner, legLen: legLen };
    }

    function appendRayonEntities(entities, P0, P1, fillet) {
        var T1 = fillet.T1;
        var T2 = fillet.T2;
        if (dist2d(P0, T1) > 1e-5) {
            entities.push(K.LineSegment(P0.x, P0.y, T1.x, T1.y));
        }
        entities.push(K.ArcSegment(
            fillet.center.x, fillet.center.y, fillet.R,
            fillet.startAngle, fillet.endAngle
        ));
        if (dist2d(T2, P1) > 1e-5) {
            entities.push(K.LineSegment(T2.x, T2.y, P1.x, P1.y));
        }
    }

    function computeRayonValidity(P0, P1, prevPoint, nextPoint) {
        var layout = resolveRayonLayout(P0, P1, prevPoint || null, nextPoint || null);
        if (!layout || !perpendicularLegsAreEqual(layout)) {
            return { valid: false, R: null };
        }
        var pick = tryRayonAtSections(P0, P1, prevPoint || null, nextPoint || null, null);
        if (!pick) return { valid: false, R: null };
        return { valid: true, R: pick.fillet.R };
    }

    function buildProfileCurves(profilePoints, data) {
        if (!K) return [];
        var points = profilePoints || [];
        if (points.length < 2) return [];
        data = data || {};
        var edgeTypes = data.edgeTypes || [];
        var rhos = data.rhos || [];

        var entities = [];
        var lastPoint = { x: points[0].x, y: points[0].y };

        for (var i = 0; i < points.length - 1; i++) {
            var P0 = lastPoint;
            var P1 = points[i + 1];
            var type = edgeTypes[i] || DEFAULT_EDGE_TYPE;
            var R = rhos[i] || DEFAULT_RHO;

            if (type === 'rayon') {
                var sec0 = { x: points[i].x, y: points[i].y };
                var sec1 = { x: points[i + 1].x, y: points[i + 1].y };
                var prevSec = i > 0 ? { x: points[i - 1].x, y: points[i - 1].y } : null;
                var nextSec = i + 2 < points.length ? { x: points[i + 2].x, y: points[i + 2].y } : null;
                if (dist2d(lastPoint, sec0) > 1e-5) {
                    entities.push(K.LineSegment(lastPoint.x, lastPoint.y, sec0.x, sec0.y));
                }
                var rayonPick = tryRayonAtSections(sec0, sec1, prevSec, nextSec);
                var rayonOk = !!rayonPick;
                if (rayonOk) {
                    appendRayonEntities(entities, sec0, sec1, rayonPick.fillet);
                } else {
                    entities.push(K.LineSegment(sec0.x, sec0.y, sec1.x, sec1.y));
                }
                lastPoint = { x: sec1.x, y: sec1.y };
            } else if (type === 'courbeS' && R > 0) {
                var prevPoint = i > 0 ? { x: points[i - 1].x, y: points[i - 1].y } : null;
                var nextPoint = i + 2 < points.length ? { x: points[i + 2].x, y: points[i + 2].y } : null;
                var Dx = P1.x - P0.x;
                var Dy = P1.y - P0.y;
                var dS = Math.sqrt(Dx * Dx + Dy * Dy);
                if (dS < 1e-6) {
                    entities.push(K.LineSegment(P0.x, P0.y, P1.x, P1.y));
                    lastPoint = { x: P1.x, y: P1.y };
                } else {
                    var T0x = Dx / dS;
                    var T0y = Dy / dS;
                    if (prevPoint) {
                        var pdx = P0.x - prevPoint.x;
                        var pdy = P0.y - prevPoint.y;
                        var pd = Math.sqrt(pdx * pdx + pdy * pdy);
                        if (pd > 1e-6) { T0x = pdx / pd; T0y = pdy / pd; }
                    }
                    var T1x = Dx / dS;
                    var T1y = Dy / dS;
                    if (nextPoint) {
                        var ndx = nextPoint.x - P1.x;
                        var ndy = nextPoint.y - P1.y;
                        var nd = Math.sqrt(ndx * ndx + ndy * ndy);
                        if (nd > 1e-6) { T1x = ndx / nd; T1y = ndy / nd; }
                    }
                    var n0x = -T0y;
                    var n0y = T0x;
                    var DdotN0 = Dx * n0x + Dy * n0y;
                    if (DdotN0 <= 0) { n0x = -n0x; n0y = -n0y; DdotN0 = -DdotN0; }
                    var n1x = -T1y;
                    var n1y = T1x;
                    var DdotN1 = Dx * n1x + Dy * n1y;
                    if (DdotN1 >= 0) { n1x = -n1x; n1y = -n1y; DdotN1 = -DdotN1; }
                    var Vx = n1x - n0x;
                    var Vy = n1y - n0y;
                    var V2 = Vx * Vx + Vy * Vy;
                    var denom = V2 - 4;
                    var R_eff = null;
                    if (Math.abs(denom) > 1e-9) {
                        var DdotV = Dx * Vx + Dy * Vy;
                        var disc = 4 * DdotV * DdotV + 4 * dS * dS * denom;
                        if (disc >= 0) {
                            var sqrtDisc = Math.sqrt(disc);
                            var R1 = (-2 * DdotV + sqrtDisc) / (2 * denom);
                            var R2 = (-2 * DdotV - sqrtDisc) / (2 * denom);
                            R_eff = R1 > dS * 0.25 && R1 < dS * 0.9 ? R1 : (R2 > dS * 0.25 && R2 < dS * 0.9 ? R2 : null);
                        }
                    }
                    var useFallback = false;
                    if (R_eff == null && Math.abs(DdotN0) > 1e-9) {
                        var R_geom = (dS * dS) / (4 * DdotN0);
                        if (R_geom >= dS * 0.25 && R_geom <= dS * 0.9) {
                            R_eff = R_geom;
                            useFallback = true;
                        }
                    }
                    if (R_eff == null || R_eff < dS * 0.2) {
                        entities.push(K.LineSegment(P0.x, P0.y, P1.x, P1.y));
                        lastPoint = { x: P1.x, y: P1.y };
                    } else {
                        R_eff = Math.max(dS * 0.25, Math.min(dS * 0.85, R_eff));
                        var C1x = P0.x + R_eff * n0x;
                        var C1y = P0.y + R_eff * n0y;
                        var C2x = useFallback ? P1.x - R_eff * n0x : P1.x + R_eff * n1x;
                        var C2y = useFallback ? P1.y - R_eff * n0y : P1.y + R_eff * n1y;
                        var dxC = C2x - C1x;
                        var dyC = C2y - C1y;
                        var dC = Math.sqrt(dxC * dxC + dyC * dyC);
                        if (dC < 1e-6) {
                            entities.push(K.LineSegment(P0.x, P0.y, P1.x, P1.y));
                            lastPoint = { x: P1.x, y: P1.y };
                        } else {
                            var Mx = (C1x + C2x) * 0.5;
                            var My = (C1y + C2y) * 0.5;
                            if (Math.min(Mx, Math.min(P0.x, P1.x)) < MIN_SAFE_X) {
                                entities.push(K.LineSegment(P0.x, P0.y, P1.x, P1.y));
                                lastPoint = { x: P1.x, y: P1.y };
                            } else {
                                var a1s = Math.atan2(P0.y - C1y, P0.x - C1x);
                                var a1e = Math.atan2(My - C1y, Mx - C1x);
                                var da1 = a1e - a1s;
                                if (da1 > Math.PI) da1 -= 2 * Math.PI;
                                if (da1 < -Math.PI) da1 += 2 * Math.PI;
                                var tangent1AtP0x = da1 > 0 ? -Math.sin(a1s) : Math.sin(a1s);
                                var tangent1AtP0y = da1 > 0 ? Math.cos(a1s) : -Math.cos(a1s);
                                var dot1 = tangent1AtP0x * T0x + tangent1AtP0y * T0y;
                                if (dot1 < 0) {
                                    n0x = -n0x; n0y = -n0y;
                                    n1x = -n1x; n1y = -n1y;
                                    C1x = P0.x + R_eff * n0x;
                                    C1y = P0.y + R_eff * n0y;
                                    C2x = useFallback ? P1.x - R_eff * n0x : P1.x + R_eff * n1x;
                                    C2y = useFallback ? P1.y - R_eff * n0y : P1.y + R_eff * n1y;
                                    Mx = (C1x + C2x) * 0.5;
                                    My = (C1y + C2y) * 0.5;
                                    a1s = Math.atan2(P0.y - C1y, P0.x - C1x);
                                    a1e = Math.atan2(My - C1y, Mx - C1x);
                                }
                                var sweep1 = a1e - a1s;
                                if (sweep1 > Math.PI) a1e -= 2 * Math.PI;
                                if (sweep1 < -Math.PI) a1e += 2 * Math.PI;
                                var a2s = Math.atan2(My - C2y, Mx - C2x);
                                var a2e = Math.atan2(P1.y - C2y, P1.x - C2x);
                                var sweep2 = a2e - a2s;
                                if (sweep2 > Math.PI) a2e -= 2 * Math.PI;
                                if (sweep2 < -Math.PI) a2e += 2 * Math.PI;
                                entities.push(K.ArcSegment(C1x, C1y, R_eff, a1s, a1e));
                                entities.push(K.ArcSegment(C2x, C2y, R_eff, a2s, a2e));
                                lastPoint = { x: P1.x, y: P1.y };
                            }
                        }
                    }
                }
            } else if (type === 'spline') {
                var dxSp = P1.x - P0.x;
                var dySp = P1.y - P0.y;
                var dSp = Math.sqrt(dxSp * dxSp + dySp * dySp);
                if (dSp < 1e-6 || Math.abs(R) < 1e-3) {
                    entities.push(K.LineSegment(P0.x, P0.y, P1.x, P1.y));
                    lastPoint = { x: P1.x, y: P1.y };
                } else {
                    var nxSp = -dySp / dSp;
                    var nySp = dxSp / dSp;
                    if (R < 0) { nxSp = -nxSp; nySp = -nySp; }
                    var amp = Math.abs(R) * 0.3;
                    var midSpX = (P0.x + P1.x) * 0.5 + nxSp * amp;
                    var midSpY = (P0.y + P1.y) * 0.5 + nySp * amp;
                    var prevX = P0.x;
                    var prevY = P0.y;
                    for (var k = 1; k <= SPLINE_STEPS; k++) {
                        var t = k / SPLINE_STEPS;
                        var oneMinusT = 1 - t;
                        var bx = oneMinusT * oneMinusT * P0.x + 2 * oneMinusT * t * midSpX + t * t * P1.x;
                        var by = oneMinusT * oneMinusT * P0.y + 2 * oneMinusT * t * midSpY + t * t * P1.y;
                        entities.push(K.LineSegment(prevX, prevY, bx, by));
                        prevX = bx;
                        prevY = by;
                    }
                    lastPoint = { x: P1.x, y: P1.y };
                }
            } else {
                entities.push(K.LineSegment(P0.x, P0.y, P1.x, P1.y));
                lastPoint = { x: P1.x, y: P1.y };
            }
        }
        return entities;
    }

    return {
        buildProfileCurves: buildProfileCurves,
        computeRayonValidity: computeRayonValidity
    };
})();
