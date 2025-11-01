// Simple version of SCP Card Generator for testing
console.log('🚀 Simple SCP Card Generator script starting...');

class SimpleCardTemplate {
    constructor(type) {
        this.type = type;
        console.log('SimpleCardTemplate created:', type);
    }
}

class SimpleUnifiedCardInterface {
    constructor() {
        this.currentCardType = 'researcher';
        console.log('SimpleUnifiedCardInterface created');
    }
}

class SimpleSCPCardGenerator {
    constructor(cardType, mode = 'client') {
        this.cardType = cardType;
        this.mode = mode;
        this.formData = {};
        console.log('SimpleSCPCardGenerator created:', cardType, mode);
    }
    
    updatePreview(fieldData) {
        this.formData = { ...this.formData, ...fieldData };
        console.log('Preview updated with:', fieldData);
    }
    
    renderPreview() {
        console.log('Rendering preview for:', this.cardType);
    }
    
    validateForm(data) {
        console.log('Validating form data:', data);
        return { isValid: true, errors: [] };
    }
    
    exportCard(format = 'png') {
        console.log('Exporting card as:', format);
    }
}

// Export to window
console.log('🔧 Exporting simple classes to window...');
window.SimpleSCPCardGenerator = SimpleSCPCardGenerator;
window.SimpleCardTemplate = SimpleCardTemplate;
window.SimpleUnifiedCardInterface = SimpleUnifiedCardInterface;

console.log('✅ Simple classes exported:');
console.log('- SimpleSCPCardGenerator:', typeof window.SimpleSCPCardGenerator);
console.log('- SimpleCardTemplate:', typeof window.SimpleCardTemplate);
console.log('- SimpleUnifiedCardInterface:', typeof window.SimpleUnifiedCardInterface);

// Test instantiation
try {
    const testGen = new SimpleSCPCardGenerator('researcher');
    console.log('✅ Simple generator test successful');
} catch (error) {
    console.error('❌ Simple generator test failed:', error);
}