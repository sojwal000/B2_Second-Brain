import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Person,
  Palette,
  Notifications,
  Security,
  Storage,
  SmartToy,
  Save,
} from '@mui/icons-material'
import { Button, Card, CardContent, Input } from '../components/ui'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'ai' | 'security' | 'data'

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [isSaving, setIsSaving] = useState(false)

  // Profile form
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')

  // Preferences
  const [theme, setTheme] = useState(user?.preferences?.theme || 'dark')
  const [aiProvider, setAiProvider] = useState(user?.preferences?.default_ai_provider || 'gemini')
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    user?.preferences?.notifications_enabled ?? true
  )
  const [dailyReminder, setDailyReminder] = useState(
    user?.preferences?.daily_review_reminder ?? true
  )

  const tabs = [
    { id: 'profile', label: 'Profile', icon: Person },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Notifications },
    { id: 'ai', label: 'AI Settings', icon: SmartToy },
    { id: 'security', label: 'Security', icon: Security },
    { id: 'data', label: 'Data', icon: Storage },
  ] as const

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateUser({
        full_name: fullName,
        preferences: {
          theme: theme as 'light' | 'dark' | 'system',
          default_ai_provider: aiProvider as 'gemini' | 'openai' | 'anthropic',
          notifications_enabled: notificationsEnabled,
          daily_review_reminder: dailyReminder,
          reminder_time: '09:00',
        },
      })
      toast.success('Settings saved!')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-secondary-400">Manage your account and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-48 shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-secondary-400 hover:text-white hover:bg-secondary-800'
              }`}
            >
              <tab.icon fontSize="small" />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="space-y-6">
                {activeTab === 'profile' && (
                  <>
                    <h2 className="text-lg font-semibold text-white">Profile Settings</h2>
                    <div className="space-y-4">
                      <Input
                        label="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                      <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled
                        helperText="Email cannot be changed"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'appearance' && (
                  <>
                    <h2 className="text-lg font-semibold text-white">Appearance</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="label">Theme</label>
                        <div className="grid grid-cols-3 gap-3">
                          {['light', 'dark', 'system'].map((t) => (
                            <button
                              key={t}
                              onClick={() => setTheme(t)}
                              className={`p-4 rounded-lg border-2 transition-colors capitalize ${
                                theme === t
                                  ? 'border-primary-500 bg-primary-500/10'
                                  : 'border-secondary-700 hover:border-secondary-600'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'notifications' && (
                  <>
                    <h2 className="text-lg font-semibold text-white">Notifications</h2>
                    <div className="space-y-4">
                      <label className="flex items-center justify-between p-4 bg-secondary-900 rounded-lg cursor-pointer">
                        <div>
                          <p className="text-white">Enable Notifications</p>
                          <p className="text-secondary-500 text-sm">
                            Receive updates about your content and reminders
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationsEnabled}
                          onChange={(e) => setNotificationsEnabled(e.target.checked)}
                          className="w-5 h-5 rounded"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 bg-secondary-900 rounded-lg cursor-pointer">
                        <div>
                          <p className="text-white">Daily Review Reminder</p>
                          <p className="text-secondary-500 text-sm">
                            Get reminded to review your flashcards
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={dailyReminder}
                          onChange={(e) => setDailyReminder(e.target.checked)}
                          className="w-5 h-5 rounded"
                        />
                      </label>
                    </div>
                  </>
                )}

                {activeTab === 'ai' && (
                  <>
                    <h2 className="text-lg font-semibold text-white">AI Settings</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="label">Default AI Provider</label>
                        <select
                          className="input w-full"
                          value={aiProvider}
                          onChange={(e) => setAiProvider(e.target.value)}
                        >
                          <option value="gemini">Google Gemini</option>
                          <option value="openai">OpenAI GPT-4</option>
                          <option value="anthropic">Anthropic Claude</option>
                        </select>
                        <p className="text-secondary-500 text-sm mt-1">
                          Choose your preferred AI model for Q&A and generation
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'security' && (
                  <>
                    <h2 className="text-lg font-semibold text-white">Security</h2>
                    <div className="space-y-4">
                      <Button variant="secondary">Change Password</Button>
                      <div className="pt-4 border-t border-secondary-700">
                        <h3 className="text-white font-medium mb-2">Danger Zone</h3>
                        <Button variant="danger">Delete Account</Button>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'data' && (
                  <>
                    <h2 className="text-lg font-semibold text-white">Data Management</h2>
                    <div className="space-y-4">
                      <div className="p-4 bg-secondary-900 rounded-lg">
                        <h3 className="text-white font-medium mb-2">Export Data</h3>
                        <p className="text-secondary-500 text-sm mb-3">
                          Download all your content, flashcards, and tasks
                        </p>
                        <Button variant="secondary">Export All Data</Button>
                      </div>

                      <div className="p-4 bg-secondary-900 rounded-lg">
                        <h3 className="text-white font-medium mb-2">Import Data</h3>
                        <p className="text-secondary-500 text-sm mb-3">
                          Import content from a backup or other sources
                        </p>
                        <Button variant="secondary">Import Data</Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Save Button */}
                <div className="pt-4 border-t border-secondary-700">
                  <Button onClick={handleSave} isLoading={isSaving}>
                    <Save fontSize="small" className="mr-1" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
