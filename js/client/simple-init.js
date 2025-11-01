/**
 * Simple Initialization - Fallback initialization without module loader
 */

// Simple initialization function
async function initializeSCPCardApp() {
    console.log('🚀 Starting simple initialization...');
    
    try {
        // Wait a bit for scripts to load
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if core classes are available
        const coreClasses = {
            SCPCardApp: window.SCPCardApp,
            APIClient: window.APIClient,
            PersonnelCard: window.PersonnelCard
        };
        
        const missingCore = Object.keys(coreClasses).filter(key => !coreClasses[key]);
        
        if (missingCore.length > 0) {
            console.error('❌ Missing core classes:', missingCore);
            showSimpleError(`Missing core modules: ${missingCore.join(', ')}`);
            return;
        }
        
        // Initialize the app
        const app = new SCPCardApp();
        await app.initialize();
        
        // Make globally available
        window.scpCardApp = app;
        
        console.log('✅ SCP Card Generator initialized successfully (simple mode)');
        
        return app;
        
    } catch (error) {
        console.error('❌ Simple initialization failed:', error);
        showSimpleError(error.message);
        throw error;
    }
}

function showSimpleError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #f5c6cb;
            max-width: 400px;
            z-index: 10000;
            font-family: Arial, sans-serif;
        ">
            <strong>⚠️ Initialization Error</strong><br>
            ${message}<br>
            <button onclick="window.location.reload()" style="
                background: #dc3545;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
            ">Reload</button>
        </div>
    `;
    document.body.appendChild(errorDiv);
}

// Export for use
window.initializeSCPCardApp = initializeSCPCardApp;