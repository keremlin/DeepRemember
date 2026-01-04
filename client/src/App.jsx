import React, { useState, useEffect } from 'react'
import Welcome from './components/welcome/Welcome'
import DeepRemember from './components/DeepRemember'
import PlayerPage from './components/player/PlayerPage'
import UserManagement from './components/users/UserManagement'
import ManagementPage from './components/management/userManagement'
import Chat from './components/chat/Chat'
import WordList from './components/basewords/WordList'
import Courses from './components/Courses/Courses'
import Dictate from './components/Courses/Dictate/Dictate'
import { ToastProvider } from './components/ToastProvider'
import { AuthProvider, useAuth } from './components/security/AuthContext'
import { ThemeProvider } from './components/ThemeContext'
import { UserConfigProvider } from './components/UserConfigContext'
import { WordBaseProvider } from './components/basewords/WordBaseContext'
import AuthWrapper from './components/security/AuthWrapper'
import './App.css'

// Inner component that has access to AuthContext
function AppContent() {
  const { setNavigateToLogin, isAuthenticated } = useAuth();
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

  // Set up navigation callback for login redirect
  useEffect(() => {
    const navigateToLogin = () => {
      setCurrentView('login');
    };
    setNavigateToLogin(navigateToLogin);
  }, [setNavigateToLogin]);

  // Redirect to login when user becomes unauthenticated
  useEffect(() => {
    if (!isAuthenticated && currentView !== 'login') {
      setCurrentView('login');
    }
  }, [isAuthenticated, currentView]);

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

  const navigateToUserManagement = () => {
    setCurrentView('usermanagement')
  }

  const navigateToManagement = () => {
    setCurrentView('management')
  }

  const navigateToChat = () => {
    setCurrentView('chat')
  }

  const navigateToWordList = () => {
    setCurrentView('wordlist')
  }

  const navigateToCourses = () => {
    setCurrentView('courses')
  }

  const navigateToDictate = () => {
    setCurrentView('dictate')
  }

  return (
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
            onNavigateToManagement={navigateToManagement}
            onNavigateToChat={navigateToChat}
            onNavigateToUserManagement={navigateToUserManagement}
            onNavigateToWordList={navigateToWordList}
            onNavigateToCourses={navigateToCourses}
          />
        ) : currentView === 'deepremember' ? (
          <DeepRemember 
            onNavigateToWelcome={navigateToWelcome}
            onNavigateToPlayer={navigateToPlayer}
            showCardsOnMount={showCardsOnMount}
            onNavigateToUserManagement={navigateToUserManagement}
            onNavigateToManagement={navigateToManagement}
            onNavigateToChat={navigateToChat}
            onNavigateToWordList={navigateToWordList}
            onNavigateToCourses={navigateToCourses}
          />
        ) : currentView === 'usermanagement' ? (
          <UserManagement 
            onUserSetup={() => {}}
            onNavigateToWelcome={navigateToWelcome}
            onNavigateToPlayer={navigateToPlayer}
            onShowCards={() => navigateToDeepRemember(true)}
            onNavigateToUserManagement={navigateToUserManagement}
            onNavigateToManagement={navigateToManagement}
            onNavigateToChat={navigateToChat}
            onNavigateToWordList={navigateToWordList}
            onNavigateToCourses={navigateToCourses}
          />
        ) : currentView === 'management' ? (
          <ManagementPage 
            onUserSetup={() => {}}
            onNavigateToWelcome={navigateToWelcome}
            onNavigateToPlayer={navigateToPlayer}
            onShowCards={() => navigateToDeepRemember(true)}
            onNavigateToUserManagement={navigateToUserManagement}
            onNavigateToManagement={navigateToManagement}
            onNavigateToChat={navigateToChat}
            onNavigateToWordList={navigateToWordList}
            onNavigateToCourses={navigateToCourses}
          />
        ) : currentView === 'chat' ? (
          <Chat 
            onNavigateToWelcome={navigateToWelcome}
            onNavigateToPlayer={navigateToPlayer}
            onShowCards={() => navigateToDeepRemember(true)}
            onNavigateToUserManagement={navigateToUserManagement}
            onNavigateToManagement={navigateToManagement}
            onNavigateToWordList={navigateToWordList}
            onNavigateToCourses={navigateToCourses}
          />
        ) : currentView === 'wordlist' ? (
          <WordList 
            onNavigateToWelcome={navigateToWelcome}
            onNavigateToPlayer={navigateToPlayer}
            onShowCards={() => navigateToDeepRemember(true)}
            onNavigateToUserManagement={navigateToUserManagement}
            onNavigateToManagement={navigateToManagement}
            onNavigateToChat={navigateToChat}
            onNavigateToWordList={navigateToWordList}
            onNavigateToCourses={navigateToCourses}
          />
        ) : currentView === 'courses' ? (
          <Courses 
            onUserSetup={() => {}}
            onNavigateToWelcome={navigateToWelcome}
            onNavigateToPlayer={navigateToPlayer}
            onShowCards={() => navigateToDeepRemember(true)}
            onNavigateToUserManagement={navigateToUserManagement}
            onNavigateToManagement={navigateToManagement}
            onNavigateToChat={navigateToChat}
            onNavigateToWordList={navigateToWordList}
            onNavigateToDictate={navigateToDictate}
          />
        ) : currentView === 'dictate' ? (
          <Dictate 
            onUserSetup={() => {}}
            onNavigateToWelcome={navigateToWelcome}
            onNavigateToPlayer={navigateToPlayer}
            onShowCards={() => navigateToDeepRemember(true)}
            onNavigateToUserManagement={navigateToUserManagement}
            onNavigateToManagement={navigateToManagement}
            onNavigateToChat={navigateToChat}
            onNavigateToWordList={navigateToWordList}
            onNavigateToCourses={navigateToCourses}
          />
        ) : (
          <PlayerPage 
            onNavigateToWelcome={navigateToWelcome}
            onNavigateToPlayer={navigateToPlayer}
            onNavigateToDeepRemember={navigateToDeepRemember}
            onNavigateToUserManagement={navigateToUserManagement}
            onNavigateToManagement={navigateToManagement}
            onNavigateToChat={navigateToChat}
            onNavigateToWordList={navigateToWordList}
            onNavigateToCourses={navigateToCourses}
          />
        )}
      </div>
    </AuthWrapper>
  )
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <UserConfigProvider>
            <WordBaseProvider>
              <AppContent />
            </WordBaseProvider>
          </UserConfigProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
