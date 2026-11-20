// F04 · Client Tax Remittance Status Tracking (admin delete confirmation popup)
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';

import DeleteConfirmModal from './DeleteConfirmModal.jsx';

describe('F04 · delete confirmation modal', () => {
  // SITUATION: admin clicked "Delete Record" on a row and the popup appears.
  // CHECKS: it warns that the delete is permanent and offers both buttons.
  it('warns the delete is permanent and shows Cancel + confirm buttons', () => {
    render(<DeleteConfirmModal onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Delete Remittance Record' })).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, Delete Record' })).toBeInTheDocument();
  });

  // SITUATION: admin changes their mind and clicks Cancel.
  // CHECKS: only onClose fires, onConfirm (the real delete) does NOT.
  it('Cancel closes without confirming', async () => {
    const onClose = vi.fn(); const onConfirm = vi.fn();
    render(<DeleteConfirmModal onClose={onClose} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // SITUATION: admin clicks "Yes, Delete Record".
  // CHECKS: onConfirm fires once.
  it('confirm button calls onConfirm', async () => {
    const onClose = vi.fn(); const onConfirm = vi.fn();
    render(<DeleteConfirmModal onClose={onClose} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Yes, Delete Record' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
