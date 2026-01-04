import React from 'react'
import TopMenuButton from './TopMenuButton'
import './TopMenu.css'

const TopMenu = ({ onNavigateToPlayer, onShowCards, onNavigateToUserManagement, onNavigateToManagement, onNavigateToChat, onNavigateToWordList, onNavigateToCourses }) => {
  const menuItems = [
    { 
      icon: 'play_circle', 
      label: 'Player', 
      active: true,
      onClick: onNavigateToPlayer
    },
    { 
      icon: 'style', 
      label: 'Cards',
      onClick: onShowCards
    },
    { 
      icon: 'menu_book', 
      label: 'Words',
      onClick: onNavigateToWordList
    },
    { 
      icon: 'school', 
      label: 'Courses',
      onClick: onNavigateToCourses
    },
    { icon: 'description', label: 'Grammar' },
    { 
      icon: 'settings', 
      label: 'Manage',
      onClick: onNavigateToManagement
    },
    { 
      icon: 'person', 
      label: 'User',
      onClick: onNavigateToUserManagement
    },
    { 
      icon: 'chat', 
      label: 'Chat',
      onClick: onNavigateToChat
    },
  ]

  return (
    <div className="top-menu">
      <div className="top-menu-container">
        {menuItems.map((item, index) => (
          <TopMenuButton
            key={index}
            icon={item.icon}
            label={item.label}
            active={item.active}
            link={item.link}
            onClick={item.onClick}
          />
        ))}
      </div>
    </div>
  )
}

export default TopMenu

