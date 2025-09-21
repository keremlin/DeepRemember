import React, { useState } from 'react'
import Welcome from './components/welcome/Welcome'
import DeepRemember from './components/DeepRemember'
import PlayerPage from './components/player/PlayerPage'
import { ToastProvider } from './components/ToastProvider'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('welcome')

  const navigateToDeepRemember = () => {
    setCurrentView('deepremember')
  }

  const navigateToWelcome = () => {
    setCurrentView('welcome')
  }

  const navigateToPlayer = () => {
    setCurrentView('player')
  }

  return (
    <ToastProvider>
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
    </ToastProvider>
  )
}

export default App
