/**
 * Module Loader - Loads client modules on demand and initializes the app once.
 *
 * This loader is intentionally self-contained so index.html only needs to load
 * this file. Already loaded scripts are detected and never injected twice.
 */
class ModuleLoader {
    constructor() {
        this.basePath = './js/client/';
        this.modules = [
            { name: 'data-models.js', required: true },
            { name: 'validation.js', required: true },
            { name: 'card-generator.js', required: true },
            { name: 'error-handler.js' },
            { name: 'performance-optimizer.js' },
            { name: 'api-client.js' },
            { name: 'site-manager.js' },
            { name: 'batch-processor.js' },
            { name: 'ui-controller.js', required: true },
            { name: 'app.js', required: true }
        ];
        this.optionalModules = [
            'scp-animations.js',
            'accessibility-controller.js'
        ];
        this.promises = new Map();
        this.appPromise = null;
    }

    scriptUrl(name) {
        return new URL(this.basePath + name, document.baseURI).href;
    }

    findScript(name) {
        const url = this.scriptUrl(name);
        return Array.from(document.scripts).find(script => script.src === url);
    }

    loadScript(name, required = false) {
        if (this.promises.has(name)) {
            return this.promises.get(name);
        }

        const existing = this.findScript(name);
        if (existing && existing.dataset.moduleLoaderState === 'loaded') {
            return Promise.resolve();
        }

        const promise = new Promise((resolve, reject) => {
            const script = existing || document.createElement('script');
            let settled = false;

            const finish = (error) => {
                if (settled) return;
                settled = true;
                script.removeEventListener('load', onLoad);
                script.removeEventListener('error', onError);

                if (error) {
                    script.dataset.moduleLoaderState = 'failed';
                    console.error(`❌ Failed to load ${name}:`, error);
                    if (required) reject(error);
                    else resolve();
                    return;
                }

                script.dataset.moduleLoaderState = 'loaded';
                console.log(`✅ Loaded ${name}`);
                resolve();
            };

            const onLoad = () => finish();
            const onError = () => finish(new Error(`Failed to load ${name}`));

            script.addEventListener('load', onLoad, { once: true });
            script.addEventListener('error', onError, { once: true });

            if (!existing) {
                script.src = this.basePath + name;
                script.async = false;
                script.dataset.moduleLoader = 'true';
                document.head.appendChild(script);
            } else if (window[name.replace(/\.js$/, '')]) {
                // Existing scripts loaded without the marker are already ready.
                finish();
            }
        });

        this.promises.set(name, promise);
        return promise;
    }

    async loadAll() {
        for (const module of this.modules) {
            await this.loadScript(module.name, module.required === true);
        }

        // Enhancements must not prevent the application from starting.
        await Promise.all(this.optionalModules.map(name => this.loadScript(name)));

        if (!window.ValidationError || !window.PersonnelValidator) {
            throw new Error('Validation module did not expose its classes');
        }
        if (!window.SCPCardGenerator || !window.CardTemplate) {
            throw new Error('Card generator module did not expose its classes');
        }
        if (!window.UIController || !window.SCPCardApp) {
            throw new Error('Application UI modules are incomplete');
        }

        window.SCP_MODULES_LOADED = true;
        window.SCP_CLASSES_READY = true;
        window.SCP_MODULES_LOADING = false;

        return this.getStatus();
    }

    getStatus() {
        const loaded = this.modules
            .filter(module => this.promises.has(module.name))
            .map(module => module.name);
        return {
            loaded,
            total: this.modules.length,
            missing: this.modules
                .filter(module => !this.promises.has(module.name))
                .map(module => module.name)
        };
    }

    async initializeApp() {
        if (this.appPromise) return this.appPromise;

        this.appPromise = this.loadAll().then(async () => {
            if (window.scpCardApp?.isInitialized) {
                return window.scpCardApp;
            }

            const app = new window.SCPCardApp();
            await app.initialize();
            window.scpCardApp = app;
            window.uiController = app.uiController;
            window.cardGenerator = app.cardGenerator;

            document.dispatchEvent(new CustomEvent('allScriptsLoaded', {
                detail: this.getStatus()
            }));
            document.dispatchEvent(new CustomEvent('appInitialized', {
                detail: { app }
            }));

            return app;
        }).catch(error => {
            console.error('❌ Module loading failed:', error);
            this.showLoadingError(error);
            throw error;
        });

        return this.appPromise;
    }

    showLoadingError(error) {
        if (document.querySelector('.module-loading-error')) return;

        const errorDiv = document.createElement('div');
        errorDiv.className = 'module-loading-error';
        errorDiv.innerHTML = `
            <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#f8d7da;color:#721c24;padding:20px;border-radius:8px;border:1px solid #f5c6cb;max-width:500px;z-index:10000;font-family:Arial,sans-serif">
                <h3 style="margin-top:0">⚠️ Loading Error</h3>
                <p>The SCP Card Generator failed to load properly.</p>
                <details><summary>Error details</summary><pre>${String(error.message || error)}</pre></details>
                <button onclick="window.location.reload()">Reload Page</button>
            </div>`;
        document.body.appendChild(errorDiv);
    }
}

function startSCPModuleLoader() {
    if (window.scpModuleLoader?.appPromise) {
        return window.scpModuleLoader.appPromise;
    }

    window.scpModuleLoader = new ModuleLoader();
    return window.scpModuleLoader.initializeApp();
}

window.ModuleLoader = ModuleLoader;
window.startSCPModuleLoader = startSCPModuleLoader;

// Support both a normal script tag and dynamic loading after DOMContentLoaded.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startSCPModuleLoader, { once: true });
} else {
    startSCPModuleLoader();
}
