// EXPORT — orchestration 3D (STL) et 2D (PDF)
var ExportFeature = (function () {
    var RULES = (typeof ExportRules !== 'undefined') ? ExportRules : null;
    if (!RULES) return { init: function () { } };

    function hideDropdown(refs) {
        if (refs.dropdown) refs.dropdown.classList.add('hidden');
    }

    async function saveBlob(blob, fileName, typeConfig, fallbackSaver) {
        if ('showSaveFilePicker' in window) {
            try {
                var fileHandle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [typeConfig]
                });
                var writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                return true;
            } catch (err) {
                console.log('Export annulé', err);
                return false;
            }
        }
        fallbackSaver();
        return true;
    }

    async function export3D() {
        var refs = ExportState.getRefs();
        hideDropdown(refs);
        if (typeof THREE === 'undefined' || typeof THREE.STLExporter === 'undefined') {
            alert("La librairie d'exportation STL n'est pas chargée.");
            return;
        }
        var targetScene = typeof scene !== 'undefined' ? scene : window.scene;
        if (!targetScene) {
            alert("La scène 3D n'a pas pu être trouvée.");
            return;
        }

        function isBottleExportMesh(obj) {
            if (!obj.isMesh || !obj.geometry || !obj.geometry.index) return false;
            if (obj.userData && (obj.userData.isInterior || obj.userData.isLabel)) return false;
            var node = obj;
            while (node) {
                if (node.userData && node.userData.isBottleExportRoot) return true;
                node = node.parent;
            }
            return false;
        }

        try {
            var tempGroup = new THREE.Group();
            targetScene.traverse(function (obj) {
                if (!isBottleExportMesh(obj)) return;
                var geo = obj.geometry;
                var idx = geo.index.array;
                var newIdx = new idx.constructor(idx.length);
                for (var i = 0; i < idx.length; i += 3) {
                    newIdx[i] = idx[i];
                    newIdx[i + 1] = idx[i + 2];
                    newIdx[i + 2] = idx[i + 1];
                }
                var geoFlipped = geo.clone();
                geoFlipped.setIndex(new THREE.BufferAttribute(newIdx, 1));
                geoFlipped.computeVertexNormals();
                var meshFlipped = new THREE.Mesh(geoFlipped, obj.material.clone());
                meshFlipped.applyMatrix4(obj.matrixWorld);
                tempGroup.add(meshFlipped);
            });

            if (!tempGroup.children.length) {
                alert("Aucune géométrie de bouteille n'a pu être trouvée pour l'export.");
                return;
            }

            var exporter = new THREE.STLExporter();
            var stlData = exporter.parse(tempGroup, { binary: true });

            var blob = new Blob([stlData], { type: 'application/octet-stream' });
            var baseName = ExportMath.safeFileName(refs.projectTitle && refs.projectTitle.value, RULES.DEFAULTS.file3D);
            var finalName = baseName + '.stl';

            await saveBlob(
                blob,
                finalName,
                { description: 'Fichier 3D STL', accept: { 'model/stl': ['.stl'] } },
                function () {
                    var link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = finalName;
                    link.click();
                    URL.revokeObjectURL(link.href);
                }
            );
        } catch (error) {
            console.error("Erreur lors de l'exportation 3D :", error);
            alert("Une erreur est survenue pendant l'export 3D.");
        }
    }

    async function export2D() {
        var refs = ExportState.getRefs();
        hideDropdown(refs);
        if (!window.jspdf) {
            alert("La librairie jsPDF n'est pas chargée.");
            return;
        }
        var canvas = refs.canvas2D;
        if (!canvas || canvas.width === 0) {
            alert("Le plan 2D n'est pas affiché. Veuillez d'abord cliquer sur l'onglet 2D.");
            return;
        }

        var paper = ExportMath.resolvePaperInfo(
            refs.paperFormat ? refs.paperFormat.value : RULES.DEFAULTS.paperFormat,
            typeof paperFormats !== 'undefined' ? paperFormats : null,
            RULES
        );

        try {
            var savedW = canvas.width, savedH = canvas.height;
            if (typeof cam2D === 'undefined' || typeof draw2D !== 'function') {
                alert("Le moteur 2D n'est pas disponible pour l'export.");
                return;
            }
            var savedCam = { x: cam2D.x, y: cam2D.y, zoom: cam2D.zoom };
            var scaleFactor = RULES.DEFAULTS.exportScaleFactor;
            canvas.width = paper.w * scaleFactor;
            canvas.height = paper.h * scaleFactor;
            cam2D.x = canvas.width / 2;
            cam2D.y = canvas.height / 2;
            cam2D.zoom = scaleFactor;
            draw2D();
            var imgData = canvas.toDataURL('image/jpeg', RULES.DEFAULTS.jpegQuality);

            canvas.width = savedW; canvas.height = savedH;
            cam2D.x = savedCam.x; cam2D.y = savedCam.y; cam2D.zoom = savedCam.zoom;
            draw2D();

            var JsPDFClass = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jspdf;
            var pdf = new JsPDFClass({ orientation: paper.orientation, unit: 'mm', format: paper.format });
            pdf.addImage(imgData, 'JPEG', 0, 0, paper.w, paper.h);

            var baseName = ExportMath.safeFileName(refs.projectTitle && refs.projectTitle.value, RULES.DEFAULTS.file2D);
            var finalName = baseName + '.pdf';
            var pdfBlob = pdf.output('blob');

            await saveBlob(
                pdfBlob,
                finalName,
                { description: 'Plan 2D PDF', accept: { 'application/pdf': ['.pdf'] } },
                function () { pdf.save(finalName); }
            );
        } catch (error) {
            console.error("Erreur lors de l'exportation 2D :", error);
            alert("Une erreur est survenue pendant l'export PDF.");
        }
    }

    function init() {
        var refs = ExportState.initRefs(RULES.IDS);
        ExportEvents.bind(refs, {
            onExport3D: export3D,
            onExport2D: export2D
        });
    }

    return {
        init: init,
        export3D: export3D,
        export2D: export2D
    };
})();

(function () {
    if (typeof ExportFeature !== 'undefined' && ExportFeature.init) ExportFeature.init();
})();
