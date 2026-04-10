import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listUsers, inviteUser, deleteUser, type UserProfile } from '../services/users'

function getInviteErrorMessage(err: unknown) {
  const technicalMessage = err instanceof Error ? err.message : ''
  const normalizedMessage = technicalMessage.toLowerCase()

  if (normalizedMessage.includes('invalid email') || normalizedMessage.includes('email address is invalid')) {
    return 'Ange en giltig e-postadress.'
  }

  if (
    normalizedMessage.includes('already invited') ||
    normalizedMessage.includes('already exists') ||
    normalizedMessage.includes('user already registered') ||
    normalizedMessage.includes('already been registered')
  ) {
    return 'Den här e-postadressen har redan bjudits in eller används redan.'
  }

  if (
    normalizedMessage.includes('not authorized') ||
    normalizedMessage.includes('unauthorized') ||
    normalizedMessage.includes('forbidden') ||
    normalizedMessage.includes('permission')
  ) {
    return 'Du har inte behörighet att bjuda in användare.'
  }

  if (
    normalizedMessage.includes('functionshttperror') ||
    normalizedMessage.includes('edge function') ||
    normalizedMessage.includes('failed to send a request')
  ) {
    return 'Det gick inte att skicka inbjudan just nu. Försök igen om en stund.'
  }

  return 'Det gick inte att skicka inbjudan just nu. Försök igen om en stund.'
}

export default function Users() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/', { replace: true })
      return
    }
    listUsers()
      .then(setUsers)
      .catch(err => {
        setLoadError(err instanceof Error ? err.message : 'Kunde inte hämta användare')
      })
      .finally(() => setLoading(false))
  }, [user, navigate])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteStatus(null)
    setInviting(true)
    try {
      await inviteUser(inviteEmail)
      setInviteStatus({ type: 'success', message: `Inbjudan skickad till ${inviteEmail}` })
      setInviteEmail('')
      // Reload list so newly invited user (with pending profile) shows up
      const updated = await listUsers()
      setUsers(updated)
    } catch (err) {
      console.error('Kunde inte skicka inbjudan:', err)
      setInviteStatus({ type: 'error', message: getInviteErrorMessage(err) })
    } finally {
      setInviting(false)
    }
  }

  async function handleDelete(userId: string) {
    setDeleteError(null)
    try {
      await deleteUser(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
      setConfirmDeleteId(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Okänt fel'
      setDeleteError(msg)
      setConfirmDeleteId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Användare</h1>
        <p className="text-sm text-slate-500 mt-1">{users.length} användare totalt</p>
      </div>

      {loadError && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {loadError}
        </div>
      )}

      {/* Bjud in ny användare */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Bjud in ny användare</h2>
        <form onSubmit={handleInvite} className="flex gap-3">
          <input
            type="email"
            className="input flex-1"
            placeholder="E-postadress"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            required
            disabled={inviting}
          />
          <button type="submit" className="btn-primary" disabled={inviting}>
            {inviting ? 'Skickar…' : 'Bjud in'}
          </button>
        </form>
        {inviteStatus && (
          <p
            role="status"
            className={`mt-3 text-sm ${inviteStatus.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}
          >
            {inviteStatus.message}
          </p>
        )}
      </div>

      {/* Användarlista */}
      <div className="card overflow-hidden">
        {deleteError && (
          <div role="alert" className="px-4 py-3 bg-red-50 border-b border-red-100 text-red-700 text-sm">
            {deleteError}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">E-post</th>
                <th className="table-header">Roll</th>
                <th className="table-header text-right">Åtgärder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="table-cell font-medium text-slate-900">{u.email}</td>
                  <td className="table-cell">
                    <span className={u.role === 'admin' ? 'badge-blue' : 'badge-slate'}>
                      {u.role === 'admin' ? 'Admin' : 'Arbetstagare'}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    {u.id === user?.id ? (
                      <span className="text-xs text-slate-400 italic">Du</span>
                    ) : confirmDeleteId === u.id ? (
                      <span className="inline-flex gap-2">
                        <button
                          className="btn-danger text-xs px-2 py-1"
                          onClick={() => handleDelete(u.id)}
                        >
                          Bekräfta
                        </button>
                        <button
                          className="btn-secondary text-xs px-2 py-1"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Avbryt
                        </button>
                      </span>
                    ) : (
                      <button
                        className="btn-secondary text-xs px-2 py-1 text-red-600 hover:bg-red-50"
                        onClick={() => setConfirmDeleteId(u.id)}
                      >
                        Ta bort
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
