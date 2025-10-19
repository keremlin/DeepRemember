import React, { useState } from 'react';
import CloseButton from '../CloseButton';
import { useToast } from '../ToastProvider';
import { useAuth } from './AuthContext';
import './AuthModal.css';

const LoginModal = ({ isOpen, onClose, onLoginSuccess, onSwitchToRegister }) => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      showError('Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        showSuccess('Login successful!');
        
        // Reset form
        setFormData({ email: '', password: '' });
        
        // Call success callback
        if (onLoginSuccess) {
          onLoginSuccess(result.user, { access_token: result.user.access_token });
        }
        
        onClose();
      } else {
        // Check if it's an email confirmation error
        if (result.error && result.error.includes('Email not confirmed')) {
          showError('Please check your email and click the confirmation link before logging in.');
        } else {
          showError(result.error || 'Login failed');
        }
      }
    } catch (error) {
      console.error('LoginModal: Login error:', error);
      showError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!formData.email) {
      showWarning('Please enter your email address first');
      return;
    }

    // Implement forgot password functionality
    showInfo('Password reset functionality will be implemented soon');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal auth-modal">
        <div className="modal-header">
          <h2 className="modal-title">Login</h2>
          <CloseButton onClose={onClose} />
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Enter your email"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="form-input password-input"
                placeholder="Enter your password"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>

          <div className="auth-links">
            <button
              type="button"
              className="link-button"
              onClick={handleForgotPassword}
              disabled={isLoading}
            >
              Forgot Password?
            </button>
          </div>

          <div className="auth-switch">
            <span>Don't have an account? </span>
            <button
              type="button"
              className="link-button"
              onClick={onSwitchToRegister}
              disabled={isLoading}
            >
              Register here
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
