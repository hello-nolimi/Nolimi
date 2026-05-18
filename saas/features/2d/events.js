var Plans2DEvents = (function () {
    function bindControlRedraw(drawFn) {
        var ids = (Plans2DRules && Plans2DRules.IDS) ? Plans2DRules.IDS : {};
        var list = [
            ids.paperFormat, ids.drawingScale, ids.showBottom,
            ids.projectTitle, ids.planNumber, ids.date, ids.drafter, ids.checker, ids.index
        ];
        list.forEach(function (id) {
            if (!id) return;
            var el = document.getElementById(id);
            if (!el) return;
            var ev = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
            el.addEventListener(ev, function () { if (typeof drawFn === 'function') drawFn(); });
        });
    }

    return {
        bindControlRedraw: bindControlRedraw
    };
})();
