import React, { useState, useEffect } from 'react'
import Page from '../Page'
import Modal from '../Modal'
import Button from '../Button'
import AreYouSureModal from '../AreYouSureModal'
import { useToast } from '../ToastProvider'
import { useAuth } from '../security/AuthContext'
import { useUserConfig } from '../UserConfigContext'
import { getApiUrl } from '../../config/api'
import './UserConfigurationManager.css'

const UserConfigurationManager = ({
  onUserSetup,
  onNavigateToWelcome,
  onNavigateToPlayer,
  onShowCards,
  onNavigateToUserManagement,
  onNavigateToManagement,
  onNavigateToChat,
  onNavigateToWordList
}) => {
  const { showSuccess, showError } = useToast()
  const { authenticatedFetch, user } = useAuth()
  const { configs, isLoading, invalidateAndReload } = useUserConfig()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState(null)
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    configId: null,
    configName: ''
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    value_type: 'string',
    value: ''
  })

  const userId = user?.email || user?.id

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      label: '',
      value_type: 'string',
      value: ''
    })
  }

  // Open add modal
  const handleOpenAddModal = () => {
    resetForm()
    setIsAddModalOpen(true)
  }

  // Close add modal
  const handleCloseAddModal = () => {
    setIsAddModalOpen(false)
    resetForm()
  }

  // Open edit modal
  const handleEditConfig = (config) => {
    setEditingConfig(config)
    setFormData({
      name: config.name,
      label: config.label,
      value_type: config.value_type,
      value: config.value
    })
    setIsEditModalOpen(true)
  }

  // Close edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingConfig(null)
    resetForm()
  }

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Create configuration
  const handleCreateConfig = async () => {
    if (!formData.name || !formData.label) {
      showError('Name and label are required')
      return
    }

    setIsSaving(true)
    try {
      const response = await authenticatedFetch(getApiUrl('/api/user-configs'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        mode: 'cors'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        showSuccess('Configuration created successfully!')
        handleCloseAddModal()
        // Invalidate and reload configs from context
        await invalidateAndReload()
      } else {
        throw new Error(data.error || 'Failed to create configuration')
      }
    } catch (error) {
      console.error('Error creating configuration:', error)
      showError(`Failed to create configuration: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Update configuration
  const handleUpdateConfig = async () => {
    if (!editingConfig || !formData.name || !formData.label) {
      showError('Name and label are required')
      return
    }

    setIsSaving(true)
    try {
      const response = await authenticatedFetch(getApiUrl(`/api/user-configs/${editingConfig.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        mode: 'cors'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        showSuccess('Configuration updated successfully!')
        handleCloseEditModal()
        // Invalidate and reload configs from context
        await invalidateAndReload()
      } else {
        throw new Error(data.error || 'Failed to update configuration')
      }
    } catch (error) {
      console.error('Error updating configuration:', error)
      showError(`Failed to update configuration: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Open delete modal
  const handleOpenDeleteModal = (config) => {
    setDeleteModalState({
      isOpen: true,
      configId: config.id,
      configName: config.name
    })
  }

  // Close delete modal
  const handleCloseDeleteModal = () => {
    setDeleteModalState({
      isOpen: false,
      configId: null,
      configName: ''
    })
  }

  // Delete configuration
  const handleDeleteConfig = async () => {
    if (!deleteModalState.configId) return

    setIsDeleting(true)
    try {
      const response = await authenticatedFetch(getApiUrl(`/api/user-configs/${deleteModalState.configId}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        showSuccess('Configuration deleted successfully!')
        handleCloseDeleteModal()
        // Invalidate and reload configs from context
        await invalidateAndReload()
      } else {
        throw new Error(data.error || 'Failed to delete configuration')
      }
    } catch (error) {
      console.error('Error deleting configuration:', error)
      showError(`Failed to delete configuration: ${error.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  // Format value based on type
  const formatValue = (value, valueType) => {
    if (!value) return ''
    
    try {
      if (valueType === 'json') {
        return JSON.stringify(JSON.parse(value), null, 2)
      }
      if (valueType === 'boolean') {
        return value === 'true' ? 'Yes' : 'No'
      }
      return value
    } catch {
      return value
    }
  }

  // Get value type display name
  const getValueTypeDisplay = (type) => {
    const types = {
      string: 'Text',
      number: 'Number',
      boolean: 'Boolean',
      json: 'JSON'
    }
    return types[type] || type
  }

  if (!userId) {
    return (
      <Page
        isCardsView={false}
        onUserSetup={onUserSetup}
        onToggleCardsView={() => {}}
        onNavigateToWelcome={onNavigateToWelcome}
        onNavigateToPlayer={onNavigateToPlayer}
        onShowCards={onShowCards}
        onNavigateToUserManagement={onNavigateToUserManagement}
        onNavigateToManagement={onNavigateToManagement}
        onNavigateToChat={onNavigateToChat}
        onNavigateToWordList={onNavigateToWordList}
      >
        <div className="user-config-manager-container">
          <div className="user-config-card">
            <h3>
              <span className="material-symbols-outlined">settings</span>
              User Configurations
            </h3>
            <div className="no-user-message">
              <p>Please log in to manage your configurations.</p>
            </div>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page
      isCardsView={false}
      onUserSetup={onUserSetup}
      onToggleCardsView={() => {}}
      onNavigateToWelcome={onNavigateToWelcome}
      onNavigateToPlayer={onNavigateToPlayer}
      onShowCards={onShowCards}
      onNavigateToUserManagement={onNavigateToUserManagement}
      onNavigateToManagement={onNavigateToManagement}
      onNavigateToChat={onNavigateToChat}
    >
      <div className="user-config-manager-container">
        <div className="user-config-card">
          <div className="config-header">
            <h3>
              <span className="material-symbols-outlined">settings</span>
              User Configurations
            </h3>
            <Button
              onClick={handleOpenAddModal}
              variant="primary"
              size="medium"
              iconName="add"
            >
              Add Configuration
            </Button>
          </div>

          {isLoading ? (
            <div className="loading-message">
              <p>Loading configurations...</p>
            </div>
          ) : configs.length === 0 ? (
            <div className="no-configs-message">
              <p>No configurations found. Create your first configuration to get started!</p>
            </div>
          ) : (
            <div className="configs-list">
              {configs.map((config) => (
                <div key={config.id} className="config-item">
                  <div className="config-info">
                    <div className="config-header-top">
                      <div className="config-name">{config.name}</div>
                      <div className="config-type-badge">{getValueTypeDisplay(config.value_type)}</div>
                    </div>
                    <div className="config-label">{config.label}</div>
                    <div className="config-value">
                      <span className="config-value-label">Value:</span>
                      <span className="config-value-text">{formatValue(config.value, config.value_type)}</span>
                    </div>
                    <div className="config-meta">
                      <span className="config-date">
                        Created: {new Date(config.created_at).toLocaleDateString()}
                      </span>
                      {config.updated_at !== config.created_at && (
                        <span className="config-date">
                          Updated: {new Date(config.updated_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="config-actions">
                    <button
                      className="btn-edit-config"
                      onClick={() => handleEditConfig(config)}
                      title="Edit configuration"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      className="btn-delete-config"
                      onClick={() => handleOpenDeleteModal(config)}
                      title="Delete configuration"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Configuration Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        title="Add Configuration"
        size="medium"
        footer={
          <div className="modal-buttons modal-buttons-right">
            <Button
              onClick={handleCloseAddModal}
              variant="secondary"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateConfig}
              variant="primary"
              disabled={isSaving || !formData.name || !formData.label}
            >
              {isSaving ? 'Creating...' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="config-form">
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter configuration name"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="label">Label *</label>
            <input
              type="text"
              id="label"
              name="label"
              value={formData.label}
              onChange={handleInputChange}
              placeholder="Enter display label"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="value_type">Value Type</label>
            <select
              id="value_type"
              name="value_type"
              value={formData.value_type}
              onChange={handleInputChange}
            >
              <option value="string">Text</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="value">Value</label>
            {formData.value_type === 'boolean' ? (
              <select
                id="value"
                name="value"
                value={formData.value}
                onChange={handleInputChange}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : formData.value_type === 'json' ? (
              <textarea
                id="value"
                name="value"
                value={formData.value}
                onChange={handleInputChange}
                placeholder='Enter JSON value, e.g., {"key": "value"}'
                rows="6"
              />
            ) : (
              <input
                type={formData.value_type === 'number' ? 'number' : 'text'}
                id="value"
                name="value"
                value={formData.value}
                onChange={handleInputChange}
                placeholder={`Enter ${formData.value_type} value`}
              />
            )}
          </div>
        </div>
      </Modal>

      {/* Edit Configuration Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title="Edit Configuration"
        size="medium"
        footer={
          <div className="modal-buttons modal-buttons-right">
            <Button
              onClick={handleCloseEditModal}
              variant="secondary"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateConfig}
              variant="primary"
              disabled={isSaving || !formData.name || !formData.label}
            >
              {isSaving ? 'Updating...' : 'Update'}
            </Button>
          </div>
        }
      >
        <div className="config-form">
          <div className="form-group">
            <label htmlFor="edit-name">Name *</label>
            <input
              type="text"
              id="edit-name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter configuration name"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-label">Label *</label>
            <input
              type="text"
              id="edit-label"
              name="label"
              value={formData.label}
              onChange={handleInputChange}
              placeholder="Enter display label"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-value_type">Value Type</label>
            <select
              id="edit-value_type"
              name="value_type"
              value={formData.value_type}
              onChange={handleInputChange}
            >
              <option value="string">Text</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="edit-value">Value</label>
            {formData.value_type === 'boolean' ? (
              <select
                id="edit-value"
                name="value"
                value={formData.value}
                onChange={handleInputChange}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : formData.value_type === 'json' ? (
              <textarea
                id="edit-value"
                name="value"
                value={formData.value}
                onChange={handleInputChange}
                placeholder='Enter JSON value, e.g., {"key": "value"}'
                rows="6"
              />
            ) : (
              <input
                type={formData.value_type === 'number' ? 'number' : 'text'}
                id="edit-value"
                name="value"
                value={formData.value}
                onChange={handleInputChange}
                placeholder={`Enter ${formData.value_type} value`}
              />
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <AreYouSureModal
        isOpen={deleteModalState.isOpen}
        question={`Delete the configuration "${deleteModalState.configName || 'this configuration'}"?`}
        description="This action cannot be undone."
        confirmLabel={isDeleting ? 'Deleting...' : 'Yes, delete'}
        onConfirm={handleDeleteConfig}
        onCancel={handleCloseDeleteModal}
        isConfirming={isDeleting}
      />
    </Page>
  )
}

export default UserConfigurationManager

