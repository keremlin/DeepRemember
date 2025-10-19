import React, { useState, useEffect } from 'react';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import EmailConfirmationModal from './EmailConfirmationModal';
import { useAuth } from './AuthContext';

const AuthWrapper = ({ children, onNavigateToWelcome }) => {
  const { isAuthenticated, login, register } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [hasNavigatedToWelcome, setHasNavigatedToWelcome] = useState(false);

  const handleLoginSuccess = (user, session) => {
    setShowLoginModal(false);
    setJustLoggedIn(true);
    
    // Navigate to Welcome component after successful login
    if (onNavigateToWelcome) {
      onNavigateToWelcome();
      setHasNavigatedToWelcome(true);
    }
  };

  const handleRegisterSuccess = (user, session) => {
    console.log('Registration successful:', user);
    setShowRegisterModal(false);
    
    // If user was created but email needs confirmation
    if (user && !user.email_confirmed_at) {
      setPendingEmail(user.email);
      setShowEmailConfirmation(true);
    }
  };

  const handleSwitchToRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  const handleCloseModals = () => {
    setShowLoginModal(false);
    setShowRegisterModal(false);
    setShowEmailConfirmation(false);
    setPendingEmail('');
  };

  const handleEmailConfirmed = () => {
    setShowEmailConfirmation(false);
    setPendingEmail('');
  };

  // Handle navigation when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && !hasNavigatedToWelcome && onNavigateToWelcome) {
      onNavigateToWelcome();
      setHasNavigatedToWelcome(true);
    }
  }, [isAuthenticated, hasNavigatedToWelcome, onNavigateToWelcome]);

  // If user is authenticated, render children
  if (isAuthenticated) {
    return children;
  }
  // If not authenticated, show appropriate modal
  return (
    <>
      <LoginModal
        isOpen={showLoginModal || (!showLoginModal && !showRegisterModal && !showEmailConfirmation)}
        onClose={showLoginModal ? handleCloseModals : () => {}} // Prevent closing default modal without authentication
        onLoginSuccess={handleLoginSuccess}
        onSwitchToRegister={handleSwitchToRegister}
      />
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={handleCloseModals}
        onRegisterSuccess={handleRegisterSuccess}
        onSwitchToLogin={handleSwitchToLogin}
      />
      <EmailConfirmationModal
        isOpen={showEmailConfirmation}
        onClose={handleEmailConfirmed}
        email={pendingEmail}
      />
    </>
  );
};

export default AuthWrapper;
