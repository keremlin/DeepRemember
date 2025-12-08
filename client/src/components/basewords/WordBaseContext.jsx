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
  const [wordsMap, setWordsMap] = useState({}) // Map for quick lookup by ID
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [totalCount, setTotalCount] = useState(0) // Total word count from database
  const loadingPromiseRef = useRef(null) // Prevent multiple simultaneous loads
  const countLoadingPromiseRef = useRef(null) // Prevent multiple simultaneous count loads

  // Load words from API in batches (Supabase limit is 1000 per request)
  const loadWords = useCallback(async (forceReload = false) => {
    // If already loading, return the existing promise
    if (loadingPromiseRef.current && !forceReload) {
      return loadingPromiseRef.current
    }

    // Create the load promise
    loadingPromiseRef.current = (async () => {
      setIsLoading(true)
      try {
        const batchSize = 999 // Less than 1000 to avoid Supabase limit
        const allWords = []
        let offset = 0
        let hasMore = true
        let batchNumber = 0
        const maxBatches = 3 // Load up to 3 batches

        // Fetch words in batches
        while (hasMore && batchNumber < maxBatches) {
          const response = await fetch(
            getApiUrl(`/api/word-base?limit=${batchSize}&offset=${offset}`),
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              },
              mode: 'cors'
            }
          )

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const data = await response.json()
          
          if (data.success && data.words) {
            const batchWords = data.words || []
            allWords.push(...batchWords)
            
            // If we got fewer words than requested, we've reached the end
            if (batchWords.length < batchSize) {
              hasMore = false
            } else {
              offset += batchSize
              batchNumber++
            }
          } else {
            throw new Error(data.error || 'Failed to load words')
          }
        }

        // Process all loaded words
        setWords(allWords)
        
        // Create a map for quick lookup by ID
        const map = {}
        allWords.forEach(word => {
          map[word.id] = word
        })
        setWordsMap(map)
        
        // Group words by groupAlphabetName
        const grouped = {}
        const groups = []
        
        allWords.forEach(word => {
          const group = word.groupAlphabetName || word.group_alphabet_name || 'Unknown'
          if (!grouped[group]) {
            grouped[group] = []
            groups.push(group)
          }
          grouped[group].push(word)
        })
        
        // Sort words alphabetically within each group
        Object.keys(grouped).forEach(group => {
          grouped[group].sort((a, b) => {
            const wordA = (a.word || '').toLowerCase()
            const wordB = (b.word || '').toLowerCase()
            return wordA.localeCompare(wordB)
          })
        })
        
        // Sort groups alphabetically
        groups.sort()
        setAlphabetGroups(groups)
        setGroupedWords(grouped)
        
        setIsInitialized(true)
        return { success: true, words: allWords, count: allWords.length }
      } catch (error) {
        console.error('Error loading words:', error)
        setWords([])
        setWordsMap({})
        setGroupedWords({})
        setAlphabetGroups([])
        setIsInitialized(true)
        return { success: false, error: error.message }
      } finally {
        setIsLoading(false)
        loadingPromiseRef.current = null
      }
    })()

    return loadingPromiseRef.current
  }, [])

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
          // Sort words alphabetically within the group
          newGrouped[newGroup].sort((a, b) => {
            const wordA = (a.word || '').toLowerCase()
            const wordB = (b.word || '').toLowerCase()
            return wordA.localeCompare(wordB)
          })
          
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
            // Sort words alphabetically within the group after update
            newGrouped[newGroup].sort((a, b) => {
              const wordA = (a.word || '').toLowerCase()
              const wordB = (b.word || '').toLowerCase()
              return wordA.localeCompare(wordB)
            })
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
        // Sort words alphabetically within the group
        newGrouped[group].sort((a, b) => {
          const wordA = (a.word || '').toLowerCase()
          const wordB = (b.word || '').toLowerCase()
          return wordA.localeCompare(wordB)
        })
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

  // Load total word count from database
  const loadWordCount = useCallback(async (forceReload = false) => {
    // If already loading, return the existing promise
    if (countLoadingPromiseRef.current && !forceReload) {
      return countLoadingPromiseRef.current
    }

    // Create the load promise
    countLoadingPromiseRef.current = (async () => {
      try {
        const response = await fetch(getApiUrl('/api/word-base/count/total'), {
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
        
        if (data.success && data.count !== undefined) {
          setTotalCount(data.count)
          return data.count
        } else {
          throw new Error(data.error || 'Failed to load word count')
        }
      } catch (error) {
        console.error('Error loading word count:', error)
        return 0
      } finally {
        countLoadingPromiseRef.current = null
      }
    })()

    return countLoadingPromiseRef.current
  }, [])

  // Load words on mount (only once)
  useEffect(() => {
    if (!isInitialized && !isLoading) {
      loadWords()
      loadWordCount()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  const value = {
    words,
    groupedWords,
    alphabetGroups,
    wordsMap,
    isLoading,
    isInitialized,
    totalCount,
    loadWords,
    loadWordCount,
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

