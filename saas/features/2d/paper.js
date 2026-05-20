var Plans2DPaper = (function () {
    function getFormats() {
        if (typeof Plans2DRules !== 'undefined' && Plans2DRules.PAPER_FORMATS) return Plans2DRules.PAPER_FORMATS;
        return { A4_P: { w: 210, h: 297 } };
    }

    function getDefaultFormat() {
        if (typeof Plans2DRules !== 'undefined' && Plans2DRules.DEFAULT_PAPER_FORMAT) return Plans2DRules.DEFAULT_PAPER_FORMAT;
        return 'A2_P';
    }

    function getSelectedFormat() {
        var id = (Plans2DRules && Plans2DRules.IDS && Plans2DRules.IDS.paperFormat) || 'paper-format-select';
        var el = document.getElementById(id);
        return el ? el.value : getDefaultFormat();
    }

    function getPaperInfo() {
        var formats = getFormats();
        var selected = getSelectedFormat();
        return formats[selected] || formats[getDefaultFormat()];
    }

    return {
        getFormats: getFormats,
        getDefaultFormat: getDefaultFormat,
        getSelectedFormat: getSelectedFormat,
        getPaperInfo: getPaperInfo
    };
})();
