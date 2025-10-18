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
  const [currentView, setCurrentView] = useState('welcome')

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
        <AuthWrapper>
          <div className="App">
            {currentView === 'welcome' ? (
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
