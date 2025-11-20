import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../security/AuthContext'
import { getApiUrl } from '../../config/api'
import './LabelSelector.css'

const LabelSelector = ({ selectedLabels, setSelectedLabels, disabled = false }) => {
  const { user, getAuthHeaders } = useAuth()
  const [labels, setLabels] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Get current user ID
  const currentUserId = user?.email || user?.id || ''

  // Load labels when component mounts
  useEffect(() => {
    if (currentUserId) {
      loadLabels()
    }
  }, [currentUserId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Load user labels (filter out system labels)
  const loadLabels = async () => {
    if (!currentUserId) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(getApiUrl(`/api/srs/labels/${currentUserId}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        // Filter to show only user-defined labels (not system labels)
        const userLabels = (data.labels || []).filter(label => label.type === 'user')
        setLabels(userLabels)
      } else {
        throw new Error(data.error || 'Failed to load labels')
      }
    } catch (error) {
      console.error('Error loading labels:', error)
      setLabels([])
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle label selection
  const toggleLabel = (labelId) => {
    if (disabled) return
    
    const isSelected = selectedLabels.includes(labelId)
    if (isSelected) {
      setSelectedLabels(selectedLabels.filter(id => id !== labelId))
    } else {
      setSelectedLabels([...selectedLabels, labelId])
    }
  }

  // Toggle select all
  const toggleSelectAll = () => {
    if (disabled) return
    
    if (selectedLabels.length === labels.length) {
      setSelectedLabels([])
    } else {
      setSelectedLabels(labels.map(label => label.id))
    }
  }

  // Get selected label names for display
  const getSelectedLabelNames = () => {
    if (selectedLabels.length === 0) {
      return 'Select labels...'
    }
    if (selectedLabels.length === labels.length) {
      return 'All labels selected'
    }
    if (selectedLabels.length <= 2) {
      return selectedLabels
        .map(id => labels.find(l => l.id === id)?.name)
        .filter(Boolean)
        .join(', ')
    }
    return `${selectedLabels.length} labels selected`
  }

  // Get selected label colors for display
  const getSelectedLabelColors = () => {
    return selectedLabels
      .map(id => {
        const label = labels.find(l => l.id === id)
        return label ? { id: label.id, color: label.color || '#3B82F6', name: label.name } : null
      })
      .filter(Boolean)
  }

  return (
    <div className="label-selector" ref={dropdownRef}>
      <div 
        className={`label-selector-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="label-selector-display">
          {selectedLabels.length > 0 ? (
            <div className="selected-labels-preview">
              {getSelectedLabelColors().slice(0, 3).map((label) => (
                <span
                  key={label.id}
                  className="label-preview-chip"
                  style={{ backgroundColor: label.color }}
                  title={label.name}
                />
              ))}
              {selectedLabels.length > 3 && (
                <span className="label-preview-count">+{selectedLabels.length - 3}</span>
              )}
            </div>
          ) : (
            <span className="label-selector-placeholder">{getSelectedLabelNames()}</span>
          )}
        </div>
        <span className={`label-selector-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>

      {isOpen && !disabled && (
        <div className="label-selector-dropdown">
          {isLoading ? (
            <div className="label-selector-loading">
              <span className="material-symbols-outlined loading-spinner">hourglass_empty</span>
              Loading labels...
            </div>
          ) : labels.length === 0 ? (
            <div className="label-selector-empty">
              <span className="material-symbols-outlined">label_off</span>
              No labels available
            </div>
          ) : (
            <>
              <div className="label-selector-actions">
                <button
                  type="button"
                  className="label-selector-select-all"
                  onClick={toggleSelectAll}
                >
                  {selectedLabels.length === labels.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="label-selector-list">
                {labels.map((label) => {
                  const isSelected = selectedLabels.includes(label.id)
                  return (
                    <div
                      key={label.id}
                      className={`label-selector-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleLabel(label.id)}
                    >
                      <div className="label-selector-checkbox">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleLabel(label.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="checkbox-custom"></span>
                      </div>
                      <div 
                        className="label-selector-color"
                        style={{ backgroundColor: label.color || '#3B82F6' }}
                      />
                      <div className="label-selector-info">
                        <div className="label-selector-name">{label.name}</div>
                        {label.description && (
                          <div className="label-selector-description">{label.description}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default LabelSelector

