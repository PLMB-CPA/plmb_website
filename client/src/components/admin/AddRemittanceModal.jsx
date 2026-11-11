import { useState } from 'react';
import { TAX_TYPES } from '../../util/constants';
import useClickOutside from './useClickOutside';
import './AddRemittanceModal.css';

function AddRemittanceModal({ onClose, onSuccess, clients }) {
    const [formData, setFormData] = useState({
        client: '',
        taxType: 'VAT',
        amount: '',
        dueDate: ''
    });

    // Custom Searchable Dropdown State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useClickOutside(() => setIsDropdownOpen(false));

    // Filter clients based on the search input
    const filteredClients = clients.filter(c => {
        const fullName = `${c.firstName} ${c.lastName} ${c.businessName}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
    });

    const selectedClient = clients.find(c => c._id === formData.client);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Prevent submission if a client hasn't been selected from the custom dropdown
        if (!formData.client) {
            window.alert('Please select a client.');
            return;
        }

        try {
            const res = await fetch('/api/admin/remittances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (res.ok) {
                onSuccess(data.remittance);
            } else {
                window.alert(data.message || 'Failed to create record');
            }
        } catch (err) {
            console.error('Error creating record:', err);
            window.alert('Network error while creating record.');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Add Tax Remittance</h2>
                <form onSubmit={handleSubmit}>
                    <label>Client</label>
                    
                    {/* Custom Searchable Dropdown */}
                    <div className="custom-select-container" ref={dropdownRef}>
                        <div 
                            className="select-header" 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            {selectedClient 
                                ? `${selectedClient.firstName} ${selectedClient.lastName} (${selectedClient.businessName})` 
                                : 'Select a client...'}
                            <span className="arrow">{isDropdownOpen ? '▲' : '▼'}</span>
                        </div>

                        {isDropdownOpen && (
                            <div className="select-menu">
                                <input 
                                    type="text" 
                                    className="search-box"
                                    placeholder="Search client name..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                                <ul className="options-list">
                                    {filteredClients.length > 0 ? (
                                        filteredClients.map(c => (
                                            <li 
                                                key={c._id} 
                                                onClick={() => {
                                                    setFormData({ ...formData, client: c._id });
                                                    setIsDropdownOpen(false);
                                                    setSearchQuery(''); // Reset search after selection
                                                }}
                                            >
                                                {c.firstName} {c.lastName} ({c.businessName})
                                            </li>
                                        ))
                                    ) : (
                                        <li className="no-results">No clients found</li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>

                    <label>Tax Type</label>
                    <select
                        required
                        value={formData.taxType}
                        onChange={(e) => setFormData({ ...formData, taxType: e.target.value })}
                    >
                        {Object.values(TAX_TYPES).map(tax => (
                            <option key={tax} value={tax}>{tax}</option>
                        ))}
                    </select>

                    <label>Amount (PHP)</label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />

                    <label>Due Date</label>
                    <input
                        type="date"
                        required
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />

                    <div className="modal-actions">
                        <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="save-btn">Save Record</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddRemittanceModal;