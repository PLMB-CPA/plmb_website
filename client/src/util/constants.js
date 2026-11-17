// constants file for frontend

/**
 * constants for backend and frontend are separate due to different module system 
 * (ES Module for frontend and CommonJS for backend)
 * IMPORTANT: If a constant is updated here, update src/util/constants.js 
 * (backend) as well
 */



export const TAX_TYPES = {
    VAT: 'VAT',
    PERCENTAGE: 'Percentage Tax',
    INCOME: 'Income Tax',
    WITHHOLDING: 'Withholding Tax'
};

export const REMITTANCE_STATUS = {
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    REMITTED: 'Remitted',
    COMPLETED: 'Completed'
};

export const STATUS_COLORS = {
    'Pending': { bg: '#fff4e5', text: '#b26a00' },
    'Processing': { bg: '#e3f2fd', text: '#1565c0' },
    'Remitted': { bg: '#f3e5f5', text: '#6a1b9a' },
    'Completed': { bg: '#edf8ed', text: '#2d8f3f' }
};

