// Orchestration Gravure + rendu 3D.
(function () {
    if (typeof GravureEvents !== 'undefined' && GravureEvents.init) GravureEvents.init();
})();

var Gravure3D = (function () {
    var engravingGroup = null;

    function disposeGroup(group) {
        if (!group) return;
        group.traverse(function (obj) {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) for (var i = 0; i < obj.material.length; i++) obj.material[i].dispose();
                else obj.material.dispose();
            }
        });
    }

    function getInterpolatedSectionAtY(sections, y) {
        if (!sections || !sections.length) return { a: 1, b: 1 };
        if (sections.length === 1) return { a: Math.max(1, sections[0].a), b: Math.max(1, sections[0].b) };
        if (y <= sections[0].H) return { a: Math.max(1, sections[0].a), b: Math.max(1, sections[0].b) };
        var last = sections[sections.length - 1];
        if (y >= last.H) return { a: Math.max(1, last.a), b: Math.max(1, last.b) };
        for (var i = 0; i < sections.length - 1; i++) {
            var s0 = sections[i], s1 = sections[i + 1];
            if (y < s0.H || y > s1.H) continue;
            var dy = s1.H - s0.H;
            var t = dy > 1e-6 ? ((y - s0.H) / dy) : 0;
            return { a: Math.max(1, s0.a + (s1.a - s0.a) * t), b: Math.max(1, s0.b + (s1.b - s0.b) * t) };
        }
        return { a: Math.max(1, last.a), b: Math.max(1, last.b) };
    }

    function getRadiusAtYTheta(sections, y, theta) {
        var sec = getInterpolatedSectionAtY(sections, y);
        var c = Math.cos(theta), s = Math.sin(theta);
        var denom = Math.sqrt((c * c) / (sec.a * sec.a) + (s * s) / (sec.b * sec.b));
        if (!isFinite(denom) || denom < 1e-9) return Math.max(sec.a, sec.b);
        return 1 / denom;
    }

    function createRadiusSampler(surfaceInput) {
        var sectionsData = Array.isArray(surfaceInput) ? { sections: surfaceInput, edgeTypes: [], rhos: [] } : (surfaceInput && surfaceInput.sections ? surfaceInput : { sections: [] });
        var sections = sectionsData.sections || [];
        var canUseProfile = typeof BottleMaths !== 'undefined' && typeof GeomKernel !== 'undefined' && BottleMaths.buildExteriorProfile && GeomKernel.tessellateProfile && sectionsData.edgeTypes && sectionsData.rhos;
        var cache = {};
        function radiusFromProfile(y, theta) {
            var key = String(Math.round(theta * 10000) / 10000);
            var profile = cache[key];
            if (!profile) {
                var entities = BottleMaths.buildExteriorProfile(theta, sectionsData);
                profile = GeomKernel.tessellateProfile(entities, 48) || [];
                cache[key] = profile;
            }
            if (!profile.length) return getRadiusAtYTheta(sections, y, theta);
            var nearest = profile[0], nearestDy = Math.abs(nearest.y - y);
            for (var i = 0; i < profile.length - 1; i++) {
                var p0 = profile[i], p1 = profile[i + 1];
                var minY = Math.min(p0.y, p1.y), maxY = Math.max(p0.y, p1.y);
                var d0 = Math.abs(p0.y - y);
                if (d0 < nearestDy) { nearestDy = d0; nearest = p0; }
                if (y < minY || y > maxY) continue;
                var dy = p1.y - p0.y;
                if (Math.abs(dy) < 1e-9) return Math.max(0, p0.x);
                var t = (y - p0.y) / dy;
                return Math.max(0, p0.x + (p1.x - p0.x) * t);
            }
            return Math.max(0, nearest.x);
        }
        return function (y, theta) {
            if (!sections.length) return 1;
            return canUseProfile ? radiusFromProfile(y, theta) : getRadiusAtYTheta(sections, y, theta);
        };
    }

    function getSurfacePoint(radiusAt, y, theta) {
        var r = radiusAt(y, theta);
        return { x: r * Math.cos(theta), y: y, z: r * Math.sin(theta), r: r };
    }

    function buildEngravingsGroup(surfaceInput) {
        if (typeof window === 'undefined' || typeof THREE === 'undefined') return null;
        if (typeof window.getEngravingsData !== 'function') return null;
        var engravings = window.getEngravingsData();
        if (!engravings || !engravings.length) return null;
        var images = window.engravingImages || {};
        var group = new THREE.Group();
        var radiusAt = createRadiusSampler(surfaceInput);

        for (var gi = 0; gi < engravings.length; gi++) {
            var g = engravings[gi], img = images[g.id];
            if (!img || !img.width || !img.height) continue;
            var widthMM = Math.max(1, parseFloat(g.width) || 50);
            var depthMM = Math.max(0.05, parseFloat(g.depth) || 1.5);
            var centerY = isFinite(parseFloat(g.y)) ? parseFloat(g.y) : 150;
            var baseAngle = isFinite(parseFloat(g.angle)) ? parseFloat(g.angle) : 0;
            var heightMM = widthMM * (img.height / img.width);
            var baseRadius = Math.max(1, radiusAt(centerY, baseAngle));
            var flip = !!g.flip, invert = !!g.invert;

            var off = document.createElement('canvas');
            var gridW = Math.max(64, Math.min(320, Math.ceil(img.width / 2)));
            var gridH = Math.max(64, Math.min(320, Math.ceil(img.height / 2)));
            var srcScale = Math.min(1, 1024 / Math.max(img.width, img.height));
            var srcW = Math.max(1, Math.round(img.width * srcScale));
            var srcH = Math.max(1, Math.round(img.height * srcScale));
            off.width = srcW; off.height = srcH;
            var ctx = off.getContext('2d'); if (!ctx) continue;
            ctx.drawImage(img, 0, 0, srcW, srcH);
            var pixels = ctx.getImageData(0, 0, srcW, srcH).data;

            function alphaAtUV(u, v) {
                var x = Math.max(0, Math.min(srcW - 1, Math.round(u * (srcW - 1))));
                var y = Math.max(0, Math.min(srcH - 1, Math.round(v * (srcH - 1))));
                return pixels[(y * srcW + x) * 4 + 3] / 255;
            }

            var mask = new Uint8Array(gridW * gridH);
            for (var my = 0; my < gridH; my++) {
                for (var mx = 0; mx < gridW; mx++) {
                    var u0 = mx / gridW, v0 = my / gridH, du = 1 / gridW, dv = 1 / gridH;
                    var c1 = alphaAtUV(u0 + du * 0.25, v0 + dv * 0.25);
                    var c2 = alphaAtUV(u0 + du * 0.75, v0 + dv * 0.25);
                    var c3 = alphaAtUV(u0 + du * 0.25, v0 + dv * 0.75);
                    var c4 = alphaAtUV(u0 + du * 0.75, v0 + dv * 0.75);
                    mask[my * gridW + mx] = (((c1 + c2 + c3 + c4) * 0.25) >= 0.35) ? 1 : 0;
                }
            }

            function isSolid(ix, iy) { return !(ix < 0 || iy < 0 || ix >= gridW || iy >= gridH) && mask[iy * gridW + ix] === 1; }
            var vertices = [], indices = [];
            function pushPoint(uRaw, vRaw, outwardDepth) {
                var uMap = flip ? (1 - uRaw) : uRaw;
                var xCentered = (uMap - 0.5) * widthMM;
                var yMM = centerY + (0.5 - vRaw) * heightMM;
                var theta = baseAngle + (xCentered / baseRadius);
                var surf = getSurfacePoint(radiusAt, yMM, theta);
                var nx = Math.cos(theta), nz = Math.sin(theta);
                vertices.push(surf.x + nx * outwardDepth, yMM, surf.z + nz * outwardDepth);
                return (vertices.length / 3) - 1;
            }
            function addQuad(a, b, c, d) { indices.push(a, b, c); indices.push(a, c, d); }

            for (var y = 0; y < gridH; y++) {
                for (var x = 0; x < gridW; x++) {
                    if (!isSolid(x, y)) continue;
                    var u0 = x / gridW, u1 = (x + 1) / gridW, v0 = y / gridH, v1 = (y + 1) / gridH;
                    var dirDepth = invert ? -depthMM : depthMM;
                    var t00 = pushPoint(u0, v0, dirDepth), t10 = pushPoint(u1, v0, dirDepth), t11 = pushPoint(u1, v1, dirDepth), t01 = pushPoint(u0, v1, dirDepth);
                    addQuad(t00, t10, t11, t01);
                    var b00 = pushPoint(u0, v0, 0), b10 = pushPoint(u1, v0, 0), b11 = pushPoint(u1, v1, 0), b01 = pushPoint(u0, v1, 0);
                    if (!invert) addQuad(b01, b11, b10, b00);
                    if (!isSolid(x - 1, y)) addQuad(b00, t00, t01, b01);
                    if (!isSolid(x + 1, y)) addQuad(b11, t11, t10, b10);
                    if (!isSolid(x, y - 1)) addQuad(b10, t10, t00, b00);
                    if (!isSolid(x, y + 1)) addQuad(b01, t01, t11, b11);
                }
            }

            if (!indices.length) continue;
            var geom = new THREE.BufferGeometry();
            geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geom.setIndex(indices);
            geom.computeVertexNormals();
            var mat = (typeof BottleMaterials !== 'undefined' && BottleMaterials.getGlassMaterial)
                ? BottleMaterials.getGlassMaterial(BottleMaterials.DEFAULT_GLASS_COLOR)
                : new THREE.MeshPhongMaterial({ color: 0x99bbdd, side: THREE.DoubleSide });
            mat.side = THREE.DoubleSide;
            var mesh = new THREE.Mesh(geom, mat);
            mesh.userData.isPiqure = false;
            mesh.userData.isInterior = false;
            group.add(mesh);
        }
        return group.children.length ? group : null;
    }

    function updateScene(scene, surfaceInput) {
        if (!scene || !surfaceInput) return;
        if (engravingGroup) {
            scene.remove(engravingGroup);
            disposeGroup(engravingGroup);
            engravingGroup = null;
        }
        engravingGroup = buildEngravingsGroup(surfaceInput);
        if (engravingGroup) {
            scene.add(engravingGroup);
            if (typeof BottleView3D !== 'undefined' && BottleView3D.applyViewOpacity) {
                BottleView3D.applyViewOpacity(engravingGroup);
            }
        }
    }

    return { updateScene: updateScene };
})();
