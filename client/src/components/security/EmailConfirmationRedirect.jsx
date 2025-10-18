import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '../ToastProvider';
import './AuthModal.css';

const EmailConfirmationRedirect = () => {
  const { showSuccess, showError, showInfo } = useToast();
  const { verifyToken, getCurrentUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'

  useEffect(() => {
    const processConfirmation = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const type = urlParams.get('type');

        if (!token || type !== 'signup') {
          setStatus('error');
          showError('Invalid confirmation link');
          return;
        }

        // Call the backend to confirm email and create user record
        const response = await fetch('/api/auth/confirm-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (data.success) {
          setStatus('success');
          showSuccess('Email confirmed successfully! User record created. You can now login.');
          
          // Store session data if available
          if (data.session) {
            localStorage.setItem('access_token', data.session.access_token);
            localStorage.setItem('refresh_token', data.session.refresh_token);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
          
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
        } else {
          setStatus('error');
          showError(data.error || 'Email confirmation failed');
        }
      } catch (error) {
        console.error('Email confirmation error:', error);
        setStatus('error');
        showError('Email confirmation failed. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    };

    processConfirmation();
  }, [showSuccess, showError]);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoToLogin = () => {
    window.location.href = '/';
  };

  return (
    <div className="modal-overlay">
      <div className="modal auth-modal email-confirmation-modal">
        <div className="modal-header">
          <h2 className="modal-title">Email Confirmation</h2>
        </div>

        <div className="email-confirmation-content">
          {isProcessing && (
            <>
              <div className="confirmation-icon">
                ⏳
              </div>
              <div className="confirmation-message">
                <p>Processing your email confirmation...</p>
                <p>Please wait while we verify your account.</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="confirmation-icon">
                ✅
              </div>
              <div className="confirmation-message">
                <p><strong>Email confirmed successfully!</strong></p>
                <p>Your account is now active. You will be redirected to the login page shortly.</p>
              </div>
              <div className="confirmation-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-full"
                  onClick={handleGoToLogin}
                >
                  Go to Login
                </button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="confirmation-icon">
                ❌
              </div>
              <div className="confirmation-message">
                <p><strong>Email confirmation failed</strong></p>
                <p>There was an error confirming your email. This could be because:</p>
                <ul>
                  <li>The confirmation link has expired</li>
                  <li>The link has already been used</li>
                  <li>The link is invalid</li>
                </ul>
              </div>
              <div className="confirmation-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-full"
                  onClick={handleRetry}
                >
                  Try Again
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={handleGoToLogin}
                >
                  Go to Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmationRedirect;
