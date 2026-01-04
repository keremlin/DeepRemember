import React, { useState, useEffect, useRef } from 'react'
import { useToast } from '../ToastProvider'
import { getApiUrl } from '../../config/api'
import { useWordBase } from './WordBaseContext'
import Page from '../Page'
import Button from '../Button'
import Modal from '../Modal'
import AreYouSureModal from '../AreYouSureModal'
import EditWordModal from './EditWordModal'
import './WordList.css'

const WordList = ({
  onNavigateToWelcome,
  onNavigateToPlayer,
  onShowCards,
  onNavigateToUserManagement,
  onNavigateToManagement,
  onNavigateToChat,
  onNavigateToWordList,
  onNavigateToCourses
}) => {
  const { showSuccess, showError, showInfo } = useToast()
  const {
    words,
    groupedWords,
    alphabetGroups,
    isLoading,
    isInitialized,
    totalCount,
    invalidateAndReload,
    removeWordFromCache
  } = useWordBase()
  const [editingWord, setEditingWord] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    wordId: null,
    wordText: ''
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredGroupedWords, setFilteredGroupedWords] = useState({})
  const [filteredAlphabetGroups, setFilteredAlphabetGroups] = useState([])
  const scrollContainerRef = useRef(null)

  // In-memory search/filter
  useEffect(() => {
    if (!searchTerm.trim()) {
      // No search term, show all words
      setFilteredGroupedWords(groupedWords)
      setFilteredAlphabetGroups(alphabetGroups)
      return
    }

    // Filter words based on search term (case-insensitive)
    const searchLower = searchTerm.toLowerCase().trim()
    const filtered = {}
    const filteredGroups = []

    Object.keys(groupedWords).forEach(group => {
      const groupWords = groupedWords[group].filter(word => {
        const wordText = (word.word || '').toLowerCase()
        const translate = (word.translate || '').toLowerCase()
        const sampleSentence = (word.sample_sentence || '').toLowerCase()
        const meaning = (word.meaning || '').toLowerCase()
        const typeOfWord = (word.type_of_word || '').toLowerCase()
        
        return wordText.includes(searchLower) ||
               translate.includes(searchLower) ||
               sampleSentence.includes(searchLower) ||
               meaning.includes(searchLower) ||
               typeOfWord.includes(searchLower)
      })

      if (groupWords.length > 0) {
        // Sort words alphabetically within each filtered group
        groupWords.sort((a, b) => {
          const wordA = (a.word || '').toLowerCase()
          const wordB = (b.word || '').toLowerCase()
          return wordA.localeCompare(wordB)
        })
        filtered[group] = groupWords
        filteredGroups.push(group)
      }
    })

    filteredGroups.sort()
    setFilteredGroupedWords(filtered)
    setFilteredAlphabetGroups(filteredGroups)
  }, [searchTerm, groupedWords, alphabetGroups])

  // Initialize Bootstrap scrollspy after words are loaded
  useEffect(() => {
    if (alphabetGroups.length > 0 && typeof window !== 'undefined' && window.bootstrap) {
      // Wait for DOM to update
      const timer = setTimeout(() => {
        const scrollSpyElement = scrollContainerRef.current
        if (scrollSpyElement) {
          try {
            const scrollSpy = new window.bootstrap.ScrollSpy(scrollSpyElement, {
              target: '#word-nav',
              offset: 100
            })
            
            return () => {
              if (scrollSpy) {
                scrollSpy.dispose()
              }
            }
          } catch (error) {
            console.warn('Failed to initialize scrollspy:', error)
          }
        }
      }, 100)
      
      return () => {
        clearTimeout(timer)
      }
    }
  }, [alphabetGroups])

  // Handle edit word
  const handleEdit = (word) => {
    setEditingWord(word)
    setIsEditModalOpen(true)
  }

  // Handle delete word
  const handleDelete = (word) => {
    setDeleteModalState({
      isOpen: true,
      wordId: word.id,
      wordText: word.word
    })
  }

  // Confirm delete
  const confirmDelete = async () => {
    if (!deleteModalState.wordId) return

    setIsDeleting(true)
    try {
      const response = await fetch(getApiUrl(`/api/word-base/${deleteModalState.wordId}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        showSuccess('Word deleted successfully!')
        // Update cache instead of reloading
        removeWordFromCache(deleteModalState.wordId)
        setDeleteModalState({ isOpen: false, wordId: null, wordText: '' })
      } else {
        throw new Error(data.error || 'Failed to delete word')
      }
    } catch (error) {
      console.error('Error deleting word:', error)
      showError(`Failed to delete word: ${error.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle word updated
  const handleWordUpdated = () => {
    // Cache will be updated by EditWordModal after successful update
    setIsEditModalOpen(false)
    setEditingWord(null)
  }

  return (
    <Page
      onNavigateToWelcome={onNavigateToWelcome}
      onNavigateToPlayer={onNavigateToPlayer}
      onShowCards={onShowCards}
      onNavigateToUserManagement={onNavigateToUserManagement}
      onNavigateToManagement={onNavigateToManagement}
      onNavigateToChat={onNavigateToChat}
      onNavigateToWordList={onNavigateToWordList}
      onNavigateToCourses={onNavigateToCourses}
    >
      <div className="word-list-container" style={{ position: 'relative' }}>
        <div className="word-list-header">
          <h1 className="word-list-title">
            <span className="material-symbols-outlined">menu_book</span>
            Word Base
          </h1>
          <div className="word-list-controls">
            <div className="word-list-search">
              <span className="material-symbols-outlined search-icon">search</span>
              <input
                type="text"
                className="word-list-search-input"
                placeholder="Search words..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="word-list-count">
              <span className="material-symbols-outlined">numbers</span>
              <span className="word-count-text">{totalCount || words.length} words</span>
            </div>
            <Button
              onClick={invalidateAndReload}
              variant="secondary"
              size="medium"
              iconName="refresh"
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {isLoading || !isInitialized ? (
          <div className="word-list-loading">
            <span className="material-symbols-outlined">hourglass_empty</span>
            Loading words...
          </div>
        ) : (searchTerm.trim() ? filteredAlphabetGroups : alphabetGroups).length === 0 ? (
          <div className="word-list-empty">
            <span className="material-symbols-outlined">inbox</span>
            {searchTerm.trim() ? 'No words found matching your search' : 'No words found'}
          </div>
        ) : (
          <div className="word-list-content">
            {/* Scrollspy Navigation */}
            <nav id="word-nav" className="word-nav">
              <div className="word-nav-header">
                <span className="material-symbols-outlined">list</span>
                Alphabet Groups
              </div>
              <ul className="word-nav-list">
                {(searchTerm.trim() ? filteredAlphabetGroups : alphabetGroups).map(group => {
                  const wordsToShow = searchTerm.trim() ? filteredGroupedWords[group] : groupedWords[group]
                  const sortedWords = wordsToShow ? [...wordsToShow].sort((a, b) => {
                    const wordA = (a.word || '').toLowerCase().trim()
                    const wordB = (b.word || '').toLowerCase().trim()
                    return wordA.localeCompare(wordB)
                  }) : []
                  return (
                    <li key={group} className="word-nav-item">
                      <a 
                        className="word-nav-link" 
                        href={`#group-${group}`}
                      >
                        {group}
                        <span className="word-count">({sortedWords?.length || 0})</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </nav>

            {/* Words Content */}
            <div className="word-list-sections" ref={scrollContainerRef} data-bs-spy="scroll" data-bs-target="#word-nav" data-bs-offset="100">
              {(searchTerm.trim() ? filteredAlphabetGroups : alphabetGroups).map(group => {
                const wordsToShow = searchTerm.trim() ? filteredGroupedWords[group] : groupedWords[group]
                // Ensure words are sorted alphabetically by word field
                const sortedWords = wordsToShow ? [...wordsToShow].sort((a, b) => {
                  const wordA = (a.word || '').toLowerCase().trim()
                  const wordB = (b.word || '').toLowerCase().trim()
                  return wordA.localeCompare(wordB)
                }) : []
                return (
                  <section 
                    key={group} 
                    id={`group-${group}`} 
                    className="word-group-section"
                  >
                    <h2 className="word-group-title">
                      <span className="material-symbols-outlined">label</span>
                      {group}
                      <span className="word-group-count">({sortedWords?.length || 0} words)</span>
                    </h2>
                    
                    <div className="word-items">
                      {sortedWords?.map(word => (
                      <div key={word.id} className="word-item">
                        <div className="word-item-content">
                          <div className="word-item-main">
                            <h3 className="word-item-word">{word.word}</h3>
                            {word.translate && (
                              <p className="word-item-translate">{word.translate}</p>
                            )}
                            {word.sample_sentence && (
                              <p className="word-item-sentence">{word.sample_sentence}</p>
                            )}
                            <div className="word-item-meta">
                              <span className="word-item-type">{word.type_of_word}</span>
                              {word.article && (
                                <span className="word-item-article">{word.article}</span>
                              )}
                              {word.plural_sign && (
                                <span className="word-item-plural">{word.plural_sign}</span>
                              )}
                            </div>
                          </div>
                          <div className="word-item-actions">
                            <Button
                              onClick={() => handleEdit(word)}
                              variant="secondary"
                              size="small"
                              iconName="edit"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => handleDelete(word)}
                              variant="danger"
                              size="small"
                              iconName="delete"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                )
              })}
            </div>
          </div>
        )}

        {/* Edit Word Modal */}
        <EditWordModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingWord(null)
          }}
          word={editingWord}
          onWordUpdated={handleWordUpdated}
        />

        {/* Delete Confirmation Modal */}
        <AreYouSureModal
          isOpen={deleteModalState.isOpen}
          title="Delete Word"
          question={`Are you sure you want to delete "${deleteModalState.wordText}"?`}
          description="This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteModalState({ isOpen: false, wordId: null, wordText: '' })}
          isConfirming={isDeleting}
          confirmButtonVariant="danger"
        />
      </div>
    </Page>
  )
}

export default WordList

