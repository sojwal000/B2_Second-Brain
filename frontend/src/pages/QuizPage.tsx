import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Quiz as QuizIcon,
  PlayArrow,
  Check,
  Close,
  ArrowBack,
  ArrowForward,
  Delete,
  EmojiEvents,
  Timer,
  Refresh,
} from '@mui/icons-material'
import { Button, Card, CardContent, Modal, Badge } from '../components/ui'
import { quizService, contentService } from '../services'
import type { QuizDetail, QuizListItem, QuizAnswer, QuizResult, Content, QuestionType } from '../types'
import toast from 'react-hot-toast'

type ViewMode = 'list' | 'generate' | 'take' | 'results'

export default function QuizPage() {
  const [view, setView] = useState<ViewMode>('list')
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedQuiz, setSelectedQuiz] = useState<QuizDetail | null>(null)
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null)

  // Generate form
  const [contents, setContents] = useState<Content[]>([])
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null)
  const [numQuestions, setNumQuestions] = useState(10)
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(['mcq', 'true_false'])
  const [difficulty, setDifficulty] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Quiz taking
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null)

  useEffect(() => {
    loadQuizzes()
  }, [])

  const loadQuizzes = async () => {
    try {
      setIsLoading(true)
      const data = await quizService.listQuizzes()
      setQuizzes(data.items)
    } catch (error) {
      console.error('Failed to load quizzes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadContents = async () => {
    try {
      const data = await contentService.list({ page: 1, page_size: 100 })
      setContents(data.items.filter((c: Content) => c.processing_status === 'completed'))
    } catch (error) {
      console.error('Failed to load contents:', error)
    }
  }

  const handleGenerate = async () => {
    if (!selectedContentId) {
      toast.error('Please select content')
      return
    }
    setIsGenerating(true)
    try {
      const quiz = await quizService.generateQuiz({
        content_id: selectedContentId,
        num_questions: numQuestions,
        question_types: questionTypes,
        difficulty: difficulty || undefined,
      })
      toast.success('Quiz generated!')
      setSelectedQuiz(quiz)
      setAnswers({})
      setCurrentQuestion(0)
      setView('take')
      loadQuizzes()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to generate quiz')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleOpenQuiz = async (quizId: number) => {
    try {
      const quiz = await quizService.getQuiz(quizId)
      setSelectedQuiz(quiz)
      if (quiz.completed) {
        setQuizResult({
          quiz_id: quiz.id,
          score: quiz.score || 0,
          total_questions: quiz.total_questions,
          correct_count: quiz.questions.filter((q: any) => q.is_correct).length,
          results: quiz.questions,
        })
        setView('results')
      } else {
        setAnswers({})
        setCurrentQuestion(0)
        setView('take')
      }
    } catch (error) {
      toast.error('Failed to load quiz')
    }
  }

  const handleSubmit = async () => {
    if (!selectedQuiz) return
    const answerList: QuizAnswer[] = Object.entries(answers).map(([qid, answer]) => ({
      question_id: parseInt(qid),
      answer,
    }))

    if (answerList.length < selectedQuiz.total_questions) {
      const unanswered = selectedQuiz.total_questions - answerList.length
      toast.error(`${unanswered} question${unanswered > 1 ? 's' : ''} unanswered`)
      return
    }

    setIsSubmitting(true)
    try {
      const result = await quizService.submitQuiz(selectedQuiz.id, answerList)
      setQuizResult(result)
      setView('results')
      loadQuizzes()
      toast.success(`Score: ${result.score.toFixed(1)}%`)
    } catch (error) {
      toast.error('Failed to submit quiz')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (quizId: number) => {
    try {
      await quizService.deleteQuiz(quizId)
      setQuizzes(prev => prev.filter(q => q.id !== quizId))
      toast.success('Quiz deleted')
      setShowDeleteModal(null)
    } catch (error) {
      toast.error('Failed to delete quiz')
    }
  }

  const toggleQuestionType = (qt: QuestionType) => {
    setQuestionTypes(prev =>
      prev.includes(qt) ? prev.filter(t => t !== qt) : [...prev, qt]
    )
  }

  const goToGenerate = () => {
    loadContents()
    setSelectedContentId(null)
    setView('generate')
  }

  // ========== LIST VIEW ==========
  if (view === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <QuizIcon className="text-primary-400" /> Quizzes
            </h1>
            <p className="text-secondary-400 mt-1">AI-generated quizzes from your content</p>
          </div>
          <Button onClick={goToGenerate}>
            <PlayArrow className="w-4 h-4 mr-1" /> Generate Quiz
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500" />
          </div>
        ) : quizzes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <QuizIcon className="text-secondary-600 mx-auto mb-4" style={{ fontSize: 48 }} />
              <h3 className="text-lg font-medium text-secondary-300 mb-2">No Quizzes Yet</h3>
              <p className="text-secondary-500 mb-4">Generate your first quiz from any content</p>
              <Button onClick={goToGenerate}>Generate Quiz</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  className="cursor-pointer hover:border-primary-500/50 transition-colors"
                  onClick={() => handleOpenQuiz(quiz.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-sm font-medium text-white line-clamp-2 flex-1">
                        {quiz.title}
                      </h3>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowDeleteModal(quiz.id) }}
                        className="text-secondary-500 hover:text-red-400 ml-2"
                      >
                        <Delete fontSize="small" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={quiz.completed ? 'success' : 'info'}>
                        {quiz.completed ? `${quiz.score?.toFixed(0)}%` : 'In Progress'}
                      </Badge>
                      <Badge variant="default">{quiz.total_questions} Q</Badge>
                      {quiz.difficulty && (
                        <Badge variant="info">{quiz.difficulty}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-secondary-500 mt-2">
                      {new Date(quiz.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Delete confirmation modal */}
        <Modal
          isOpen={!!showDeleteModal}
          onClose={() => setShowDeleteModal(null)}
          title="Delete Quiz"
        >
          <p className="text-secondary-300 mb-4">Are you sure you want to delete this quiz?</p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowDeleteModal(null)}>Cancel</Button>
            <Button
              variant="primary"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => showDeleteModal && handleDelete(showDeleteModal)}
            >
              Delete
            </Button>
          </div>
        </Modal>
      </div>
    )
  }

  // ========== GENERATE VIEW ==========
  if (view === 'generate') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="text-secondary-400 hover:text-white">
            <ArrowBack />
          </button>
          <h1 className="text-2xl font-bold text-white">Generate Quiz</h1>
        </div>

        <Card>
          <CardContent className="space-y-5 p-6">
            {/* Content Selector */}
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">
                Select Content
              </label>
              <select
                value={selectedContentId || ''}
                onChange={(e) => setSelectedContentId(Number(e.target.value) || null)}
                className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:outline-none"
              >
                <option value="">Choose content...</option>
                {contents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.content_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Number of Questions */}
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">
                Number of Questions: {numQuestions}
              </label>
              <input
                type="range"
                min={3}
                max={30}
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-xs text-secondary-500 mt-1">
                <span>3</span><span>30</span>
              </div>
            </div>

            {/* Question Types */}
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">
                Question Types
              </label>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: 'mcq' as QuestionType, label: 'Multiple Choice' },
                  { value: 'true_false' as QuestionType, label: 'True / False' },
                  { value: 'fill_blank' as QuestionType, label: 'Fill in Blank' },
                  { value: 'short_answer' as QuestionType, label: 'Short Answer' },
                ]).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => toggleQuestionType(value)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      questionTypes.includes(value)
                        ? 'bg-primary-600 border-primary-500 text-white'
                        : 'bg-secondary-800 border-secondary-700 text-secondary-400 hover:border-secondary-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-secondary-300 mb-2">
                Difficulty (optional)
              </label>
              <div className="flex gap-2">
                {['easy', 'medium', 'hard'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(difficulty === d ? '' : d)}
                    className={`px-3 py-1.5 rounded-lg text-sm border capitalize transition-colors ${
                      difficulty === d
                        ? 'bg-primary-600 border-primary-500 text-white'
                        : 'bg-secondary-800 border-secondary-700 text-secondary-400 hover:border-secondary-500'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!selectedContentId || questionTypes.length === 0 || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <PlayArrow className="w-4 h-4 mr-1" /> Generate Quiz
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ========== TAKE QUIZ VIEW ==========
  if (view === 'take' && selectedQuiz) {
    const question = selectedQuiz.questions[currentQuestion]
    const totalQ = selectedQuiz.questions.length
    const answeredCount = Object.keys(answers).length

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <button onClick={() => setView('list')} className="text-secondary-400 hover:text-white flex items-center gap-1">
            <ArrowBack fontSize="small" /> Back
          </button>
          <div className="text-secondary-400 text-sm flex items-center gap-2">
            <Timer fontSize="small" />
            {answeredCount}/{totalQ} answered
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-secondary-800 rounded-full h-2">
          <div
            className="bg-primary-500 h-2 rounded-full transition-all"
            style={{ width: `${((currentQuestion + 1) / totalQ) * 100}%` }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardContent className="p-6">
                {/* Question header */}
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="primary">Q{currentQuestion + 1}/{totalQ}</Badge>
                  <Badge variant="info">
                    {question.question_type === 'mcq' ? 'Multiple Choice'
                      : question.question_type === 'true_false' ? 'True / False'
                      : question.question_type === 'fill_blank' ? 'Fill in Blank'
                      : 'Short Answer'}
                  </Badge>
                  {question.difficulty && (
                    <Badge variant="warning" className="capitalize">{question.difficulty}</Badge>
                  )}
                </div>

                {/* Question text */}
                <h2 className="text-lg text-white mb-6">{question.question_text}</h2>

                {/* Answer options */}
                {(question.question_type === 'mcq' || question.question_type === 'true_false') && question.options.length > 0 ? (
                  <div className="space-y-3">
                    {question.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => setAnswers(prev => ({ ...prev, [question.id]: option }))}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                          answers[question.id] === option
                            ? 'bg-primary-600/20 border-primary-500 text-white'
                            : 'bg-secondary-800 border-secondary-700 text-secondary-300 hover:border-secondary-500'
                        }`}
                      >
                        <span className="font-medium mr-2 text-secondary-500">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Type your answer..."
                    value={answers[question.id] || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                    className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
          >
            <ArrowBack className="w-4 h-4 mr-1" /> Previous
          </Button>

          {currentQuestion < totalQ - 1 ? (
            <Button
              onClick={() => setCurrentQuestion(prev => Math.min(totalQ - 1, prev + 1))}
            >
              Next <ArrowForward className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
              <Check className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Question dots */}
        <div className="flex flex-wrap justify-center gap-2">
          {selectedQuiz.questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestion(idx)}
              className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                idx === currentQuestion
                  ? 'bg-primary-500 text-white'
                  : answers[q.id]
                  ? 'bg-green-600/30 text-green-400 border border-green-600'
                  : 'bg-secondary-800 text-secondary-400 border border-secondary-700'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ========== RESULTS VIEW ==========
  if (view === 'results' && quizResult) {
    const scoreColor = quizResult.score >= 80 ? 'text-green-400' : quizResult.score >= 50 ? 'text-yellow-400' : 'text-red-400'

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => { setView('list'); setQuizResult(null); setSelectedQuiz(null) }} className="text-secondary-400 hover:text-white">
            <ArrowBack />
          </button>
          <h1 className="text-2xl font-bold text-white">Quiz Results</h1>
        </div>

        {/* Score Card */}
        <Card>
          <CardContent className="text-center py-8">
            <EmojiEvents className="text-yellow-400 mb-2" style={{ fontSize: 48 }} />
            <h2 className={`text-5xl font-bold ${scoreColor} mb-2`}>
              {quizResult.score.toFixed(1)}%
            </h2>
            <p className="text-secondary-400">
              {quizResult.correct_count} / {quizResult.total_questions} correct
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <Button variant="ghost" onClick={() => { setView('list'); setQuizResult(null); setSelectedQuiz(null) }}>
                Back to Quizzes
              </Button>
              <Button onClick={goToGenerate}>
                <Refresh className="w-4 h-4 mr-1" /> New Quiz
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Question Review */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Review Answers</h3>
          {quizResult.results.map((q, idx) => (
            <Card key={q.id} className={`border-l-4 ${q.is_correct ? 'border-l-green-500' : 'border-l-red-500'}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    q.is_correct ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                  }`}>
                    {q.is_correct ? <Check style={{ fontSize: 16 }} /> : <Close style={{ fontSize: 16 }} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-secondary-500 mb-1">Question {idx + 1}</p>
                    <p className="text-white mb-3">{q.question_text}</p>

                    {q.user_answer && (
                      <p className={`text-sm mb-1 ${q.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                        Your answer: {q.user_answer}
                      </p>
                    )}
                    {!q.is_correct && (
                      <p className="text-sm text-green-400 mb-1">
                        Correct answer: {q.correct_answer}
                      </p>
                    )}
                    {q.explanation && (
                      <p className="text-sm text-secondary-400 mt-2 bg-secondary-800/50 rounded p-2">
                        💡 {q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return null
}
