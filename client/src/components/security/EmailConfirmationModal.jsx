import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '../ToastProvider';
import './AuthModal.css';

const EmailConfirmationModal = ({ isOpen, onClose, email }) => {
  const { showSuccess, showError, showInfo } = useToast();
  const { verifyToken, getCurrentUser } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isCheckingConfirmation, setIsCheckingConfirmation] = useState(false);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Check if email is confirmed periodically
  useEffect(() => {
    if (!isOpen || !email) return;

    const checkConfirmation = async () => {
      setIsCheckingConfirmation(true);
      try {
        // Try to get current user info to see if email is confirmed
        const result = await getCurrentUser();
        if (result.success) {
          showSuccess('Email confirmed successfully!');
          onClose();
        }
      } catch (error) {
        // User still not confirmed, continue showing modal
      } finally {
        setIsCheckingConfirmation(false);
      }
    };

    // Check immediately
    checkConfirmation();

    // Check every 5 seconds
    const interval = setInterval(checkConfirmation, 5000);

    return () => clearInterval(interval);
  }, [isOpen, email, getCurrentUser, showSuccess, onClose]);

  const handleResendConfirmation = async () => {
    if (countdown > 0) return;

    setIsResending(true);
    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Confirmation email sent! Please check your inbox.');
        setCountdown(60); // 60 second cooldown
      } else {
        showError(data.error || 'Failed to resend confirmation email');
      }
    } catch (error) {
      console.error('Resend confirmation error:', error);
      showError('Network error. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckEmail = () => {
    showInfo('Please check your email inbox and spam folder for the confirmation link.');
  };

  const handleTryLogin = async () => {
    setIsCheckingConfirmation(true);
    try {
      const result = await getCurrentUser();
      if (result.success) {
        showSuccess('Email confirmed! You can now use the application.');
        onClose();
      } else {
        showError('Email not yet confirmed. Please check your inbox.');
      }
    } catch (error) {
      showError('Email not yet confirmed. Please check your inbox.');
    } finally {
      setIsCheckingConfirmation(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal auth-modal email-confirmation-modal">
        <div className="modal-header">
          <h2 className="modal-title">Confirm Your Email</h2>
        </div>

        <div className="email-confirmation-content">
          <div className="confirmation-icon">
            📧
          </div>
          
          <div className="confirmation-message">
            <p>
              We've sent a confirmation email to <strong>{email}</strong>
            </p>
            <p>
              Please check your inbox and click the confirmation link to activate your account.
            </p>
          </div>

          <div className="confirmation-actions">
            <button
              type="button"
              className="btn btn-primary btn-full"
              onClick={handleTryLogin}
              disabled={isCheckingConfirmation}
            >
              {isCheckingConfirmation ? 'Checking...' : 'I\'ve Confirmed My Email'}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={handleResendConfirmation}
              disabled={isResending || countdown > 0}
            >
              {isResending 
                ? 'Sending...' 
                : countdown > 0 
                  ? `Resend in ${countdown}s` 
                  : 'Resend Confirmation Email'
              }
            </button>

            <button
              type="button"
              className="link-button"
              onClick={handleCheckEmail}
            >
              Need help finding the email?
            </button>
          </div>

          <div className="confirmation-tips">
            <h4>Can't find the email?</h4>
            <ul>
              <li>Check your spam/junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes for the email to arrive</li>
              <li>Try resending the confirmation email</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmationModal;
