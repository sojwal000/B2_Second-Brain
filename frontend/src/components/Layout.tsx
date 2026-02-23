import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dashboard,
  Article,
  SmartToy,
  Style,
  Task,
  AccountTree,
  Quiz,
  Workspaces,
  Settings,
  Logout,
  Menu,
  Close,
  Search,
  Add,
  KeyboardArrowRight,
} from '@mui/icons-material'
import { useAuthStore } from '../store/authStore'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Dashboard },
  { path: '/content', label: 'Content', icon: Article },
  { path: '/assistant', label: 'Assistant', icon: SmartToy },
  { path: '/flashcards', label: 'Flashcards', icon: Style },
  { path: '/tasks', label: 'Tasks', icon: Task },
  { path: '/mindmap', label: 'Mind Map', icon: AccountTree },
  { path: '/quiz', label: 'Quizzes', icon: Quiz },
  { path: '/workspaces', label: 'Workspaces', icon: Workspaces },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-zinc-950 border-r border-zinc-800/60 transition-all duration-300 flex flex-col ${
          sidebarOpen ? 'w-64' : 'w-[72px]'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <span className="text-white font-bold text-sm">B2</span>
              </div>
              <div>
                <span className="font-semibold text-white text-sm tracking-tight">Second Brain</span>
                <span className="block text-[10px] text-zinc-600 font-medium">AI Knowledge Base</span>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-sm">B2</span>
            </div>
          )}
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-7 w-6 h-6 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center hover:bg-zinc-700 transition-colors z-10"
        >
          <KeyboardArrowRight
            style={{ fontSize: 14 }}
            className={`text-zinc-400 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sidebarOpen && (
            <span className="px-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Menu</span>
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={!sidebarOpen ? item.label : undefined}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link'
              }
            >
              <item.icon style={{ fontSize: 20 }} />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="shrink-0 p-3 border-t border-zinc-800/60 space-y-1">
          <NavLink
            to="/settings"
            title={!sidebarOpen ? 'Settings' : undefined}
            className={({ isActive }) =>
              isActive ? 'sidebar-link-active' : 'sidebar-link'
            }
          >
            <Settings style={{ fontSize: 20 }} />
            {sidebarOpen && <span>Settings</span>}
          </NavLink>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-left"
            title={!sidebarOpen ? 'Logout' : undefined}
          >
            <Logout style={{ fontSize: 20 }} />
            {sidebarOpen && <span>Logout</span>}
          </button>

          {/* User */}
          {sidebarOpen && (
            <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-xl bg-zinc-900/80 border border-zinc-800/50">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-semibold">
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{user?.full_name || 'User'}</p>
                <p className="text-[10px] text-zinc-600 truncate">{user?.email || ''}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-[72px]'
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-40 h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/40 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2.5 px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800/80 rounded-xl text-zinc-500 transition-all border border-zinc-800/50 hover:border-zinc-700/50 min-w-[240px]"
            >
              <Search style={{ fontSize: 18 }} />
              <span className="text-sm">Search...</span>
              <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 rounded-md text-[10px] text-zinc-500 ml-auto font-mono">
                Ctrl+K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/content')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
            >
              <Add style={{ fontSize: 18 }} />
              <span className="hidden md:inline">Add Content</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-8">
          <Outlet />
        </main>
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
              onClick={() => setSearchOpen(false)}
            />
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setSearchOpen(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
                className="w-full max-w-2xl bg-zinc-900 rounded-2xl border border-zinc-800/80 shadow-2xl shadow-black/40"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-zinc-800/80">
                  <div className="flex items-center gap-3">
                    <Search className="text-zinc-500" style={{ fontSize: 20 }} />
                    <input
                      type="text"
                      placeholder="Search your knowledge base..."
                      className="flex-1 bg-transparent border-none outline-none text-white placeholder-zinc-600 text-base"
                      autoFocus
                    />
                    <kbd className="px-2 py-1 bg-zinc-800 rounded-lg text-[10px] text-zinc-500 font-mono border border-zinc-700/50">
                      ESC
                    </kbd>
                  </div>
                </div>
                <div className="p-8 text-center text-zinc-600 text-sm">
                  Start typing to search...
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
