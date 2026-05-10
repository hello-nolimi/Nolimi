var TopbarShared = (function () {
    function init() {
        var btnFichierMenu = document.getElementById('btn-fichier-menu');
        var fichierDropdown = document.getElementById('fichier-dropdown');
        var btnAffichageMenu = document.getElementById('btn-affichage-menu');
        var affichageDropdown = document.getElementById('affichage-dropdown');

        if (btnFichierMenu && fichierDropdown) {
            btnFichierMenu.addEventListener('click', function (e) {
                e.stopPropagation();
                if (affichageDropdown) affichageDropdown.classList.add('hidden');
                fichierDropdown.classList.toggle('hidden');
            });

            document.addEventListener('click', function (e) {
                if (!fichierDropdown.contains(e.target) && e.target !== btnFichierMenu) {
                    fichierDropdown.classList.add('hidden');
                }
                if (affichageDropdown && btnAffichageMenu && !affichageDropdown.contains(e.target) && e.target !== btnAffichageMenu) {
                    affichageDropdown.classList.add('hidden');
                }
            });
        }

        if (btnAffichageMenu && affichageDropdown) {
            btnAffichageMenu.addEventListener('click', function (e) {
                e.stopPropagation();
                if (fichierDropdown) fichierDropdown.classList.add('hidden');
                affichageDropdown.classList.toggle('hidden');
            });
        }

    }

    return {
        init: init
    };
})();
