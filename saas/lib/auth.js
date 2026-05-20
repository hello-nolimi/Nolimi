// Auth Supabase : connexion, garde de session, déconnexion.
var NolimiAuth = (function () {
    var client = null;

    function getConfig() {
        return (typeof window !== 'undefined' && window.NOLIMI_SUPABASE_CONFIG)
            ? window.NOLIMI_SUPABASE_CONFIG
            : {};
    }

    function getClient() {
        if (client) return client;
        var cfg = getConfig();
        if (!cfg.url || !cfg.anonKey || typeof supabase === 'undefined' || !supabase.createClient) {
            return null;
        }
        client = supabase.createClient(cfg.url, cfg.anonKey);
        return client;
    }

    function resolveUrl(relativePath) {
        return new URL(relativePath, window.location.href).href;
    }

    function getLoginUrl() {
        if (window.location.pathname.indexOf('/auth/') !== -1) {
            return resolveUrl('login.html');
        }
        return resolveUrl('../auth/login.html');
    }

    function getAppUrl() {
        return resolveUrl('../saas/app.html?start=1');
    }

    function redirectToLogin() {
        window.location.replace(getLoginUrl());
    }

    function requireSession() {
        var sb = getClient();
        if (!sb) {
            console.error('Supabase non configuré (url, anonKey, SDK).');
            redirectToLogin();
            return Promise.reject(new Error('supabase_not_configured'));
        }
        return sb.auth.getSession().then(function (result) {
            var session = result && result.data ? result.data.session : null;
            if (session) return session;
            redirectToLogin();
            return Promise.reject(new Error('no_session'));
        });
    }

    function signInWithPassword(email, password) {
        var sb = getClient();
        if (!sb) {
            return Promise.resolve({ error: { message: 'Configuration Supabase manquante.' } });
        }
        return sb.auth.signInWithPassword({ email: email, password: password });
    }

    function signOut() {
        var sb = getClient();
        if (!sb) {
            redirectToLogin();
            return Promise.resolve();
        }
        return sb.auth.signOut().then(function () {
            redirectToLogin();
        }).catch(function () {
            redirectToLogin();
        });
    }

    function redirectIfAlreadyLoggedIn() {
        var sb = getClient();
        if (!sb) return Promise.resolve();
        return sb.auth.getSession().then(function (result) {
            var session = result && result.data ? result.data.session : null;
            if (session) window.location.replace(getAppUrl());
        });
    }

    function bindLogoutButton(buttonId) {
        var btn = document.getElementById(buttonId || 'btn-logout');
        if (!btn || btn.dataset.bound) return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', function () {
            signOut();
        });
    }

    return {
        getClient: getClient,
        requireSession: requireSession,
        signInWithPassword: signInWithPassword,
        signOut: signOut,
        redirectIfAlreadyLoggedIn: redirectIfAlreadyLoggedIn,
        bindLogoutButton: bindLogoutButton,
        getLoginUrl: getLoginUrl,
        getAppUrl: getAppUrl
    };
})();
