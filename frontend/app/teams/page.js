'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Flag, Trash2, Users } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export default function TeamsPage() {
    const [teams, setTeams] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({ name: '', country: '' })
    const [message, setMessage] = useState(null)

    useEffect(() => { fetchTeams() }, [])

    const fetchTeams = async () => {
        try {
            const res = await fetch(`${API_URL}/teams`)
            const data = await res.json()
            setTeams(data.teams || [])
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const res = await fetch(`${API_URL}/teams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            const data = await res.json()
            if (res.ok) {
                setMessage({ type: 'success', text: 'Équipe créée avec succès!' })
                setShowModal(false)
                setFormData({ name: '', country: '' })
                fetchTeams()
            } else {
                setMessage({ type: 'danger', text: data.error })
            }
        } catch (error) {
            setMessage({ type: 'danger', text: 'Erreur de connexion' })
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Supprimer cette équipe?')) return
        try {
            await fetch(`${API_URL}/teams/${id}`, { method: 'DELETE' })
            fetchTeams()
        } catch (error) {
            console.error('Error:', error)
        }
    }

    return (
        <div>
            <header className="header">
                <div className="container header-content">
                    <Link href="/" className="logo">
                        <span className="logo-icon">⚽</span>
                        <span>CAN 2025</span>
                    </Link>
                    <nav>
                        <Link href="/teams" className="nav-link active">Équipes</Link>
                        <Link href="/fans" className="nav-link">Fans</Link>
                        <Link href="/matches" className="nav-link">Matchs</Link>
                        <Link href="/alerts" className="nav-link">Alertes</Link>
                    </nav>
                </div>
            </header>

            <main className="container">
                <div className="page-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 className="page-title">Équipes CAN 2025</h1>
                            <p className="page-subtitle">Gérer les équipes participantes</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={20} /> Nouvelle équipe
                        </button>
                    </div>
                </div>

                {message && (
                    <div className={`alert alert-${message.type}`}>
                        {message.text}
                        <button onClick={() => setMessage(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
                    </div>
                )}

                {loading ? (
                    <div className="empty-state">Chargement...</div>
                ) : teams.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🏳️</div>
                        <p>Aucune équipe. Créez votre première équipe!</p>
                    </div>
                ) : (
                    <div className="grid grid-3">
                        {teams.map(team => (
                            <div key={team.id} className="card">
                                <div className="card-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Flag size={24} style={{ color: 'var(--primary)' }} />
                                        <span className="card-title">{team.name}</span>
                                    </div>
                                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(team.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    {team.country}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)' }}>
                                    <Users size={16} />
                                    <span>{team.fan_count || 0} fans</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Nouvelle équipe</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '1.5rem' }}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Nom de l'équipe</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Lions de l'Atlas"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Pays</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.country}
                                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                                    placeholder="Ex: Maroc"
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                Créer l'équipe
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
