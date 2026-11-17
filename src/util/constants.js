// constants file for backend

/**
 * constants for backend and frontend are separate due to different module system 
 * (ES Module for frontend and CommonJS for backend)
 * IMPORTANT: If a constant is updated here, update client/src/util/constants.js 
 * (frontend) as well
 */

const TAX_TYPES = {
    VAT: 'VAT',
    PERCENTAGE: 'Percentage Tax',
    INCOME: 'Income Tax',
    WITHHOLDING: 'Withholding Tax'
};

const REMITTANCE_STATUS = {
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    REMITTED: 'Remitted',
    COMPLETED: 'Completed'
};

module.exports = {
    TAX_TYPES,
    REMITTANCE_STATUS
};