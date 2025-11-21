import React, { useState, useEffect } from 'react'
import Modal from '../Modal'
import { useToast } from '../ToastProvider'
import { useAuth } from '../security/AuthContext'
import { getApiUrl } from '../../config/api'
import AreYouSureModal from '../AreYouSureModal'
import './LabelsModal.css'

/**
 * LabelsModal Component
 * Displays and manages user-defined labels (not system labels)
 * Inherits from Modal component
 */
const LabelsModal = ({ isOpen, onClose }) => {
  const { showSuccess, showError } = useToast()
  const { user, getAuthHeaders } = useAuth()
  const [labels, setLabels] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  // Form state for creating new label
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#3B82F6')
  const [newLabelDescription, setNewLabelDescription] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [labelToDelete, setLabelToDelete] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeletingLabel, setIsDeletingLabel] = useState(false)

  // Get current user ID
  const currentUserId = user?.email || user?.id || ''

  // Load labels when modal opens
  useEffect(() => {
    if (isOpen && currentUserId) {
      loadLabels()
    }
  }, [isOpen, currentUserId])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowCreateForm(false)
      setNewLabelName('')
      setNewLabelColor('#3B82F6')
      setNewLabelDescription('')
    }
  }, [isOpen])

  // Load user labels (filter out system labels)
  const loadLabels = async () => {
    if (!currentUserId) {
      showError('User ID not available')
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
      showError(`Failed to load labels: ${error.message}`)
      setLabels([])
    } finally {
      setIsLoading(false)
    }
  }

  // Create new label
  const handleCreateLabel = async (e) => {
    e.preventDefault()

    if (!newLabelName.trim()) {
      showError('Label name is required')
      return
    }

    if (!currentUserId) {
      showError('User ID not available')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch(getApiUrl(`/api/srs/labels/${currentUserId}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        mode: 'cors',
        body: JSON.stringify({
          name: newLabelName.trim(),
          color: newLabelColor,
          description: newLabelDescription.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        showSuccess('Label created successfully!')
        // Reset form
        setNewLabelName('')
        setNewLabelColor('#3B82F6')
        setNewLabelDescription('')
        setShowCreateForm(false)
        // Reload labels
        await loadLabels()
      } else {
        throw new Error(data.error || 'Failed to create label')
      }
    } catch (error) {
      console.error('Error creating label:', error)
      showError(`Failed to create label: ${error.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  // Delete label
  const handleDeleteLabel = (label) => {
    if (!currentUserId) {
      showError('User ID not available')
      return
    }
    setLabelToDelete(label)
    setIsDeleteModalOpen(true)
  }

  const deleteLabel = async (labelId) => {
    if (!labelId) return false

    try {
      const response = await fetch(getApiUrl(`/api/srs/labels/${currentUserId}/${labelId}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        mode: 'cors'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        showSuccess('Label deleted successfully!')
        // Reload labels
        await loadLabels()
        return true
      } else {
        throw new Error(data.error || 'Failed to delete label')
      }
    } catch (error) {
      console.error('Error deleting label:', error)
      showError(`Failed to delete label: ${error.message}`)
      return false
    }
  }

  const handleConfirmDeleteLabel = async () => {
    if (!labelToDelete?.id) return
    setIsDeletingLabel(true)
    try {
      await deleteLabel(labelToDelete.id)
    } finally {
      setIsDeletingLabel(false)
      setIsDeleteModalOpen(false)
      setLabelToDelete(null)
    }
  }

  const handleCancelDeleteLabel = () => {
    setIsDeleteModalOpen(false)
    setLabelToDelete(null)
  }

  // Predefined color options
  const colorOptions = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1', // Indigo
  ]

  const footer = (
    <div className="modal-buttons">
      <button 
        className="btn-modal btn-modal-secondary" 
        onClick={onClose}
        disabled={isCreating}
      >
        Close
      </button>
    </div>
  )

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined">label</span>
            My Labels
          </span>
        }
        size="medium"
        footer={footer}
      >
        <div className="labels-modal-content">
          {/* Create New Label Button */}
          {!showCreateForm && (
            <div className="labels-actions">
              <button
                className="btn-create-label"
                onClick={() => setShowCreateForm(true)}
                disabled={isLoading}
              >
                <span className="material-symbols-outlined">add</span>
                Create New Label
              </button>
            </div>
          )}

          {/* Create Label Form */}
          {showCreateForm && (
            <div className="create-label-form">
              <h4>Create New Label</h4>
              <form onSubmit={handleCreateLabel} className="modal-form">
                <div className="form-group">
                  <label htmlFor="labelName">Label Name *</label>
                  <input
                    type="text"
                    id="labelName"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder="Enter label name"
                    required
                    disabled={isCreating}
                    maxLength={50}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="labelColor">Color</label>
                  <div className="color-picker">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`color-option ${newLabelColor === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewLabelColor(color)}
                        disabled={isCreating}
                        title={color}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    id="labelColor"
                    value={newLabelColor}
                    onChange={(e) => setNewLabelColor(e.target.value)}
                    className="color-input"
                    disabled={isCreating}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="labelDescription">Description (Optional)</label>
                  <textarea
                    id="labelDescription"
                    value={newLabelDescription}
                    onChange={(e) => setNewLabelDescription(e.target.value)}
                    placeholder="Enter label description"
                    rows="3"
                    disabled={isCreating}
                    maxLength={200}
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-modal btn-modal-secondary"
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewLabelName('')
                      setNewLabelColor('#3B82F6')
                      setNewLabelDescription('')
                    }}
                    disabled={isCreating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-modal btn-modal-primary"
                    disabled={isCreating || !newLabelName.trim()}
                  >
                    {isCreating ? 'Creating...' : 'Create Label'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Labels List */}
          <div className="labels-list">
            {isLoading ? (
              <div className="labels-loading">
                <span className="material-symbols-outlined loading-spinner">hourglass_empty</span>
                <p>Loading labels...</p>
              </div>
            ) : labels.length === 0 ? (
              <div className="labels-empty">
                <span className="material-symbols-outlined">label_off</span>
                <p>No labels yet. Create your first label to get started!</p>
              </div>
            ) : (
              <div className="labels-grid">
                {labels.map((label) => (
                  <div key={label.id} className="label-item">
                    <div className="label-header">
                      <div 
                        className="label-color-indicator" 
                        style={{ backgroundColor: label.color || '#3B82F6' }}
                      />
                      <div className="label-info">
                        <div className="label-name">{label.name}</div>
                        {label.description && (
                          <div className="label-description">{label.description}</div>
                        )}
                      </div>
                    </div>
                    <button
                      className="btn-delete-label"
                      onClick={() => handleDeleteLabel(label)}
                      title="Delete label"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <AreYouSureModal
        isOpen={isDeleteModalOpen}
        question={`Delete the label "${labelToDelete?.name || 'this label'}"?`}
        description="This action cannot be undone."
        confirmLabel={isDeletingLabel ? 'Deleting...' : 'Yes, delete'}
        onConfirm={handleConfirmDeleteLabel}
        onCancel={handleCancelDeleteLabel}
        isConfirming={isDeletingLabel}
      />
    </>
  )
}

export default LabelsModal

