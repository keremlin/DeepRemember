import React, { useState, useEffect, useRef, useCallback } from 'react'
import Page from '../Page'
import { useWordBase } from '../basewords/WordBaseContext'
import { useAuth } from '../security/AuthContext'
import { getApiUrl } from '../../config/api'
import './ArtikelGame.css'

const ARTICLES = ['der', 'die', 'das']
const GAME_DURATION = 30
const ARTIKEL_GAME_ID = 1 // games.id seeded in DB

const ArtikelGame = ({
  onNavigateToWelcome,
  onNavigateToPlayer,
  onShowCards,
  onNavigateToUserManagement,
  onNavigateToManagement,
  onNavigateToChat,
  onNavigateToWordList,
  onNavigateToCourses,
  onNavigateToArtikelGame
}) => {
  const { words, isLoading, isInitialized, loadWords } = useWordBase()
  const { authenticatedFetch } = useAuth()

  const [gameState, setGameState] = useState('idle') // idle | playing | finished
  const [nounWords, setNounWords] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [correct, setCorrect] = useState(0)   // C – correct answers
  const [total, setTotal] = useState(0)         // G – total guesses
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [feedback, setFeedback] = useState(null) // null | 'correct' | 'wrong'
  const [chosenArticle, setChosenArticle] = useState(null)

  // Result state
  const [computedScore, setComputedScore] = useState(0)
  const [bestScore, setBestScore] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [correctAnswers, setCorrectAnswers] = useState([])
  const [wrongAnswers, setWrongAnswers] = useState([])

  const timerRef = useRef(null)
  const feedbackTimeoutRef = useRef(null)
  // keep live refs so the timer callback always has current values
  const correctRef = useRef(0)
  const totalRef = useRef(0)
  // per-word answer accumulator: Map<wordBaseId, { correct: n, wrong: n }>
  const wordAnswersRef = useRef(new Map())

  // Filter words that have a valid article
  const prepareWords = useCallback((allWords) => {
    const nouns = allWords.filter(w => {
      const art = (w.article || '').toLowerCase().trim()
      return art === 'der' || art === 'die' || art === 'das'
    })
    return [...nouns].sort(() => Math.random() - 0.5)
  }, [])

  useEffect(() => {
    if (!isInitialized) loadWords()
  }, [isInitialized, loadWords])

  // ── score formula ──────────────────────────────────────────
  // Accuracy = C / G
  // Score    = C × Accuracy × 100  →  C² / G × 100
  const calcScore = (c, g) => g > 0 ? Math.round((c * c / g) * 100) : 0

  // ── save round to backend ──────────────────────────────────
  const saveRound = useCallback(async (c, g) => {
    const score = calcScore(c, g)
    setComputedScore(score)
    setIsSaving(true)
    try {
      const wordAnswers = Array.from(wordAnswersRef.current.entries()).map(([wordBaseId, counts]) => ({
        wordBaseId,
        correct: counts.correct,
        wrong: counts.wrong
      }))
      const res = await authenticatedFetch(getApiUrl('/api/games/data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: ARTIKEL_GAME_ID, correct: c, total: g, level: '1', wordAnswers })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setBestScore(prev => Math.max(prev ?? 0, data.bestScore ?? 0, data.score ?? 0))
        }
      }
    } catch (err) {
      console.error('[ArtikelGame] saveRound error:', err)
    } finally {
      setIsSaving(false)
    }
  }, [authenticatedFetch])

  const startGame = () => {
    const prepared = prepareWords(words)
    if (prepared.length === 0) return
    clearInterval(timerRef.current)
    clearTimeout(feedbackTimeoutRef.current)
    setNounWords(prepared)
    setCurrentIndex(0)
    setCorrect(0)
    setTotal(0)
    correctRef.current = 0
    totalRef.current = 0
    wordAnswersRef.current = new Map()
    setTimeLeft(GAME_DURATION)
    setFeedback(null)
    setChosenArticle(null)
    setComputedScore(0)
    setBestScore(null)
    setCorrectAnswers([])
    setWrongAnswers([])
    setGameState('playing')
  }

  // Countdown timer — only updates timeLeft
  useEffect(() => {
    if (gameState !== 'playing') return

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [gameState])

  // End game when timer reaches 0
  useEffect(() => {
    if (timeLeft === 0 && gameState === 'playing') {
      setGameState('finished')
      saveRound(correctRef.current, totalRef.current)
    }
  }, [timeLeft, gameState, saveRound])

  const handleArticleClick = (article) => {
    if (feedback !== null || gameState !== 'playing') return

    const currentWord = nounWords[currentIndex]
    const isCorrect = (currentWord.article || '').toLowerCase().trim() === article

    setChosenArticle(article)
    setFeedback(isCorrect ? 'correct' : 'wrong')
    setTotal(prev => {
      totalRef.current = prev + 1
      return prev + 1
    })
    const correctArticle = (currentWord.article || '').toLowerCase().trim()

    // Accumulate per-word stats (keyed by word_base id)
    const wordId = currentWord.id
    if (wordId != null) {
      const existing = wordAnswersRef.current.get(wordId) || { correct: 0, wrong: 0 }
      wordAnswersRef.current.set(wordId, {
        correct: existing.correct + (isCorrect ? 1 : 0),
        wrong:   existing.wrong   + (isCorrect ? 0 : 1)
      })
    }

    if (isCorrect) {
      setCorrect(prev => {
        correctRef.current = prev + 1
        return prev + 1
      })
      setCorrectAnswers(prev => [...prev, { article: correctArticle, word: currentWord.word }])
    } else {
      setWrongAnswers(prev => [...prev, { chosen: article, correct: correctArticle, word: currentWord.word }])
    }

    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null)
      setChosenArticle(null)
      setCurrentIndex(prev => {
        const next = prev + 1
        if (next >= nounWords.length) {
          setNounWords(prevWords => [...prevWords].sort(() => Math.random() - 0.5))
          return 0
        }
        return next
      })
    }, 500)
  }

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      clearTimeout(feedbackTimeoutRef.current)
    }
  }, [])

  const currentWord = nounWords[currentIndex]
  const timerPercent = (timeLeft / GAME_DURATION) * 100
  const timerColor = timeLeft > 15 ? '#667eea' : timeLeft > 7 ? '#f59e0b' : '#ef4444'
  const nounCount = isInitialized ? prepareWords(words).length : 0

  // Result helpers
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
  const resultIcon = correct >= total * 0.8 ? 'emoji_events'
    : correct >= total * 0.5 ? 'thumb_up'
    : 'sentiment_neutral'

  return (
    <Page
      isCardsView={false}
      onUserSetup={() => {}}
      onToggleCardsView={() => {}}
      onNavigateToWelcome={onNavigateToWelcome}
      onNavigateToPlayer={onNavigateToPlayer}
      onShowCards={onShowCards}
      onNavigateToUserManagement={onNavigateToUserManagement}
      onNavigateToManagement={onNavigateToManagement}
      onNavigateToChat={onNavigateToChat}
      onNavigateToWordList={onNavigateToWordList}
      onNavigateToCourses={onNavigateToCourses}
      onNavigateToArtikelGame={onNavigateToArtikelGame}
    >
      <div className="artikel-game-container">
        <div className="artikel-game-header">
          <h3>
            <span className="material-symbols-outlined">sports_esports</span>
            Artikel-Spiel
          </h3>
          <p className="artikel-game-subtitle">Welchen Artikel hat dieses Nomen?</p>
        </div>

        {/* ── IDLE ── */}
        {gameState === 'idle' && (
          <div className="artikel-game-idle">
            {isLoading && <p className="artikel-game-loading">Lade Wörter...</p>}
            {!isLoading && isInitialized && (
              <>
                {nounCount === 0 ? (
                  <p className="artikel-game-no-words">
                    Keine Nomen mit Artikel in der Wortliste gefunden.<br />
                    Bitte füge Wörter mit Artikel (der/die/das) zur Wortliste hinzu.
                  </p>
                ) : (
                  <p className="artikel-game-info">
                    {nounCount} Nomen gefunden. Das Spiel dauert {GAME_DURATION} Sekunden.
                  </p>
                )}
                <button
                  className="artikel-game-start-btn"
                  onClick={startGame}
                  disabled={nounCount === 0}
                >
                  <span className="material-symbols-outlined">play_arrow</span>
                  Spiel starten
                </button>
              </>
            )}
          </div>
        )}

        {/* ── PLAYING ── */}
        {gameState === 'playing' && currentWord && (
          <div className="artikel-game-play">
            <div className="artikel-game-timer-bar-wrapper">
              <div
                className="artikel-game-timer-bar"
                style={{ width: `${timerPercent}%`, backgroundColor: timerColor }}
              />
            </div>
            <div className="artikel-game-timer-label" style={{ color: timerColor }}>
              {timeLeft}s
            </div>

            <div className={`artikel-game-word-card ${feedback || ''}`}>
              <span className="artikel-game-word">{currentWord.word}</span>
              {feedback && (
                <span className="artikel-game-feedback-icon material-symbols-outlined">
                  {feedback === 'correct' ? 'check_circle' : 'cancel'}
                </span>
              )}
            </div>

            {currentWord.translate && (
              <p className="artikel-game-translation">{currentWord.translate}</p>
            )}

            <div className="artikel-game-buttons">
              {ARTICLES.map(article => {
                let btnClass = 'artikel-btn'
                if (chosenArticle === article) {
                  btnClass += feedback === 'correct' ? ' artikel-btn-correct' : ' artikel-btn-wrong'
                } else if (feedback && (currentWord.article || '').toLowerCase().trim() === article) {
                  btnClass += ' artikel-btn-reveal'
                }
                return (
                  <button
                    key={article}
                    className={btnClass}
                    onClick={() => handleArticleClick(article)}
                    disabled={feedback !== null}
                  >
                    {article}
                  </button>
                )
              })}
            </div>

            <div className="artikel-game-score-live">
              <span className="material-symbols-outlined">check_circle</span>
              {correct} / {total}
            </div>
          </div>
        )}

        {/* ── FINISHED ── */}
        {gameState === 'finished' && (
          <div className="artikel-game-result">
            <div className="artikel-game-result-icon">
              <span className="material-symbols-outlined">{resultIcon}</span>
            </div>

            <h2 className="artikel-game-result-title">Zeit ist abgelaufen!</h2>

            {/* Score */}
            <div className="artikel-game-result-score-box">
              <span className="artikel-game-result-score-label">Score</span>
              <span className="artikel-game-result-score-value">
                {isSaving ? '…' : computedScore}
              </span>
            </div>

            {/* Stats grid */}
            <div className="artikel-game-result-stats">
              <div className="artikel-game-stat">
                <span className="artikel-game-stat-value">{correct}</span>
                <span className="artikel-game-stat-label">Richtig (C)</span>
              </div>
              <div className="artikel-game-stat">
                <span className="artikel-game-stat-value">{total}</span>
                <span className="artikel-game-stat-label">Gesamt (G)</span>
              </div>
              <div className="artikel-game-stat">
                <span className="artikel-game-stat-value">{accuracy}%</span>
                <span className="artikel-game-stat-label">Genauigkeit</span>
              </div>
            </div>

            {/* Formula explanation */}
            <p className="artikel-game-result-formula">
              Score&nbsp;=&nbsp;C&nbsp;×&nbsp;(C/G)&nbsp;×&nbsp;100
              &nbsp;=&nbsp;{correct}&nbsp;×&nbsp;{total > 0 ? (correct / total).toFixed(2) : '0.00'}&nbsp;×&nbsp;100
            </p>

            {bestScore !== null && (
              <p className="artikel-game-result-best">
                <span className="material-symbols-outlined">star</span>
                Bester Score: {bestScore}
              </p>
            )}

            <button className="artikel-game-start-btn" onClick={startGame} disabled={isSaving}>
              <span className="material-symbols-outlined">replay</span>
              Nochmal spielen
            </button>

            {(correctAnswers.length > 0 || wrongAnswers.length > 0) && (
              <div className="artikel-game-answers-grid">
                {correctAnswers.length > 0 && (
                  <div className="artikel-game-answer-col">
                    <p className="artikel-game-correct-list-label correct">Richtige</p>
                    <ul className="artikel-game-correct-list">
                      {correctAnswers.map((item, i) => (
                        <li key={i} className="artikel-game-correct-item">
                          <span className="artikel-game-correct-article">{item.article}</span>
                          {item.word}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {wrongAnswers.length > 0 && (
                  <div className="artikel-game-answer-col">
                    <p className="artikel-game-correct-list-label wrong">Falsche</p>
                    <ul className="artikel-game-correct-list">
                      {wrongAnswers.map((item, i) => (
                        <li key={i} className="artikel-game-correct-item">
                          <span className="artikel-game-wrong-chosen">{item.chosen}</span>
                          <span className="artikel-game-wrong-arrow">→</span>
                          <span className="artikel-game-correct-article">{item.correct}</span>
                          {item.word}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Page>
  )
}

export default ArtikelGame
