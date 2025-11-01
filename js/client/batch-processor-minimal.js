/**
 * Minimal Client Batch Processor - For testing purposes
 */
class ClientBatchProcessor {
    constructor() {
        console.log('ClientBatchProcessor constructor called');
        
        this.apiClient = null;
        this.currentBatch = null;
        this.progressCallback = null;
        
        console.log('ClientBatchProcessor initialized successfully');
    }
    
    validateFileBasic(file) {
        if (!file) return false;
        
        const allowedTypes = [
            'text/csv',
            'application/json',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        const allowedExtensions = ['.csv', '.json', '.xls', '.xlsx'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        return allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
    }
    
    async uploadFile(file) {
        console.log('Upload file called with:', file?.name);
        return Promise.resolve({ success: true });
    }
}

// Make class globally available
window.ClientBatchProcessor = ClientBatchProcessor;
console.log('ClientBatchProcessor class exported to window');