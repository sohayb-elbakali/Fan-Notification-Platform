'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Flag, Trash2, Users, X } from 'lucide-react'

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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 className="page-title">Équipes CAN 2025</h1>
                            <p className="page-subtitle">Gérer les équipes participantes au tournoi</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={20} /> Nouvelle équipe
                        </button>
                    </div>
                </div>

                {message && (
                    <div className={`alert alert-${message.type}`}>
                        {message.text}
                        <button
                            onClick={() => setMessage(null)}
                            style={{
                                marginLeft: 'auto',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'inherit',
                                padding: '0.25rem',
                                display: 'flex'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="empty-state">
                        <div style={{
                            width: '40px',
                            height: '40px',
                            border: '3px solid var(--surface-light)',
                            borderTopColor: 'var(--gold)',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 1rem'
                        }}></div>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        Chargement...
                    </div>
                ) : teams.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🏳️</div>
                        <p style={{ fontSize: '1.1rem' }}>Aucune équipe enregistrée</p>
                        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Créez votre première équipe pour commencer!</p>
                    </div>
                ) : (
                    <div className="grid grid-3">
                        {teams.map(team => (
                            <div key={team.id} className="card">
                                <div className="card-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Flag size={24} style={{ color: 'white' }} />
                                        </div>
                                        <span className="card-title">{team.name}</span>
                                    </div>
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => handleDelete(team.id)}
                                        title="Supprimer"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '1rem' }}>
                                    📍 {team.country}
                                </p>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem',
                                    background: 'rgba(212, 175, 55, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid rgba(212, 175, 55, 0.2)'
                                }}>
                                    <Users size={18} style={{ color: 'var(--gold)' }} />
                                    <span style={{ color: 'var(--gold)', fontWeight: '600' }}>
                                        {team.fan_count || 0} fans abonnés
                                    </span>
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
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    padding: '0.25rem',
                                    display: 'flex',
                                    transition: 'color 0.2s'
                                }}
                                onMouseEnter={e => e.target.style.color = 'var(--text)'}
                                onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
                            >
                                <X size={24} />
                            </button>
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
                            <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
                                <Flag size={18} /> Créer l'équipe
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
