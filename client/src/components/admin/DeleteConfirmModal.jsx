import './RemittanceTrackerModal.css'; // reuse existing modal style
// NOTE: global CSS file for modal can be considered

function DeleteConfirmModal({ onClose, onConfirm }) {
    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                <h2>Delete Remittance Record</h2>
                <p style={{ fontSize: '14px', color: '#555', marginBottom: '24px', lineHeight: '1.5' }}>
                    Are you sure you want to delete this record? This action cannot be undone and will permanently remove it from the system.
                </p>
                <div className="modal-actions">
                    <button type="button" className="cancel-btn" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="button" className="delete-btn" onClick={onConfirm}>
                        Yes, Delete Record
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DeleteConfirmModal;