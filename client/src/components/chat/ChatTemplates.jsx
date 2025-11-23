import React, { useState, useEffect } from 'react'
import Page from '../Page'
import Modal from '../Modal'
import Button from '../Button'
import AreYouSureModal from '../AreYouSureModal'
import { useToast } from '../ToastProvider'
import { useAuth } from '../security/AuthContext'
import { getApiUrl } from '../../config/api'
import './ChatTemplates.css'

const ChatTemplates = ({
  onUserSetup,
  onNavigateToWelcome,
  onNavigateToPlayer,
  onShowCards,
  onNavigateToUserManagement,
  onNavigateToManagement,
  onNavigateToChat
}) => {
  const { showSuccess, showError } = useToast()
  const { getAuthHeaders } = useAuth()
  const [templates, setTemplates] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showJsonModal, setShowJsonModal] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, template: null })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    thema: '',
    persons: '',
    scenario: '',
    questions_and_thema: '',
    words_to_use: '',
    words_not_to_use: '',
    grammar_to_use: '',
    level: ''
  })

  // Load templates on mount
  useEffect(() => {
    loadTemplates()
  }, [])

  // Reset form when modals close
  useEffect(() => {
    if (!showCreateModal && !showEditModal) {
      setFormData({
        thema: '',
        persons: '',
        scenario: '',
        questions_and_thema: '',
        words_to_use: '',
        words_not_to_use: '',
        grammar_to_use: '',
        level: ''
      })
      setEditingTemplate(null)
    }
  }, [showCreateModal, showEditModal])

  // Reset JSON input when modal closes
  useEffect(() => {
    if (!showJsonModal) {
      setJsonInput('')
    }
  }, [showJsonModal])

  const loadTemplates = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(getApiUrl('/api/chat-templates'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setTemplates(data.templates || [])
      } else {
        throw new Error(data.error || 'Failed to load templates')
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      showError(`Failed to load templates: ${error.message}`)
      setTemplates([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCreateTemplate = async (e) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch(getApiUrl('/api/chat-templates'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        showSuccess('Template created successfully!')
        setShowCreateModal(false)
        await loadTemplates()
      } else {
        throw new Error(data.error || 'Failed to create template')
      }
    } catch (error) {
      console.error('Error creating template:', error)
      showError(`Failed to create template: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditClick = (template) => {
    setEditingTemplate(template)
    setFormData({
      thema: template.thema || '',
      persons: template.persons || '',
      scenario: template.scenario || '',
      questions_and_thema: template.questions_and_thema || '',
      words_to_use: template.words_to_use || '',
      words_not_to_use: template.words_not_to_use || '',
      grammar_to_use: template.grammar_to_use || '',
      level: template.level || ''
    })
    setShowEditModal(true)
  }

  const handleUpdateTemplate = async (e) => {
    e.preventDefault()
    if (!editingTemplate) return

    setIsSaving(true)

    try {
      const response = await fetch(getApiUrl(`/api/chat-templates/${editingTemplate.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        showSuccess('Template updated successfully!')
        setShowEditModal(false)
        await loadTemplates()
      } else {
        throw new Error(data.error || 'Failed to update template')
      }
    } catch (error) {
      console.error('Error updating template:', error)
      showError(`Failed to update template: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClick = (template) => {
    setDeleteModalState({ isOpen: true, template })
  }

  const handleConfirmDelete = async () => {
    if (!deleteModalState.template) return

    setIsDeleting(true)
    try {
      const response = await fetch(getApiUrl(`/api/chat-templates/${deleteModalState.template.id}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        showSuccess('Template deleted successfully!')
        setDeleteModalState({ isOpen: false, template: null })
        await loadTemplates()
      } else {
        throw new Error(data.error || 'Failed to delete template')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      showError(`Failed to delete template: ${error.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setDeleteModalState({ isOpen: false, template: null })
  }

  const handleJsonImport = (e) => {
    e.preventDefault()
    
    if (!jsonInput.trim()) {
      showError('Please enter JSON data')
      return
    }

    try {
      const parsed = JSON.parse(jsonInput.trim())
      
      // Validate and map JSON to form data
      const mappedData = {
        thema: parsed.thema || parsed.theme || '',
        persons: parsed.persons || parsed.person || '',
        scenario: parsed.scenario || '',
        questions_and_thema: parsed.questions_and_thema || parsed.questionsAndThema || parsed.questions || '',
        words_to_use: parsed.words_to_use || parsed.wordsToUse || parsed.words_to_use || '',
        words_not_to_use: parsed.words_not_to_use || parsed.wordsNotToUse || parsed.words_not_to_use || '',
        grammar_to_use: parsed.grammar_to_use || parsed.grammarToUse || parsed.grammar || '',
        level: parsed.level || ''
      }

      // Validate level if provided
      if (mappedData.level && !['A1', 'A2', 'B1', 'B2', ''].includes(mappedData.level)) {
        showError('Invalid level. Must be A1, A2, B1, or B2')
        return
      }

      // Set form data and close JSON modal, open create modal
      setFormData(mappedData)
      setShowJsonModal(false)
      setShowCreateModal(true)
      showSuccess('JSON imported successfully!')
    } catch (error) {
      console.error('JSON parse error:', error)
      showError(`Invalid JSON format: ${error.message}`)
    }
  }

  const jsonExample = {
    thema: "Travel and Tourism",
    persons: "Tourist, Hotel Receptionist, Tour Guide",
    scenario: "A tourist is checking into a hotel and asking about local attractions",
    questions_and_thema: "What are the best places to visit? How do I get to the city center?",
    words_to_use: "hotel, reservation, check-in, attraction, museum",
    words_not_to_use: "slang, informal expressions",
    grammar_to_use: "Present tense, questions with 'how' and 'what'",
    level: "A2"
  }

  const renderTemplateForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit} className="chat-template-form">
      <div className="form-group">
        <label htmlFor="thema">The Thema:</label>
        <textarea
          id="thema"
          name="thema"
          value={formData.thema}
          onChange={handleInputChange}
          placeholder="Enter the theme"
          rows="3"
          disabled={isSaving}
        />
      </div>

      <div className="form-group">
        <label htmlFor="persons">The Persons:</label>
        <textarea
          id="persons"
          name="persons"
          value={formData.persons}
          onChange={handleInputChange}
          placeholder="Enter the persons"
          rows="3"
          disabled={isSaving}
        />
      </div>

      <div className="form-group">
        <label htmlFor="scenario">The Scenario:</label>
        <textarea
          id="scenario"
          name="scenario"
          value={formData.scenario}
          onChange={handleInputChange}
          placeholder="Enter the scenario"
          rows="3"
          disabled={isSaving}
        />
      </div>

      <div className="form-group">
        <label htmlFor="questions_and_thema">Questions and Thema:</label>
        <textarea
          id="questions_and_thema"
          name="questions_and_thema"
          value={formData.questions_and_thema}
          onChange={handleInputChange}
          placeholder="Enter questions and theme"
          rows="3"
          disabled={isSaving}
        />
      </div>

      <div className="form-group">
        <label htmlFor="words_to_use">Words you should use (if empty free to use any word):</label>
        <textarea
          id="words_to_use"
          name="words_to_use"
          value={formData.words_to_use}
          onChange={handleInputChange}
          placeholder="Enter words to use (comma separated)"
          rows="2"
          disabled={isSaving}
        />
      </div>

      <div className="form-group">
        <label htmlFor="words_not_to_use">Words should not use:</label>
        <textarea
          id="words_not_to_use"
          name="words_not_to_use"
          value={formData.words_not_to_use}
          onChange={handleInputChange}
          placeholder="Enter words not to use (comma separated)"
          rows="2"
          disabled={isSaving}
        />
      </div>

      <div className="form-group">
        <label htmlFor="grammar_to_use">Grammar would use (if empty free to use any Grammar in the selected Level):</label>
        <textarea
          id="grammar_to_use"
          name="grammar_to_use"
          value={formData.grammar_to_use}
          onChange={handleInputChange}
          placeholder="Enter grammar to use"
          rows="2"
          disabled={isSaving}
        />
      </div>

      <div className="form-group">
        <label htmlFor="level">The Level:</label>
        <select
          id="level"
          name="level"
          value={formData.level}
          onChange={handleInputChange}
          disabled={isSaving}
        >
          <option value="">Select Level</option>
          <option value="A1">A1</option>
          <option value="A2">A2</option>
          <option value="B1">B1</option>
          <option value="B2">B2</option>
        </select>
      </div>

      <div className="form-actions">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setShowCreateModal(false)
            setShowEditModal(false)
          }}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  )

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
      <div className="chat-templates-container">
        <div className="chat-templates-card">
          <div className="chat-templates-header">
            <h3>
              <span className="material-symbols-outlined">chat_bubble_outline</span>
              Chat Templates
            </h3>
            <div className="header-actions">
              <Button
                variant="primary"
                size="medium"
                onClick={() => setShowCreateModal(true)}
                iconName="add"
                iconPosition="left"
              >
                New Temp
              </Button>
              <Button
                variant="secondary"
                size="medium"
                onClick={() => setShowJsonModal(true)}
                iconName="code"
                iconPosition="left"
              >
                Json Temp
              </Button>
              <button
                className="btn-refresh"
                onClick={() => loadTemplates()}
                disabled={isLoading}
                title="Refresh templates"
              >
                <span className="material-symbols-outlined">refresh</span>
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="loading-message">
              <p>Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="empty-state">
              <span className="material-symbols-outlined">chat_bubble_outline</span>
              <p>No templates found. Create your first template!</p>
            </div>
          ) : (
            <div className="templates-table-wrapper">
              <table className="templates-table">
                <thead>
                  <tr>
                    <th>Thema</th>
                    <th>Persons</th>
                    <th>Level</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id}>
                      <td>{template.thema || '-'}</td>
                      <td>{template.persons || '-'}</td>
                      <td>{template.level || '-'}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn-edit"
                            onClick={() => handleEditClick(template)}
                            title="Edit template"
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteClick(template)}
                            title="Delete template"
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Template Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Template"
        size="large"
      >
        {renderTemplateForm(handleCreateTemplate, 'Create Template')}
      </Modal>

      {/* Edit Template Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Template"
        size="large"
      >
        {renderTemplateForm(handleUpdateTemplate, 'Update Template')}
      </Modal>

      {/* JSON Import Modal */}
      <Modal
        isOpen={showJsonModal}
        onClose={() => setShowJsonModal(false)}
        title="Import Template from JSON"
        size="large"
      >
        <div className="json-import-content">
          <div className="json-format-info">
            <h4>JSON Format:</h4>
            <pre className="json-example">
{JSON.stringify(jsonExample, null, 2)}
            </pre>
          </div>
          <form onSubmit={handleJsonImport} className="json-import-form">
            <div className="form-group">
              <label htmlFor="jsonInput">Paste JSON here:</label>
              <textarea
                id="jsonInput"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste your JSON template here..."
                rows="12"
                className="json-textarea"
              />
            </div>
            <div className="form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowJsonModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
              >
                Import JSON
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <AreYouSureModal
        isOpen={deleteModalState.isOpen}
        question={`Delete this template?`}
        description="This action cannot be undone."
        confirmLabel={isDeleting ? 'Deleting...' : 'Yes, delete'}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isConfirming={isDeleting}
      />
    </Page>
  )
}

export default ChatTemplates

