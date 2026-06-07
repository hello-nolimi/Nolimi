// Orchestration du mode rendu (matériaux + scène).
var RenderFeature = (function () {
    var RULES = (typeof RenderRules !== 'undefined') ? RenderRules : {};
    var IDS = RULES.IDS || {};
    var labelRefreshTimer = null;
    var LABEL_REFRESH_DELAY_MS = 90;

    function requestLabelRefresh(immediate) {
        if (typeof updateBouteille !== 'function') return;
        if (immediate) {
            if (labelRefreshTimer) {
                clearTimeout(labelRefreshTimer);
                labelRefreshTimer = null;
            }
            updateBouteille();
            return;
        }
        if (labelRefreshTimer) clearTimeout(labelRefreshTimer);
        labelRefreshTimer = setTimeout(function () {
            labelRefreshTimer = null;
            updateBouteille();
        }, LABEL_REFRESH_DELAY_MS);
    }

    function createLabel(id) {
        return {
            id: id,
            imageUrl: null,
            texture: null,
            height: 40,
            size: 100,
            rotation: 0,
            flipX: false,
            flipY: false
        };
    }

    function ensureLabelState() {
        if (typeof window === 'undefined') return null;
        if (!window.renderLabelState) {
            window.renderLabelState = {
                enabled: false,
                labels: [],
                activeId: null,
                nextId: 1
            };
        } else if (!Array.isArray(window.renderLabelState.labels)) {
            // Migration ancienne version mono-étiquette -> multi-étiquettes.
            var legacy = window.renderLabelState;
            var migrated = createLabel('label-1');
            migrated.imageUrl = legacy.imageUrl || null;
            migrated.texture = legacy.texture || null;
            migrated.height = (legacy.height !== undefined) ? legacy.height : 40;
            migrated.size = (legacy.size !== undefined) ? legacy.size : 100;
            migrated.rotation = (legacy.rotation !== undefined) ? legacy.rotation : 0;
            migrated.flipX = !!legacy.flipX;
            migrated.flipY = !!legacy.flipY;
            window.renderLabelState = {
                enabled: !!legacy.enabled,
                labels: migrated.texture ? [migrated] : [],
                activeId: migrated.texture ? 'label-1' : null,
                nextId: 2
            };
        }
        return window.renderLabelState;
    }

    function getActiveLabel(state) {
        if (!state || !state.labels || !state.labels.length) return null;
        var activeId = state.activeId || state.labels[0].id;
        for (var i = 0; i < state.labels.length; i++) {
            if (state.labels[i].id === activeId) return state.labels[i];
        }
        state.activeId = state.labels[0].id;
        return state.labels[0];
    }

    function applyMaterialMode(mode) {
        if (typeof BottleMaterials !== 'undefined' && BottleMaterials.setRenderMaterialMode) {
            BottleMaterials.setRenderMaterialMode(mode);
        }
        if (typeof updateBouteille === 'function') updateBouteille();
    }

    function applyBackgroundScene(sceneName) {
        if (typeof SceneSetup3D !== 'undefined' && SceneSetup3D.setBackgroundScene) {
            SceneSetup3D.setBackgroundScene(sceneName);
        }
    }

    function syncSceneAvailabilityFromDom() {
        var modeToggle = document.getElementById(IDS.modeToggle || 'render-mode-toggle');
        var radioGlass = document.getElementById(IDS.materialGlass || 'render-material-glass');
        var materialCard = radioGlass ? radioGlass.closest('.setting-card') : null;
        var sceneCard = document.getElementById(IDS.sceneCard || 'render-scene-card');
        var labelCard = document.getElementById(IDS.labelCard || 'render-label-card');
        var scene1 = document.getElementById(IDS.scene1 || 'render-scene-1');
        var scene2 = document.getElementById(IDS.scene2 || 'render-scene-2');
        if (!modeToggle) return;
        var enabled = !!modeToggle.checked;
        if (scene1) scene1.disabled = !enabled;
        if (scene2) scene2.disabled = !enabled;
        if (materialCard) materialCard.classList.toggle('is-disabled', !enabled);
        if (sceneCard) sceneCard.classList.toggle('is-disabled', !enabled);
        if (labelCard) labelCard.classList.toggle('is-disabled', !enabled);
    }

    function scheduleWorkspaceSave() {
        if (typeof WorkspaceAutosave !== 'undefined' && WorkspaceAutosave.scheduleSave) {
            WorkspaceAutosave.scheduleSave();
        }
    }

    function initModeRenduControls() {
        var state = ensureLabelState();
        var modeToggle = document.getElementById(IDS.modeToggle || 'render-mode-toggle');
        var radioGlass = document.getElementById(IDS.materialGlass || 'render-material-glass');
        var materialCard = radioGlass ? radioGlass.closest('.setting-card') : null;
        var sceneCard = document.getElementById(IDS.sceneCard || 'render-scene-card');
        var labelCard = document.getElementById(IDS.labelCard || 'render-label-card');
        var labelList = document.getElementById('render-label-list');
        var labelInput = document.getElementById(IDS.labelImage || 'render-label-image');
        var labelHeight = document.getElementById(IDS.labelHeight || 'render-label-height');
        var labelHeightNumber = document.getElementById('render-label-height-number');
        var labelSize = document.getElementById(IDS.labelSize || 'render-label-size');
        var labelSizeNumber = document.getElementById('render-label-size-number');
        var labelRotation = document.getElementById(IDS.labelRotation || 'render-label-rotation');
        var labelRotationNumber = document.getElementById('render-label-rotation-number');
        var labelFlipX = document.getElementById('render-label-flip-x');
        var labelFlipY = document.getElementById('render-label-flip-y');
        var sceneBase = document.getElementById(IDS.sceneBase || 'render-scene-base');
        var scene1 = document.getElementById(IDS.scene1 || 'render-scene-1');
        var scene2 = document.getElementById(IDS.scene2 || 'render-scene-2');
        if (!state || !modeToggle || !radioGlass || !sceneBase) return;

        function clampToInputRange(inputEl, value, fallback) {
            if (!inputEl) return (isNaN(value) ? fallback : value);
            var v = isNaN(value) ? fallback : value;
            var min = parseFloat(inputEl.min);
            var max = parseFloat(inputEl.max);
            if (!isNaN(min) && v < min) v = min;
            if (!isNaN(max) && v > max) v = max;
            return v;
        }

        function setLabelControlsDisabled(disabled) {
            if (labelHeight) labelHeight.disabled = disabled;
            if (labelHeightNumber) labelHeightNumber.disabled = disabled;
            if (labelSize) labelSize.disabled = disabled;
            if (labelSizeNumber) labelSizeNumber.disabled = disabled;
            if (labelRotation) labelRotation.disabled = disabled;
            if (labelRotationNumber) labelRotationNumber.disabled = disabled;
            if (labelFlipX) labelFlipX.disabled = disabled;
            if (labelFlipY) labelFlipY.disabled = disabled;
        }

        function refreshLabelAccordionHeight() {
            if (!labelCard) return;
            var btn = labelCard.querySelector('.accordion.main-accordion');
            var panel = labelCard.querySelector('.panel-controls');
            if (!btn || !panel) return;
            if (!btn.classList.contains('active')) return;
            panel.style.maxHeight = panel.scrollHeight + 'px';
        }

        function renderLabelList() {
            if (!labelList) return;
            var html = '';
            for (var i = 0; i < state.labels.length; i++) {
                var l = state.labels[i];
                var isActive = l.id === state.activeId;
                html += '<div class="label-row" style="align-items:center; margin-bottom:4px; background:' + (isActive ? 'rgba(0,120,212,0.12)' : 'transparent') + '; border-radius:4px; padding:2px 4px;">'
                    + '<button type="button" class="btn-render-label-select" data-label-id="' + l.id + '" style="background:none;border:none;cursor:pointer;text-align:left;padding:0;flex:1;">Etiquette ' + (i + 1) + '</button>'
                    + '<button type="button" class="btn-render-label-delete" data-label-id="' + l.id + '" title="Supprimer" style="background:none;border:none;cursor:pointer;color:#a33;font-size:14px;line-height:1;">×</button>'
                    + '</div>';
            }
            labelList.innerHTML = html;
            refreshLabelAccordionHeight();
        }

        function syncLabelInputsFromActive() {
            var active = getActiveLabel(state);
            if (!active) {
                setLabelControlsDisabled(true);
                return;
            }
            setLabelControlsDisabled(false);
            if (labelHeight) labelHeight.value = String(active.height || 0);
            if (labelSize) labelSize.value = String(active.size || 100);
            if (labelRotation) labelRotation.value = String(active.rotation || 0);
            if (labelHeightNumber) labelHeightNumber.value = String(active.height || 0);
            if (labelSizeNumber) labelSizeNumber.value = String(active.size || 100);
            if (labelRotationNumber) labelRotationNumber.value = String(active.rotation || 0);
            if (labelFlipX) labelFlipX.checked = !!active.flipX;
            if (labelFlipY) labelFlipY.checked = !!active.flipY;
        }

        function syncSceneAvailability() {
            var enabled = !!modeToggle.checked;
            if (scene1) scene1.disabled = !enabled;
            if (scene2) scene2.disabled = !enabled;
            if (materialCard) materialCard.classList.toggle('is-disabled', !enabled);
            if (sceneCard) sceneCard.classList.toggle('is-disabled', !enabled);
            if (labelCard) {
                labelCard.classList.toggle('is-disabled', !enabled);
            }
            // En mode rendu, on repart à zéro à l'activation puis on autorise de nouvelles étiquettes.
            state.enabled = enabled;
            if (enabled && state.labels && state.labels.length) {
                for (var li = 0; li < state.labels.length; li++) {
                    var lab = state.labels[li];
                    if (lab && lab.texture && lab.texture.dispose) lab.texture.dispose();
                }
                state.labels = [];
                state.activeId = null;
                renderLabelList();
                syncLabelInputsFromActive();
            }
            if (!enabled) sceneBase.checked = true;
            if (typeof updateBouteille === 'function') updateBouteille();
        }

        function applySceneFromChecks() {
            // Mode rendu simplifié: aucun décor de scène, bouteille seule.
            if (modeToggle.checked) {
                applyBackgroundScene(RenderRules.SCENE_NONE || 'none');
                if (typeof updateBouteille === 'function') updateBouteille();
                return;
            }
            var sceneName = RenderMath.sceneFromInputs(
                !!modeToggle.checked,
                !!(scene1 && scene1.checked),
                !!(scene2 && scene2.checked)
            );
            applyBackgroundScene(sceneName);
            if (typeof updateBouteille === 'function') updateBouteille();
        }

        function applyMaterialFromMode() {
            var mode = RenderMath.materialModeFromToggle(!!modeToggle.checked);
            applyMaterialMode(mode);
        }

        if (!modeToggle.dataset.bound) {
            modeToggle.dataset.bound = '1';
            modeToggle.addEventListener('change', function () {
                applyMaterialFromMode();
                syncSceneAvailability();
                applySceneFromChecks();
            });
        }
        if (!radioGlass.dataset.bound) {
            radioGlass.dataset.bound = '1';
            radioGlass.addEventListener('change', function () {
                if (radioGlass.checked && modeToggle.checked) applyMaterialMode(RULES.MODE_GLASS || 'glass');
            });
        }
        if (!sceneBase.dataset.bound) {
            sceneBase.dataset.bound = '1';
            sceneBase.addEventListener('change', function () { if (sceneBase.checked) applySceneFromChecks(); });
        }
        if (scene1 && !scene1.dataset.bound) {
            scene1.dataset.bound = '1';
            scene1.addEventListener('change', applySceneFromChecks);
        }
        if (scene2 && !scene2.dataset.bound) {
            scene2.dataset.bound = '1';
            scene2.addEventListener('change', applySceneFromChecks);
        }
        if (labelInput && !labelInput.dataset.bound) {
            labelInput.dataset.bound = '1';
            labelInput.addEventListener('change', function (ev) {
                var file = ev && ev.target && ev.target.files ? ev.target.files[0] : null;
                if (!file || !/^image\/png$/i.test(file.type || '')) return;
                var reader = new FileReader();
                reader.onload = function (e) {
                    var dataUrl = e && e.target ? e.target.result : null;
                    if (!dataUrl || typeof THREE === 'undefined') return;
                    var loader = new THREE.TextureLoader();
                    loader.load(dataUrl, function (tx) {
                        var newId = 'label-' + (state.nextId++);
                        var label = createLabel(newId);
                        label.texture = tx;
                        label.imageUrl = dataUrl;
                        label.texture.needsUpdate = true;
                        state.labels.push(label);
                        state.activeId = newId;
                        state.enabled = !!modeToggle.checked;
                        renderLabelList();
                        syncLabelInputsFromActive();
                        requestLabelRefresh(true);
                        scheduleWorkspaceSave();
                        if (labelInput) labelInput.value = '';
                    });
                };
                reader.readAsDataURL(file);
            });
        }
        if (labelHeight && !labelHeight.dataset.bound) {
            labelHeight.dataset.bound = '1';
            labelHeight.addEventListener('input', function () {
                var active = getActiveLabel(state);
                if (!active) return;
                active.height = parseFloat(labelHeight.value) || 0;
                syncLabelInputsFromActive();
                requestLabelRefresh(false);
            });
            labelHeight.addEventListener('change', function () {
                syncLabelInputsFromActive();
                requestLabelRefresh(true);
            });
        }
        if (labelHeightNumber && !labelHeightNumber.dataset.bound) {
            labelHeightNumber.dataset.bound = '1';
            labelHeightNumber.addEventListener('input', function () {
                if (!labelHeight) return;
                var raw = parseFloat(labelHeightNumber.value);
                var next = clampToInputRange(labelHeight, raw, parseFloat(labelHeight.value) || 0);
                labelHeight.value = String(next);
                var active = getActiveLabel(state);
                if (active) active.height = next;
                syncLabelInputsFromActive();
                requestLabelRefresh(false);
            });
            labelHeightNumber.addEventListener('change', function () {
                syncLabelInputsFromActive();
                requestLabelRefresh(true);
            });
        }
        if (labelSize && !labelSize.dataset.bound) {
            labelSize.dataset.bound = '1';
            labelSize.addEventListener('input', function () {
                var active = getActiveLabel(state);
                if (!active) return;
                active.size = parseFloat(labelSize.value) || 100;
                syncLabelInputsFromActive();
                requestLabelRefresh(false);
            });
            labelSize.addEventListener('change', function () {
                syncLabelInputsFromActive();
                requestLabelRefresh(true);
            });
        }
        if (labelSizeNumber && !labelSizeNumber.dataset.bound) {
            labelSizeNumber.dataset.bound = '1';
            labelSizeNumber.addEventListener('input', function () {
                if (!labelSize) return;
                var raw = parseFloat(labelSizeNumber.value);
                var next = clampToInputRange(labelSize, raw, parseFloat(labelSize.value) || 100);
                labelSize.value = String(next);
                var active = getActiveLabel(state);
                if (active) active.size = next;
                syncLabelInputsFromActive();
                requestLabelRefresh(false);
            });
            labelSizeNumber.addEventListener('change', function () {
                syncLabelInputsFromActive();
                requestLabelRefresh(true);
            });
        }
        if (labelRotation && !labelRotation.dataset.bound) {
            labelRotation.dataset.bound = '1';
            labelRotation.addEventListener('input', function () {
                var active = getActiveLabel(state);
                if (!active) return;
                active.rotation = parseFloat(labelRotation.value) || 0;
                syncLabelInputsFromActive();
                requestLabelRefresh(false);
            });
            labelRotation.addEventListener('change', function () {
                syncLabelInputsFromActive();
                requestLabelRefresh(true);
            });
        }
        if (labelRotationNumber && !labelRotationNumber.dataset.bound) {
            labelRotationNumber.dataset.bound = '1';
            labelRotationNumber.addEventListener('input', function () {
                if (!labelRotation) return;
                var raw = parseFloat(labelRotationNumber.value);
                var next = clampToInputRange(labelRotation, raw, parseFloat(labelRotation.value) || 0);
                labelRotation.value = String(next);
                var active = getActiveLabel(state);
                if (active) active.rotation = next;
                syncLabelInputsFromActive();
                requestLabelRefresh(false);
            });
            labelRotationNumber.addEventListener('change', function () {
                syncLabelInputsFromActive();
                requestLabelRefresh(true);
            });
        }
        if (labelFlipX && !labelFlipX.dataset.bound) {
            labelFlipX.dataset.bound = '1';
            labelFlipX.addEventListener('change', function () {
                var active = getActiveLabel(state);
                if (!active) return;
                active.flipX = !!labelFlipX.checked;
                requestLabelRefresh(true);
            });
        }
        if (labelFlipY && !labelFlipY.dataset.bound) {
            labelFlipY.dataset.bound = '1';
            labelFlipY.addEventListener('change', function () {
                var active = getActiveLabel(state);
                if (!active) return;
                active.flipY = !!labelFlipY.checked;
                requestLabelRefresh(true);
            });
        }
        if (labelList && !labelList.dataset.bound) {
            labelList.dataset.bound = '1';
            labelList.addEventListener('click', function (ev) {
                var target = ev.target;
                if (!target) return;
                var selectBtn = target.closest('.btn-render-label-select');
                var deleteBtn = target.closest('.btn-render-label-delete');
                if (selectBtn && selectBtn.dataset.labelId) {
                    state.activeId = selectBtn.dataset.labelId;
                    renderLabelList();
                    syncLabelInputsFromActive();
                    return;
                }
                if (deleteBtn && deleteBtn.dataset.labelId) {
                    var delId = deleteBtn.dataset.labelId;
                    var idx = -1;
                    for (var i = 0; i < state.labels.length; i++) {
                        if (state.labels[i].id === delId) { idx = i; break; }
                    }
                    if (idx < 0) return;
                    var removed = state.labels.splice(idx, 1)[0];
                    if (removed && removed.texture && removed.texture.dispose) removed.texture.dispose();
                    if (state.activeId === delId) {
                        state.activeId = state.labels.length ? state.labels[Math.max(0, idx - 1)].id : null;
                    }
                    renderLabelList();
                    syncLabelInputsFromActive();
                    requestLabelRefresh(true);
                    scheduleWorkspaceSave();
                }
            });
        }

        // Synchroniser l'UI avec l'état courant (valeurs HTML ou restauration projet).
        if (!state.labels) state.labels = [];
        renderLabelList();
        syncLabelInputsFromActive();
        refreshLabelAccordionHeight();
        applyMaterialFromMode();
        syncSceneAvailability();
        applySceneFromChecks();
    }

    function renderLabelListUi() {
        var state = ensureLabelState();
        var labelList = document.getElementById('render-label-list');
        if (!state || !labelList) return;
        var html = '';
        for (var i = 0; i < state.labels.length; i++) {
            var l = state.labels[i];
            var isActive = l.id === state.activeId;
            html += '<div class="label-row" style="align-items:center; margin-bottom:4px; background:' + (isActive ? 'rgba(0,120,212,0.12)' : 'transparent') + '; border-radius:4px; padding:2px 4px;">'
                + '<button type="button" class="btn-render-label-select" data-label-id="' + l.id + '" style="background:none;border:none;cursor:pointer;text-align:left;padding:0;flex:1;">Etiquette ' + (i + 1) + '</button>'
                + '<button type="button" class="btn-render-label-delete" data-label-id="' + l.id + '" title="Supprimer" style="background:none;border:none;cursor:pointer;color:#a33;font-size:14px;line-height:1;">×</button>'
                + '</div>';
        }
        labelList.innerHTML = html;
    }

    function syncActiveLabelInputsToDom() {
        var state = ensureLabelState();
        var active = getActiveLabel(state);
        var labelHeight = document.getElementById(IDS.labelHeight || 'render-label-height');
        var labelHeightNumber = document.getElementById('render-label-height-number');
        var labelSize = document.getElementById(IDS.labelSize || 'render-label-size');
        var labelSizeNumber = document.getElementById('render-label-size-number');
        var labelRotation = document.getElementById(IDS.labelRotation || 'render-label-rotation');
        var labelRotationNumber = document.getElementById('render-label-rotation-number');
        var labelFlipX = document.getElementById('render-label-flip-x');
        var labelFlipY = document.getElementById('render-label-flip-y');
        if (!active) return;
        if (labelHeight) labelHeight.value = String(active.height || 0);
        if (labelSize) labelSize.value = String(active.size || 100);
        if (labelRotation) labelRotation.value = String(active.rotation || 0);
        if (labelHeightNumber) labelHeightNumber.value = String(active.height || 0);
        if (labelSizeNumber) labelSizeNumber.value = String(active.size || 100);
        if (labelRotationNumber) labelRotationNumber.value = String(active.rotation || 0);
        if (labelFlipX) labelFlipX.checked = !!active.flipX;
        if (labelFlipY) labelFlipY.checked = !!active.flipY;
    }

    function applyControlsFromDom() {
        var modeToggle = document.getElementById(IDS.modeToggle || 'render-mode-toggle');
        var sceneBase = document.getElementById(IDS.sceneBase || 'render-scene-base');
        var scene1 = document.getElementById(IDS.scene1 || 'render-scene-1');
        var scene2 = document.getElementById(IDS.scene2 || 'render-scene-2');
        var state = ensureLabelState();
        if (!modeToggle || !state) return;
        state.enabled = !!modeToggle.checked;
        applyMaterialMode(RenderMath.materialModeFromToggle(!!modeToggle.checked));
        if (modeToggle.checked) {
            applyBackgroundScene(RULES.SCENE_NONE || 'none');
        } else {
            var sceneName = RenderMath.sceneFromInputs(
                !!modeToggle.checked,
                !!(scene1 && scene1.checked),
                !!(scene2 && scene2.checked)
            );
            applyBackgroundScene(sceneName);
        }
        renderLabelListUi();
        syncActiveLabelInputsToDom();
        syncSceneAvailabilityFromDom();
    }

    function collectSaveState() {
        var state = ensureLabelState();
        if (!state) return { enabled: false, labels: [], activeId: null, nextId: 1 };
        var items = [];
        for (var i = 0; i < state.labels.length; i++) {
            var l = state.labels[i];
            items.push({
                id: l.id,
                imageDataUrl: l.imageUrl || null,
                height: l.height,
                size: l.size,
                rotation: l.rotation,
                flipX: !!l.flipX,
                flipY: !!l.flipY
            });
        }
        return {
            enabled: !!state.enabled,
            activeId: state.activeId,
            nextId: state.nextId || 1,
            labels: items
        };
    }

    function disposeLabelTextures(state) {
        if (!state || !state.labels) return;
        for (var i = 0; i < state.labels.length; i++) {
            var lab = state.labels[i];
            if (lab && lab.texture && lab.texture.dispose) lab.texture.dispose();
        }
    }

    function restoreSaveState(data, done) {
        var callback = typeof done === 'function' ? done : function () { };
        var state = ensureLabelState();
        if (!state) {
            callback();
            return;
        }
        disposeLabelTextures(state);
        state.labels = [];
        state.activeId = null;
        if (!data || !Array.isArray(data.labels) || !data.labels.length) {
            state.enabled = !!(data && data.enabled);
            state.nextId = (data && data.nextId) ? data.nextId : 1;
            applyControlsFromDom();
            callback();
            return;
        }
        state.enabled = !!data.enabled;
        state.nextId = data.nextId || 1;
        state.activeId = data.activeId || null;
        state.labels = new Array(data.labels.length);
        var pending = 0;
        var finished = false;
        function finish() {
            if (finished) return;
            finished = true;
            state.labels = state.labels.filter(function (entry) { return !!entry; });
            if (!state.activeId && state.labels.length) state.activeId = state.labels[0].id;
            applyControlsFromDom();
            callback();
        }
        function markDone() {
            pending -= 1;
            if (pending <= 0) finish();
        }
        for (var i = 0; i < data.labels.length; i++) {
            (function (entry, index) {
                var label = createLabel(entry.id);
                label.height = entry.height;
                label.size = entry.size;
                label.rotation = entry.rotation;
                label.flipX = !!entry.flipX;
                label.flipY = !!entry.flipY;
                if (!entry.imageDataUrl || typeof THREE === 'undefined') {
                    state.labels[index] = label;
                    return;
                }
                pending += 1;
                var loader = new THREE.TextureLoader();
                loader.load(entry.imageDataUrl, function (tx) {
                    label.texture = tx;
                    label.imageUrl = entry.imageDataUrl;
                    label.texture.needsUpdate = true;
                    state.labels[index] = label;
                    markDone();
                }, undefined, markDone);
            })(data.labels[i], i);
        }
        if (pending === 0) finish();
    }

    return {
        initModeRenduControls: initModeRenduControls,
        collectSaveState: collectSaveState,
        restoreSaveState: restoreSaveState,
        applyControlsFromDom: applyControlsFromDom
    };
})();

