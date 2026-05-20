// Etat runtime des sections (source unique pour le feature).
var SectionsState = (function () {
    function fallbackState() {
        return {
            sectionsMain: [],
            liaisonsMain: [],
            piqureSections: [],
            piqureLiaisons: [],
            bagueSections: [],
            bagueLiaisons: []
        };
    }

    var state = (typeof SectionsRules !== 'undefined' && SectionsRules.createInitialState)
        ? SectionsRules.createInitialState()
        : fallbackState();

    function getState() {
        return state;
    }

    function resetState() {
        state = (typeof SectionsRules !== 'undefined' && SectionsRules.createInitialState)
            ? SectionsRules.createInitialState()
            : fallbackState();
        return state;
    }

    function setState(next) {
        if (!next) return state;
        try {
            state = JSON.parse(JSON.stringify(next));
        } catch (e) {
            state = next;
        }
        return state;
    }

    return {
        getState: getState,
        resetState: resetState,
        setState: setState
    };
})();
