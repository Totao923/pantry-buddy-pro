import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal, ConfirmModal } from '../../../components/ui/Modal';

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<Modal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<Modal {...defaultProps} />);

    const closeButton = screen.getByRole('button');
    await user.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', async () => {
    const user = userEvent.setup();
    render(<Modal {...defaultProps} />);

    // Click on overlay (first child of modal container)
    const overlay = document.querySelector('.fixed.inset-0.transition-opacity');
    if (overlay) {
      await user.click(overlay);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('does not close when overlay is clicked if closeOnOverlayClick is false', async () => {
    const user = userEvent.setup();
    render(<Modal {...defaultProps} closeOnOverlayClick={false} />);

    const overlay = document.querySelector('.fixed.inset-0.transition-opacity');
    if (overlay) {
      await user.click(overlay);
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    }
  });

  it('handles escape key', () => {
    render(<Modal {...defaultProps} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(<Modal {...defaultProps} size="sm" />);
    expect(document.querySelector('.max-w-md')).toBeInTheDocument();

    rerender(<Modal {...defaultProps} size="lg" />);
    expect(document.querySelector('.max-w-2xl')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    const footer = <div>Footer content</div>;
    render(<Modal {...defaultProps} footer={footer} />);

    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('hides close button when showCloseButton is false', () => {
    render(<Modal {...defaultProps} showCloseButton={false} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('ConfirmModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<ConfirmModal {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /confirm/i }));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows loading state correctly', () => {
    render(<ConfirmModal {...defaultProps} loading />);

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    const cancelButton = screen.getByRole('button', { name: /cancel/i });

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('renders different variants correctly', () => {
    const { rerender } = render(<ConfirmModal {...defaultProps} variant="danger" />);
    expect(screen.getByText('⚠️')).toBeInTheDocument();

    rerender(<ConfirmModal {...defaultProps} variant="warning" />);
    expect(screen.getByText('⚠️')).toBeInTheDocument();

    rerender(<ConfirmModal {...defaultProps} variant="info" />);
    expect(screen.getByText('ℹ️')).toBeInTheDocument();
  });

  it('renders custom button text', () => {
    render(<ConfirmModal {...defaultProps} confirmText="Delete" cancelText="Keep" />);

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep/i })).toBeInTheDocument();
  });
});
