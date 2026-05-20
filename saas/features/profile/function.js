// Façade stable du feature profile.
var BottleMaths = (function () {
    if (typeof ProfileMath !== 'undefined') return ProfileMath;
    return {
        getSectionRadiusAtAngle: function () { return 0; },
        getSectionRingPoints: function () { return []; },
        buildExteriorProfile: function () { return []; },
        buildPuntProfile: function () { return []; },
        buildInteriorProfile: function () { return []; },
        getRuledSurfacePoint: function () { return { x: 0, y: 0, z: 0 }; },
        getRadialBandPoint: function () { return { x: 0, y: 0, z: 0 }; },
        getConeToApexPoint: function () { return { x: 0, y: 0, z: 0 }; },
        createExteriorRadiusSampler: function () { return function () { return 0; }; }
    };
})();
