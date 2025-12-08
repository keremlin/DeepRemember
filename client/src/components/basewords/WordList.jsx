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
  onNavigateToUserManagement,
  onNavigateToManagement,
  onNavigateToChat,
  onNavigateToWordList
}) => {
  const { showSuccess, showError, showInfo } = useToast()
  const {
    words,
    groupedWords,
    alphabetGroups,
    isLoading,
    isInitialized,
    loadedGroups,
    loadingGroups,
    invalidateAndReload,
    loadGroupWords,
    isGroupLoaded,
    isGroupLoading,
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
  const [searchResults, setSearchResults] = useState(null) // API search results
  const [isSearching, setIsSearching] = useState(false)
  const [totalWordCount, setTotalWordCount] = useState(0)
  const scrollContainerRef = useRef(null)
  const searchTimeoutRef = useRef(null)

  // Load total word count from API
  useEffect(() => {
    const loadWordCount = async () => {
      try {
        const response = await fetch(getApiUrl('/api/word-base/count'), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          mode: 'cors'
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.count !== undefined) {
            setTotalWordCount(data.count)
          }
        }
      } catch (error) {
        console.error('Error loading word count:', error)
      }
    }

    if (isInitialized) {
      loadWordCount()
    }
  }, [isInitialized])

  // Perform API search when search term changes
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!searchTerm.trim()) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }

    // Debounce search by 300ms
    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const encodedSearch = encodeURIComponent(searchTerm.trim())
        const response = await fetch(getApiUrl(`/api/word-base?search=${encodedSearch}`), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          mode: 'cors'
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        
        if (data.success && data.words) {
          // Group search results
          const grouped = {}
          const groups = []
          
          data.words.forEach(word => {
            const group = word.groupAlphabetName || word.group_alphabet_name || 'Unknown'
            if (!grouped[group]) {
              grouped[group] = []
              groups.push(group)
            }
            grouped[group].push(word)
          })
          
          groups.sort()
          
          setSearchResults({
            words: data.words,
            groupedWords: grouped,
            alphabetGroups: groups,
            count: data.words.length
          })
        } else {
          setSearchResults({
            words: [],
            groupedWords: {},
            alphabetGroups: [],
            count: 0
          })
        }
      } catch (error) {
        console.error('Error searching words:', error)
        setSearchResults({
          words: [],
          groupedWords: {},
          alphabetGroups: [],
          count: 0
        })
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm])

  // Determine which data to use (search results or context)
  const displayGroupedWords = searchTerm.trim() && searchResults 
    ? searchResults.groupedWords 
    : groupedWords
  const displayAlphabetGroups = searchTerm.trim() && searchResults 
    ? searchResults.alphabetGroups 
    : alphabetGroups
  const displayWordCount = searchTerm.trim() && searchResults 
    ? searchResults.count 
    : totalWordCount || words.length

  // Load first 3 alphabet groups automatically on initial load
  useEffect(() => {
    // Only load when initialized, have groups, not searching, and haven't loaded any groups yet
    if (!isInitialized || alphabetGroups.length === 0 || searchTerm.trim()) return
    
    // Check if we've already loaded some groups (to avoid reloading on every render)
    const hasLoadedGroups = loadedGroups.size > 0
    
    // Only auto-load if no groups are loaded yet (first load)
    if (!hasLoadedGroups) {
      // Load first 3 groups automatically
      const firstThreeGroups = alphabetGroups.slice(0, 3)
      firstThreeGroups.forEach(group => {
        if (!isGroupLoaded(group) && !isGroupLoading(group)) {
          loadGroupWords(group)
        }
      })
    }
  }, [isInitialized, alphabetGroups, isGroupLoaded, isGroupLoading, loadGroupWords, searchTerm, loadedGroups])

  // Intersection Observer to load groups as they come into view (only when not searching)
  useEffect(() => {
    if (!isInitialized || alphabetGroups.length === 0 || searchTerm.trim()) return

    const observerOptions = {
      root: null, // Use viewport as root
      rootMargin: '200px', // Load 200px before the section comes into view
      threshold: 0.1
    }

    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id
          const groupName = sectionId.replace('group-', '')
          
          // Load the group if it's not already loaded or loading
          if (groupName && !isGroupLoaded(groupName) && !isGroupLoading(groupName)) {
            loadGroupWords(groupName)
          }
        }
      })
    }

    const observer = new IntersectionObserver(observerCallback, observerOptions)

    // Observe all group sections after a short delay to ensure DOM is ready
    const timer = setTimeout(() => {
      alphabetGroups.forEach(group => {
        const sectionElement = document.getElementById(`group-${group}`)
        if (sectionElement) {
          observer.observe(sectionElement)
        }
      })
    }, 100)

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [alphabetGroups, isInitialized, isGroupLoaded, isGroupLoading, loadGroupWords, searchTerm])

  // Initialize Bootstrap scrollspy after words are loaded or filtered
  useEffect(() => {
    if (alphabetGroups.length > 0 && typeof window !== 'undefined' && window.bootstrap) {
      // Wait for DOM to update
      const timer = setTimeout(() => {
        const scrollSpyElement = scrollContainerRef.current
        if (scrollSpyElement) {
          try {
            // Dispose existing scrollspy if any
            const existingScrollSpy = window.bootstrap.ScrollSpy.getInstance(scrollSpyElement)
            if (existingScrollSpy) {
              existingScrollSpy.dispose()
            }
            
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
      onNavigateToUserManagement={onNavigateToUserManagement}
      onNavigateToManagement={onNavigateToManagement}
      onNavigateToChat={onNavigateToChat}
      onNavigateToWordList={onNavigateToWordList}
    >
      <div className="word-list-container" ref={scrollContainerRef} data-bs-spy="scroll" data-bs-target="#word-nav" data-bs-offset="100" style={{ position: 'relative' }}>
        <div className="word-list-header">
          <h1 className="word-list-title">
            <span className="material-symbols-outlined">menu_book</span>
            Word Base
          </h1>
          <div className="word-list-header-actions">
            <div className="word-list-search-container">
              <span className="material-symbols-outlined word-list-search-icon">search</span>
              <input
                type="text"
                className="word-list-search-input"
                placeholder="Search words..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="word-list-search-clear"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>
            <div className="word-list-count">
              <span className="material-symbols-outlined">inventory</span>
              <span className="word-list-count-text">
                {searchTerm ? displayWordCount : displayWordCount} {searchTerm ? 'found' : 'words'}
              </span>
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

        {(isLoading || isSearching || !isInitialized) ? (
          <div className="word-list-loading">
            <span className="material-symbols-outlined">hourglass_empty</span>
            {isSearching ? 'Searching...' : 'Loading words...'}
          </div>
        ) : alphabetGroups.length === 0 ? (
          <div className="word-list-empty">
            <span className="material-symbols-outlined">search_off</span>
            No alphabet groups found
          </div>
        ) : displayAlphabetGroups.length === 0 ? (
          <div className="word-list-empty">
            <span className="material-symbols-outlined">search_off</span>
            {searchTerm ? `No words found matching "${searchTerm}"` : 'No words found'}
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
                {alphabetGroups.map(group => (
                  <li key={group} className="word-nav-item">
                    <a 
                      className="word-nav-link" 
                      href={`#group-${group}`}
                    >
                      {group}
                      <span className="word-count">
                        {displayGroupedWords[group]?.length || (isGroupLoading(group) ? '...' : 0)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Words Content */}
            <div className="word-list-sections">
              {alphabetGroups.map(group => {
                // When searching, all results are already loaded from API
                const isSearchMode = searchTerm.trim() && searchResults
                const isLoaded = isSearchMode ? true : isGroupLoaded(group)
                const isLoading = isSearchMode ? false : isGroupLoading(group)
                const groupWords = displayGroupedWords[group] || []
                
                return (
                  <section 
                    key={group} 
                    id={`group-${group}`} 
                    className="word-group-section"
                  >
                    <h2 className="word-group-title">
                      <span className="material-symbols-outlined">label</span>
                      {group}
                      <span className="word-group-count">
                        {isLoading ? (
                          <span className="word-group-loading">
                            <span className="material-symbols-outlined">hourglass_empty</span>
                            Loading...
                          </span>
                        ) : (
                          `(${groupWords.length} words)`
                        )}
                      </span>
                    </h2>
                    
                    {isLoading && groupWords.length === 0 ? (
                      <div className="word-group-loading-placeholder">
                        <span className="material-symbols-outlined">hourglass_empty</span>
                        Loading words...
                      </div>
                    ) : (
                      <div className="word-items">
                        {groupWords.map(word => (
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
                    )}
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

