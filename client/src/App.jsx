import React, { useState } from 'react'
import Welcome from './components/Welcome'
import DeepRemember from './components/DeepRemember'
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
    <div className="App">
      {currentView === 'welcome' ? (
        <Welcome onNavigateToDeepRemember={navigateToDeepRemember} />
      ) : (
        <DeepRemember onNavigateToWelcome={navigateToWelcome} />
      )}
    </div>
  )
}

export default App
