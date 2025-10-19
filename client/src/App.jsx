import React, { useState } from 'react'
import Welcome from './components/welcome/Welcome'
import DeepRemember from './components/DeepRemember'
import PlayerPage from './components/player/PlayerPage'
import { ToastProvider } from './components/ToastProvider'
import { AuthProvider } from './components/security/AuthContext'
import AuthWrapper from './components/security/AuthWrapper'
import EmailConfirmationRedirect from './components/security/EmailConfirmationRedirect'
import './App.css'

function App() {
  // Check if user is already authenticated
  const isAlreadyAuthenticated = () => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('access_token');
      return !!(storedUser && storedToken);
    } catch {
      return false;
    }
  };

  const [currentView, setCurrentView] = useState(isAlreadyAuthenticated() ? 'welcome' : 'login')

  // Check if this is an email confirmation redirect
  const urlParams = new URLSearchParams(window.location.search);
  const isEmailConfirmation = urlParams.get('type') === 'signup' && urlParams.get('token');

  const navigateToDeepRemember = () => {
    setCurrentView('deepremember')
  }

  const navigateToWelcome = () => {
    setCurrentView('welcome')
  }

  const navigateToPlayer = () => {
    setCurrentView('player')
  }

  // If this is an email confirmation redirect, show the confirmation component
  if (isEmailConfirmation) {
    return (
      <ToastProvider>
        <AuthProvider>
          <EmailConfirmationRedirect />
        </AuthProvider>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <AuthWrapper onNavigateToWelcome={navigateToWelcome}>
          <div className="App">
            {currentView === 'login' ? (
              <div style={{padding: '20px', textAlign: 'center'}}>
                <h2>Please log in to continue</h2>
                <p>The login modal should appear above this message.</p>
              </div>
            ) : currentView === 'welcome' ? (
              <Welcome 
                onNavigateToDeepRemember={navigateToDeepRemember}
                onNavigateToPlayer={navigateToPlayer}
              />
            ) : currentView === 'deepremember' ? (
              <DeepRemember onNavigateToWelcome={navigateToWelcome} />
            ) : (
              <PlayerPage onNavigateToWelcome={navigateToWelcome} />
            )}
          </div>
        </AuthWrapper>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
