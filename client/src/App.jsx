import React, { useState } from 'react'
import Welcome from './components/welcome/Welcome'
import DeepRemember from './components/DeepRemember'
import PlayerPage from './components/player/PlayerPage'
import { ToastProvider } from './components/ToastProvider'
import { AuthProvider } from './components/security/AuthContext'
import { ThemeProvider } from './components/ThemeContext'
import AuthWrapper from './components/security/AuthWrapper'
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
  const [showCardsOnMount, setShowCardsOnMount] = useState(false)

  const navigateToDeepRemember = (showCards = false) => {
    setShowCardsOnMount(showCards)
    setCurrentView('deepremember')
  }

  const navigateToWelcome = () => {
    setCurrentView('welcome')
  }

  const navigateToPlayer = () => {
    setCurrentView('player')
  }

  return (
    <ThemeProvider>
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
                <DeepRemember 
                  onNavigateToWelcome={navigateToWelcome}
                  onNavigateToPlayer={navigateToPlayer}
                  showCardsOnMount={showCardsOnMount}
                />
              ) : (
                <PlayerPage 
                  onNavigateToWelcome={navigateToWelcome}
                  onNavigateToPlayer={navigateToPlayer}
                  onNavigateToDeepRemember={navigateToDeepRemember}
                />
              )}
            </div>
          </AuthWrapper>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
