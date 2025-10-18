import React, { useState } from 'react';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import EmailConfirmationModal from './EmailConfirmationModal';
import { useAuth } from './AuthContext';

const AuthWrapper = ({ children }) => {
  const { isAuthenticated, login, register } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const handleLoginSuccess = (user, session) => {
    console.log('Login successful:', user);
    setShowLoginModal(false);
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

  // If user is authenticated, render children
  if (isAuthenticated) {
    return children;
  }

  // If not authenticated, show appropriate modal
  return (
    <>
      <LoginModal
        isOpen={showLoginModal}
        onClose={handleCloseModals}
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
      {/* Show login modal by default when not authenticated */}
      <LoginModal
        isOpen={!showLoginModal && !showRegisterModal && !showEmailConfirmation}
        onClose={() => {}} // Prevent closing without authentication
        onLoginSuccess={handleLoginSuccess}
        onSwitchToRegister={handleSwitchToRegister}
      />
    </>
  );
};

export default AuthWrapper;
