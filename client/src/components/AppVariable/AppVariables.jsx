import React, { useState, useEffect } from 'react'
import Page from '../Page'
import Modal from '../Modal'
import Button from '../Button'
import AreYouSureModal from '../AreYouSureModal'
import { useToast } from '../ToastProvider'
import { useAuth } from '../security/AuthContext'
import { getApiUrl } from '../../config/api'
import './AppVariables.css'

const AppVariables = ({
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
  const { authenticatedFetch } = useAuth()
  const [variables, setVariables] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingVariable, setEditingVariable] = useState(null)
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    keyname: null,
    variableKeyname: ''
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    keyname: '',
    value: '',
    type: 'text',
    description: ''
  })

  // Load variables
  const loadVariables = async () => {
    setIsLoading(true)
    try {
      const response = await authenticatedFetch(getApiUrl('/api/app-variables'), {
        method: 'GET',
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
        setVariables(data.variables || [])
      } else {
        throw new Error(data.error || 'Failed to load variables')
      }
    } catch (error) {
      console.error('Error loading variables:', error)
      showError(`Failed to load variables: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Load variables on mount
  useEffect(() => {
    loadVariables()
  }, [])

  // Reset form
  const resetForm = () => {
    setFormData({
      keyname: '',
      value: '',
      type: 'text',
      description: ''
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
  const handleEditVariable = (variable) => {
    setEditingVariable(variable)
    setFormData({
      keyname: variable.keyname,
      value: variable.value,
      type: variable.type,
      description: variable.description || ''
    })
    setIsEditModalOpen(true)
  }

  // Close edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingVariable(null)
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

  // Create variable
  const handleCreateVariable = async () => {
    if (!formData.keyname || !formData.type) {
      showError('Keyname and type are required')
      return
    }

    setIsSaving(true)
    try {
      const response = await authenticatedFetch(getApiUrl('/api/app-variables'), {
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
        showSuccess('Variable created successfully!')
        handleCloseAddModal()
        await loadVariables()
      } else {
        throw new Error(data.error || 'Failed to create variable')
      }
    } catch (error) {
      console.error('Error creating variable:', error)
      showError(`Failed to create variable: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Update variable
  const handleUpdateVariable = async () => {
    if (!editingVariable || !formData.keyname || !formData.type) {
      showError('Keyname and type are required')
      return
    }

    setIsSaving(true)
    try {
      const updateData = {
        value: formData.value,
        type: formData.type,
        description: formData.description
      }

      const response = await authenticatedFetch(
        getApiUrl(`/api/app-variables/keyname/${editingVariable.keyname}`), 
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
          mode: 'cors'
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        showSuccess('Variable updated successfully!')
        handleCloseEditModal()
        await loadVariables()
      } else {
        throw new Error(data.error || 'Failed to update variable')
      }
    } catch (error) {
      console.error('Error updating variable:', error)
      showError(`Failed to update variable: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Open delete modal
  const handleOpenDeleteModal = (variable) => {
    setDeleteModalState({
      isOpen: true,
      keyname: variable.keyname,
      variableKeyname: variable.keyname
    })
  }

  // Close delete modal
  const handleCloseDeleteModal = () => {
    setDeleteModalState({
      isOpen: false,
      keyname: null,
      variableKeyname: ''
    })
  }

  // Delete variable
  const handleDeleteVariable = async () => {
    if (!deleteModalState.keyname) return

    setIsDeleting(true)
    try {
      const response = await authenticatedFetch(
        getApiUrl(`/api/app-variables/keyname/${deleteModalState.keyname}`), 
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors'
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        showSuccess('Variable deleted successfully!')
        handleCloseDeleteModal()
        await loadVariables()
      } else {
        throw new Error(data.error || 'Failed to delete variable')
      }
    } catch (error) {
      console.error('Error deleting variable:', error)
      showError(`Failed to delete variable: ${error.message}`)
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
      return value
    } catch {
      return value
    }
  }

  // Get value type display name
  const getValueTypeDisplay = (type) => {
    const types = {
      text: 'Text',
      number: 'Number',
      json: 'JSON'
    }
    return types[type] || type
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
      onNavigateToWordList={onNavigateToWordList}
    >
      <div className="app-variables-container">
        <div className="app-variables-card">
          <div className="variables-header">
            <h3>
              <span className="material-symbols-outlined">code</span>
              App Variables
            </h3>
            <Button
              onClick={handleOpenAddModal}
              variant="primary"
              size="medium"
              iconName="add"
            >
              Add Variable
            </Button>
          </div>

          {isLoading ? (
            <div className="loading-message">
              <p>Loading variables...</p>
            </div>
          ) : variables.length === 0 ? (
            <div className="no-variables-message">
              <p>No variables found. Create your first variable to get started!</p>
            </div>
          ) : (
            <div className="variables-list">
              {variables.map((variable) => (
                <div key={variable.id} className="variable-item">
                  <div className="variable-info">
                    <div className="variable-header-top">
                      <div className="variable-keyname">{variable.keyname}</div>
                      <div className="variable-type-badge">{getValueTypeDisplay(variable.type)}</div>
                    </div>
                    {variable.description && (
                      <div className="variable-description">{variable.description}</div>
                    )}
                    <div className="variable-value">
                      <span className="variable-value-label">Value:</span>
                      <span className="variable-value-text">{formatValue(variable.value, variable.type)}</span>
                    </div>
                    <div className="variable-meta">
                      <span className="variable-date">
                        Created: {new Date(variable.create_date).toLocaleDateString()}
                      </span>
                      {variable.update_date !== variable.create_date && (
                        <span className="variable-date">
                          Updated: {new Date(variable.update_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="variable-actions">
                    <button
                      className="btn-edit-variable"
                      onClick={() => handleEditVariable(variable)}
                      title="Edit variable"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      className="btn-delete-variable"
                      onClick={() => handleOpenDeleteModal(variable)}
                      title="Delete variable"
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

      {/* Add Variable Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        title="Add Variable"
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
              onClick={handleCreateVariable}
              variant="primary"
              disabled={isSaving || !formData.keyname || !formData.type}
            >
              {isSaving ? 'Creating...' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="variable-form">
          <div className="form-group">
            <label htmlFor="keyname">Keyname *</label>
            <input
              type="text"
              id="keyname"
              name="keyname"
              value={formData.keyname}
              onChange={handleInputChange}
              placeholder="Enter variable keyname (unique)"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="type">Type *</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="value">Value</label>
            {formData.type === 'json' ? (
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
                type={formData.type === 'number' ? 'number' : 'text'}
                id="value"
                name="value"
                value={formData.value}
                onChange={handleInputChange}
                placeholder={`Enter ${formData.type} value`}
              />
            )}
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter optional description"
              rows="3"
            />
          </div>
        </div>
      </Modal>

      {/* Edit Variable Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title="Edit Variable"
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
              onClick={handleUpdateVariable}
              variant="primary"
              disabled={isSaving || !formData.keyname || !formData.type}
            >
              {isSaving ? 'Updating...' : 'Update'}
            </Button>
          </div>
        }
      >
        <div className="variable-form">
          <div className="form-group">
            <label htmlFor="edit-keyname">Keyname</label>
            <input
              type="text"
              id="edit-keyname"
              name="keyname"
              value={formData.keyname}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
            <small style={{ color: '#888', fontSize: '0.85rem' }}>Keyname cannot be changed</small>
          </div>
          <div className="form-group">
            <label htmlFor="edit-type">Type *</label>
            <select
              id="edit-type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="edit-value">Value</label>
            {formData.type === 'json' ? (
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
                type={formData.type === 'number' ? 'number' : 'text'}
                id="edit-value"
                name="value"
                value={formData.value}
                onChange={handleInputChange}
                placeholder={`Enter ${formData.type} value`}
              />
            )}
          </div>
          <div className="form-group">
            <label htmlFor="edit-description">Description</label>
            <textarea
              id="edit-description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter optional description"
              rows="3"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <AreYouSureModal
        isOpen={deleteModalState.isOpen}
        title="Delete Variable"
        question={`Are you sure you want to delete the variable "${deleteModalState.variableKeyname}"?`}
        description="This action cannot be undone."
        confirmLabel={isDeleting ? 'Deleting...' : 'Yes, delete'}
        onConfirm={handleDeleteVariable}
        onCancel={handleCloseDeleteModal}
        isConfirming={isDeleting}
        confirmButtonVariant="danger"
      />
    </Page>
  )
}

export default AppVariables


