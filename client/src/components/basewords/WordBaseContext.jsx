import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { getApiUrl } from '../../config/api'

const WordBaseContext = createContext()

export const useWordBase = () => {
  const context = useContext(WordBaseContext)
  if (!context) {
    throw new Error('useWordBase must be used within a WordBaseProvider')
  }
  return context
}

export const WordBaseProvider = ({ children }) => {
  const [words, setWords] = useState([])
  const [groupedWords, setGroupedWords] = useState({}) // Words grouped by groupAlphabetName
  const [alphabetGroups, setAlphabetGroups] = useState([]) // Sorted list of alphabet groups
  const [loadedGroups, setLoadedGroups] = useState(new Set()) // Track which groups are loaded
  const [loadingGroups, setLoadingGroups] = useState(new Set()) // Track which groups are currently loading
  const [wordsMap, setWordsMap] = useState({}) // Map for quick lookup by ID
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const loadingPromiseRef = useRef(null) // Prevent multiple simultaneous loads
  const groupLoadingPromisesRef = useRef({}) // Prevent multiple simultaneous loads for same group

  // Load alphabet groups list (lightweight - just group names)
  const loadAlphabetGroups = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/word-base/groups'), {
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
      
      if (data.success && data.groups) {
        const groups = data.groups || []
        groups.sort()
        setAlphabetGroups(groups)
        return { success: true, groups }
      } else {
        throw new Error(data.error || 'Failed to load alphabet groups')
      }
    } catch (error) {
      console.error('Error loading alphabet groups:', error)
      setAlphabetGroups([])
      return { success: false, error: error.message }
    }
  }, [])

  // Load words for a specific alphabet group
  const loadGroupWords = useCallback(async (groupName) => {
    // If already loaded, return immediately
    if (loadedGroups.has(groupName)) {
      return { success: true, cached: true }
    }

    // If currently loading, return the existing promise
    if (groupLoadingPromisesRef.current[groupName]) {
      return groupLoadingPromisesRef.current[groupName]
    }

    // Create the load promise
    const loadPromise = (async () => {
      setLoadingGroups(prev => new Set(prev).add(groupName))
      try {
        const encodedGroup = encodeURIComponent(groupName)
        const response = await fetch(getApiUrl(`/api/word-base/group/${encodedGroup}`), {
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
          const wordsList = data.words || []
          
          // Add words to the words array (avoid duplicates)
          setWords(prevWords => {
            const existingIds = new Set(prevWords.map(w => w.id))
            const newWords = wordsList.filter(w => !existingIds.has(w.id))
            return [...prevWords, ...newWords]
          })
          
          // Update words map
          setWordsMap(prevMap => {
            const newMap = { ...prevMap }
            wordsList.forEach(word => {
              newMap[word.id] = word
            })
            return newMap
          })
          
          // Add to grouped words
          setGroupedWords(prevGrouped => {
            const newGrouped = { ...prevGrouped }
            newGrouped[groupName] = wordsList
            return newGrouped
          })
          
          // Mark group as loaded
          setLoadedGroups(prev => new Set(prev).add(groupName))
          
          return { success: true, words: wordsList, count: wordsList.length }
        } else {
          throw new Error(data.error || 'Failed to load group words')
        }
      } catch (error) {
        console.error(`Error loading words for group "${groupName}":`, error)
        return { success: false, error: error.message }
      } finally {
        setLoadingGroups(prev => {
          const newSet = new Set(prev)
          newSet.delete(groupName)
          return newSet
        })
        delete groupLoadingPromisesRef.current[groupName]
      }
    })()

    groupLoadingPromisesRef.current[groupName] = loadPromise
    return loadPromise
  }, [loadedGroups])

  // Load words from API (legacy - for backward compatibility)
  const loadWords = useCallback(async (forceReload = false) => {
    // If already loading, return the existing promise
    if (loadingPromiseRef.current && !forceReload) {
      return loadingPromiseRef.current
    }

    // Create the load promise
    loadingPromiseRef.current = (async () => {
      setIsLoading(true)
      try {
        // First load alphabet groups
        await loadAlphabetGroups()
        
        setIsInitialized(true)
        return { success: true, count: 0 }
      } catch (error) {
        console.error('Error loading words:', error)
        setAlphabetGroups([])
        setIsInitialized(true)
        return { success: false, error: error.message }
      } finally {
        setIsLoading(false)
        loadingPromiseRef.current = null
      }
    })()

    return loadingPromiseRef.current
  }, [loadAlphabetGroups])

  // Invalidate and reload words from backend
  const invalidateAndReload = useCallback(async () => {
    return await loadWords(true)
  }, [loadWords])

  // Update a word in the cache after edit
  const updateWordInCache = useCallback((updatedWord) => {
    setWords(prevWords => {
      // Find the old word to get the old group
      const oldWord = prevWords.find(w => w.id === updatedWord.id)
      const oldGroup = oldWord?.groupAlphabetName || oldWord?.group_alphabet_name || 'Unknown'
      const newGroup = updatedWord.groupAlphabetName || updatedWord.group_alphabet_name || 'Unknown'
      
      // Update words array
      const updated = prevWords.map(word => 
        word.id === updatedWord.id ? updatedWord : word
      )
      
      // Update words map
      setWordsMap(prevMap => ({
        ...prevMap,
        [updatedWord.id]: updatedWord
      }))
      
      // Update grouped words
      if (oldGroup !== newGroup) {
        // Word moved to a different group, need to regroup
        setGroupedWords(prevGrouped => {
          const newGrouped = { ...prevGrouped }
          
          // Remove from old group
          if (newGrouped[oldGroup]) {
            newGrouped[oldGroup] = newGrouped[oldGroup].filter(w => w.id !== updatedWord.id)
            if (newGrouped[oldGroup].length === 0) {
              delete newGrouped[oldGroup]
              setAlphabetGroups(prevGroups => prevGroups.filter(g => g !== oldGroup))
            }
          }
          
          // Add to new group
          if (!newGrouped[newGroup]) {
            newGrouped[newGroup] = []
            setAlphabetGroups(prevGroups => {
              const newGroups = [...prevGroups]
              if (!newGroups.includes(newGroup)) {
                newGroups.push(newGroup)
                newGroups.sort()
              }
              return newGroups
            })
          }
          newGrouped[newGroup].push(updatedWord)
          
          return newGrouped
        })
      } else {
        // Same group, just update the word in that group
        setGroupedWords(prevGrouped => {
          const newGrouped = { ...prevGrouped }
          if (newGrouped[newGroup]) {
            newGrouped[newGroup] = newGrouped[newGroup].map(w => 
              w.id === updatedWord.id ? updatedWord : w
            )
          }
          return newGrouped
        })
      }
      
      return updated
    })
  }, [])

  // Remove a word from cache after delete
  const removeWordFromCache = useCallback((wordId) => {
    setWords(prevWords => {
      const wordToDelete = prevWords.find(w => w.id === wordId)
      if (!wordToDelete) return prevWords
      
      const updated = prevWords.filter(word => word.id !== wordId)
      
      // Update words map
      setWordsMap(prevMap => {
        const newMap = { ...prevMap }
        delete newMap[wordId]
        return newMap
      })
      
      // Remove from grouped words
      const group = wordToDelete.groupAlphabetName || wordToDelete.group_alphabet_name || 'Unknown'
      setGroupedWords(prevGrouped => {
        const newGrouped = { ...prevGrouped }
        if (newGrouped[group]) {
          newGrouped[group] = newGrouped[group].filter(w => w.id !== wordId)
          if (newGrouped[group].length === 0) {
            delete newGrouped[group]
            setAlphabetGroups(prevGroups => prevGroups.filter(g => g !== group))
          }
        }
        return newGrouped
      })
      
      return updated
    })
  }, [])

  // Add a word to cache after insert
  const addWordToCache = useCallback((newWord) => {
    setWords(prevWords => {
      const updated = [...prevWords, newWord]
      
      // Update words map
      setWordsMap(prevMap => ({
        ...prevMap,
        [newWord.id]: newWord
      }))
      
      // Add to grouped words
      const group = newWord.groupAlphabetName || newWord.group_alphabet_name || 'Unknown'
      setGroupedWords(prevGrouped => {
        const newGrouped = { ...prevGrouped }
        if (!newGrouped[group]) {
          newGrouped[group] = []
          setAlphabetGroups(prevGroups => {
            const newGroups = [...prevGroups]
            if (!newGroups.includes(group)) {
              newGroups.push(group)
              newGroups.sort()
            }
            return newGroups
          })
        }
        newGrouped[group].push(newWord)
        return newGrouped
      })
      
      return updated
    })
  }, [])

  // Get word by ID
  const getWordById = useCallback((wordId) => {
    return wordsMap[wordId] || null
  }, [wordsMap])

  // Get words by alphabet group
  const getWordsByGroup = useCallback((group) => {
    return groupedWords[group] || []
  }, [groupedWords])

  // Get all words
  const getAllWords = useCallback(() => {
    return words
  }, [words])

  // Get grouped words
  const getGroupedWords = useCallback(() => {
    return groupedWords
  }, [groupedWords])

  // Get alphabet groups
  const getAlphabetGroups = useCallback(() => {
    return alphabetGroups
  }, [alphabetGroups])

  // Load alphabet groups on mount (only once)
  useEffect(() => {
    if (!isInitialized && !isLoading) {
      loadWords()
    }
  }, [isInitialized, isLoading, loadWords])

  // Check if a group is loaded
  const isGroupLoaded = useCallback((groupName) => {
    return loadedGroups.has(groupName)
  }, [loadedGroups])

  // Check if a group is currently loading
  const isGroupLoading = useCallback((groupName) => {
    return loadingGroups.has(groupName)
  }, [loadingGroups])

  const value = {
    words,
    groupedWords,
    alphabetGroups,
    wordsMap,
    isLoading,
    isInitialized,
    loadedGroups,
    loadingGroups,
    loadWords,
    loadAlphabetGroups,
    loadGroupWords,
    isGroupLoaded,
    isGroupLoading,
    invalidateAndReload,
    updateWordInCache,
    removeWordFromCache,
    addWordToCache,
    getWordById,
    getWordsByGroup,
    getAllWords,
    getGroupedWords,
    getAlphabetGroups
  }

  return (
    <WordBaseContext.Provider value={value}>
      {children}
    </WordBaseContext.Provider>
  )
}

export default WordBaseContext

