import React, { useState } from 'react'
import Welcome from './components/welcome/Welcome'
import DeepRemember from './components/DeepRemember'
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

  return (
    <ToastProvider>
      <div className="App">
        {currentView === 'welcome' ? (
          <Welcome onNavigateToDeepRemember={navigateToDeepRemember} />
        ) : (
          <DeepRemember onNavigateToWelcome={navigateToWelcome} />
        )}
      </div>
    </ToastProvider>
  )
}

export default App
