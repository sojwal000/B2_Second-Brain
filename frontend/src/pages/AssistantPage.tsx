import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Send,
  History,
  Delete,
  AutoAwesome,
  Article,
  Chat,
} from '@mui/icons-material'
import { Button, Card, CardContent, Input, Badge, Modal } from '../components/ui'
import { assistantService } from '../services'
import type { ChatMessage, ChatSession } from '../types'

export default function AssistantPage() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSuggestions()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadSuggestions = async () => {
    try {
      const suggestions = await assistantService.getSuggestedQuestions()
      setSuggestedQuestions(suggestions)
    } catch (error) {
      console.error('Failed to load suggestions:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentQuery = query.trim()
    setQuery('')
    setIsLoading(true)

    try {
      // Use chat endpoint which saves to session
      const response = await assistantService.chat(currentQuery, currentSessionId || undefined)
      
      // Save session ID for follow-up messages
      if (!currentSessionId && response.session_id) {
        setCurrentSessionId(response.session_id)
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message.content,
        sources: response.sources,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Update suggestions with follow-up questions
      if (response.suggested_questions?.length) {
        setSuggestedQuestions(response.suggested_questions)
      }
    } catch (error) {
      console.error('Query failed:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (question: string) => {
    setQuery(question)
  }

  const clearChat = () => {
    setMessages([])
    setCurrentSessionId(null)
    loadSuggestions()
  }

  const loadHistory = async () => {
    setShowHistory(true)
    setLoadingHistory(true)
    try {
      const sessions = await assistantService.listChatSessions()
      setChatSessions(sessions)
    } catch (error) {
      console.error('Failed to load chat history:', error)
      setChatSessions([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const loadSession = async (session: ChatSession) => {
    try {
      const fullSession = await assistantService.getChatSession(session.id)
      setMessages(fullSession.messages || [])
      setCurrentSessionId(session.id)
      setShowHistory(false)
    } catch (error) {
      console.error('Failed to load session:', error)
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">AI Assistant</h1>
          <p className="text-zinc-500 mt-1">Ask questions about your knowledge base</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadHistory}>
            <History style={{ fontSize: 16 }} className="mr-1" />
            History
          </Button>
          <Button variant="ghost" size="sm" onClick={clearChat}>
            <Delete style={{ fontSize: 16 }} className="mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* History Modal */}
      <Modal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        title="Chat History"
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : chatSessions.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Chat className="text-4xl mb-2 opacity-50" />
              <p>No chat history yet</p>
              <p className="text-sm text-zinc-600">Your conversations will appear here</p>
            </div>
          ) : (
            chatSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => loadSession(session)}
                className="w-full text-left p-3 bg-zinc-800/60 hover:bg-zinc-800 rounded-xl transition-all border border-zinc-800/50 hover:border-zinc-700"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium truncate">
                    {session.title || 'Untitled Chat'}
                  </span>
                  <span className="text-zinc-600 text-xs">
                    {new Date(session.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-zinc-500 text-sm mt-1 truncate">
                  {session.messages?.length || 0} messages
                </p>
              </button>
            ))
          )}
        </div>
      </Modal>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto space-y-4 p-5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-4 border border-indigo-500/10">
                <AutoAwesome className="text-indigo-400 text-3xl" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Ask Your Knowledge Base
              </h2>
              <p className="text-zinc-500 max-w-md mb-6">
                I can answer questions based on your uploaded content. Try asking about
                concepts, summaries, or specific information from your documents.
              </p>

              {/* Suggested Questions */}
              {suggestedQuestions.length > 0 && (
                <div className="space-y-2 w-full max-w-lg">
                  <p className="text-zinc-600 text-sm">Try asking:</p>
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(question)}
                      className="w-full text-left p-3 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-xl text-zinc-400 transition-all border border-zinc-800/50 hover:border-zinc-700"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-zinc-500"
                >
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                  <span className="text-sm">Thinking...</span>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input Area */}
        <div className="p-4 border-t border-zinc-800/80">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about your knowledge base..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={!query.trim() || isLoading}>
              <Send style={{ fontSize: 16 }} />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}

interface MessageBubbleProps {
  message: ChatMessage
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl p-4 ${
          isUser
            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
            : 'bg-zinc-800/80 text-zinc-300 border border-zinc-800/50'
        }`}
      >
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div className="space-y-4">
            <div className="markdown-content">
              <ReactMarkdown
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const inline = !match
                    return !inline ? (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <div className="border-t border-zinc-700/50 pt-3 mt-3">
                <p className="text-zinc-600 text-xs mb-2 flex items-center gap-1">
                  <Article style={{ fontSize: 14 }} />
                  Sources
                </p>
                <div className="flex flex-wrap gap-2">
                  {message.sources.map((source) => (
                    <Badge key={source.content_id} variant="default" size="sm">
                      {source.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
