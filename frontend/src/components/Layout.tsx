import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
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
    <div className="min-h-screen bg-secondary-900 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-secondary-950 border-r border-secondary-800 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-secondary-800">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">B2</span>
              </div>
              <span className="font-semibold text-white">Second Brain</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-secondary-800 rounded-lg transition-colors"
          >
            {sidebarOpen ? <Close fontSize="small" /> : <Menu fontSize="small" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link'
              }
            >
              <item.icon fontSize="small" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-secondary-800">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              isActive ? 'sidebar-link-active' : 'sidebar-link'
            }
          >
            <Settings fontSize="small" />
            {sidebarOpen && <span>Settings</span>}
          </NavLink>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-left mt-2"
          >
            <Logout fontSize="small" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* Header */}
        <header className="h-16 bg-secondary-950 border-b border-secondary-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-secondary-800 hover:bg-secondary-700 rounded-lg text-secondary-400 transition-colors"
            >
              <Search fontSize="small" />
              <span>Search...</span>
              <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 bg-secondary-700 rounded text-xs">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/content')}
              className="btn-primary flex items-center gap-2"
            >
              <Add fontSize="small" />
              <span className="hidden md:inline">Add Content</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <span className="hidden md:block text-sm text-secondary-300">
                {user?.full_name || 'User'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-24"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-secondary-900 rounded-xl border border-secondary-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-secondary-700">
              <div className="flex items-center gap-3">
                <Search className="text-secondary-400" />
                <input
                  type="text"
                  placeholder="Search your knowledge base..."
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder-secondary-500"
                  autoFocus
                />
                <kbd className="px-2 py-1 bg-secondary-800 rounded text-xs text-secondary-400">
                  ESC
                </kbd>
              </div>
            </div>
            <div className="p-4 text-center text-secondary-500">
              Start typing to search...
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
