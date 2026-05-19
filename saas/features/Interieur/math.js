// Calculs geometriques de l'epaisseur interieure.
var InterieurMath = (function () {
    function getThicknessMm() {
        return (typeof InterieurFeature !== 'undefined' && InterieurFeature.getGlassThicknessMm)
            ? InterieurFeature.getGlassThicknessMm()
            : 3.5;
    }

    function buildInteriorSectionsDataFromThickness(sectionsData, thicknessMm, bottomLiftMm) {
        if (!sectionsData || !sectionsData.sections || !sectionsData.sections.length) return null;
        var t = Math.max(0, thicknessMm || 0);
        var lift = Math.max(0, bottomLiftMm || 0);
        var innerSections = [];
        for (var i = 0; i < sectionsData.sections.length; i++) {
            var s = sectionsData.sections[i];
            innerSections.push({
                H: (i === 0 ? (s.H + lift) : s.H),
                a: Math.max(0.1, (s.a || 0) - t),
                b: Math.max(0.1, (s.b || 0) - t),
                shape: s.shape,
                carreNiveau: s.carreNiveau
            });
        }
        return {
            sections: innerSections,
            edgeTypes: (sectionsData.edgeTypes || []).slice(),
            rhos: (sectionsData.rhos || []).slice()
        };
    }

    function insetPointRadial(p, thicknessMm) {
        var t = Math.max(0, thicknessMm || 0);
        if (t <= 0) return { x: p.x, y: p.y, z: p.z };
        var r = Math.sqrt(p.x * p.x + p.z * p.z);
        if (r <= 1e-9) return { x: p.x, y: p.y, z: p.z };
        var k = Math.max(0, r - t) / r;
        return { x: p.x * k, y: p.y, z: p.z * k };
    }

    function createInsetMeshFromMesh(sourceMesh, thicknessMm, material) {
        if (!sourceMesh || !sourceMesh.geometry || typeof THREE === 'undefined') return null;
        var src = sourceMesh.geometry;
        var pos = src.getAttribute('position');
        if (!pos || !pos.count) return null;
        var out = new Float32Array(pos.array.length);
        for (var i = 0; i < pos.count; i++) {
            var p = insetPointRadial({ x: pos.getX(i), y: pos.getY(i), z: pos.getZ(i) }, thicknessMm);
            out[i * 3] = p.x;
            out[i * 3 + 1] = p.y;
            out[i * 3 + 2] = p.z;
        }
        var g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
        if (src.index) {
            var idx = src.index.array;
            var kept = [];
            for (var it = 0; it < idx.length; it += 3) {
                var ia = idx[it], ib = idx[it + 1], ic = idx[it + 2];
                var ax0 = pos.getX(ia), ay0 = pos.getY(ia), az0 = pos.getZ(ia);
                var bx0 = pos.getX(ib), by0 = pos.getY(ib), bz0 = pos.getZ(ib);
                var cx0 = pos.getX(ic), cy0 = pos.getY(ic), cz0 = pos.getZ(ic);
                var ab0x = bx0 - ax0, ab0y = by0 - ay0, ab0z = bz0 - az0;
                var ac0x = cx0 - ax0, ac0y = cy0 - ay0, ac0z = cz0 - az0;
                var n0x = ab0y * ac0z - ab0z * ac0y;
                var n0y = ab0z * ac0x - ab0x * ac0z;
                var n0z = ab0x * ac0y - ab0y * ac0x;
                var a0 = Math.sqrt(n0x * n0x + n0y * n0y + n0z * n0z);

                var ax = out[ia * 3], ay = out[ia * 3 + 1], az = out[ia * 3 + 2];
                var bx = out[ib * 3], by = out[ib * 3 + 1], bz = out[ib * 3 + 2];
                var cx = out[ic * 3], cy = out[ic * 3 + 1], cz = out[ic * 3 + 2];
                var abx = bx - ax, aby = by - ay, abz = bz - az;
                var acx = cx - ax, acy = cy - ay, acz = cz - az;
                var nx = aby * acz - abz * acy;
                var ny = abz * acx - abx * acz;
                var nz = abx * acy - aby * acx;
                var a1 = Math.sqrt(nx * nx + ny * ny + nz * nz);

                if (a0 < 1e-8 || a1 < 1e-8) continue;
                if ((n0x * nx + n0y * ny + n0z * nz) <= 0) continue;
                kept.push(ia, ib, ic);
            }
            g.setIndex(kept);
        }
        g.computeVertexNormals();
        var mesh = new THREE.Mesh(g, material || sourceMesh.material);
        mesh.position.copy(sourceMesh.position);
        mesh.rotation.copy(sourceMesh.rotation);
        mesh.scale.copy(sourceMesh.scale);
        return mesh;
    }

    function insetSection(section, thicknessMm) {
        var t = Math.max(0, thicknessMm || 0);
        var tSafe = Math.min(t, Math.max(0, Math.min((section.a || 0), (section.b || 0)) - 0.2));
        return {
            H: section.H,
            a: Math.max(0.1, (section.a || 0) - tSafe),
            b: Math.max(0.1, (section.b || 0) - tSafe),
            shape: section.shape,
            carreNiveau: section.carreNiveau
        };
    }

    function outsetSection(section, thicknessMm) {
        return {
            H: section.H,
            a: Math.max(0.1, (section.a || 0) + Math.max(0, thicknessMm || 0)),
            b: Math.max(0.1, (section.b || 0) + Math.max(0, thicknessMm || 0)),
            shape: section.shape,
            carreNiveau: section.carreNiveau
        };
    }

    function getOuterSectionAtHeight(mainSections, H) {
        if (!mainSections || !mainSections.length) return null;
        if (H <= mainSections[0].H) return mainSections[0];
        for (var i = 0; i < mainSections.length - 1; i++) {
            var s0 = mainSections[i];
            var s1 = mainSections[i + 1];
            if (H >= s0.H && H <= s1.H) {
                var dy = (s1.H - s0.H);
                var t = dy <= 1e-9 ? 0 : (H - s0.H) / dy;
                return {
                    H: H,
                    a: (1 - t) * s0.a + t * s1.a,
                    b: (1 - t) * s0.b + t * s1.b,
                    shape: s0.shape,
                    carreNiveau: s0.carreNiveau
                };
            }
        }
        return mainSections[mainSections.length - 1];
    }

    return {
        getThicknessMm: getThicknessMm,
        buildInteriorSectionsDataFromThickness: buildInteriorSectionsDataFromThickness,
        createInsetMeshFromMesh: createInsetMeshFromMesh,
        insetSection: insetSection,
        outsetSection: outsetSection,
        getOuterSectionAtHeight: getOuterSectionAtHeight
    };
})();
