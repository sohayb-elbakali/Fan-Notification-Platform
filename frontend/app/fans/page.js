'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Mail, Trash2, Heart, X, Globe } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export default function FansPage() {
    const [fans, setFans] = useState([])
    const [teams, setTeams] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showSubModal, setShowSubModal] = useState(null)
    const [formData, setFormData] = useState({ email: '', language: 'fr' })
    const [message, setMessage] = useState(null)

    useEffect(() => { fetchData() }, [])

    const fetchData = async () => {
        try {
            const [fansRes, teamsRes] = await Promise.all([
                fetch(`${API_URL}/fans`),
                fetch(`${API_URL}/teams`)
            ])
            const fansData = await fansRes.json()
            const teamsData = await teamsRes.json()
            setFans(fansData.fans || [])
            setTeams(teamsData.teams || [])
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const res = await fetch(`${API_URL}/fans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            const data = await res.json()
            if (res.ok) {
                setMessage({ type: 'success', text: 'Fan inscrit avec succès!' })
                setShowModal(false)
                setFormData({ email: '', language: 'fr' })
                fetchData()
            } else {
                setMessage({ type: 'danger', text: data.error })
            }
        } catch (error) {
            setMessage({ type: 'danger', text: 'Erreur de connexion' })
        }
    }

    const handleSubscribe = async (fanId, teamId) => {
        try {
            const res = await fetch(`${API_URL}/fans/${fanId}/teams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId })
            })
            if (res.ok) {
                setMessage({ type: 'success', text: 'Abonnement réussi!' })
                setShowSubModal(null)
                fetchData()
            } else {
                const data = await res.json()
                setMessage({ type: 'danger', text: data.error })
            }
        } catch (error) {
            setMessage({ type: 'danger', text: 'Erreur de connexion' })
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Supprimer ce fan?')) return
        try {
            await fetch(`${API_URL}/fans/${id}`, { method: 'DELETE' })
            fetchData()
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const getLanguageLabel = (lang) => {
        const languages = { fr: '🇫🇷 Français', en: '🇬🇧 English', ar: '🇸🇦 العربية' }
        return languages[lang] || lang?.toUpperCase()
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
                        <Link href="/teams" className="nav-link">Équipes</Link>
                        <Link href="/fans" className="nav-link active">Fans</Link>
                        <Link href="/matches" className="nav-link">Matchs</Link>
                        <Link href="/alerts" className="nav-link">Alertes</Link>
                    </nav>
                </div>
            </header>

            <main className="container">
                <div className="page-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 className="page-title">Fans inscrits</h1>
                            <p className="page-subtitle">Gérer les fans et leurs abonnements aux équipes</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={20} /> Nouveau fan
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
                ) : fans.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">👥</div>
                        <p style={{ fontSize: '1.1rem' }}>Aucun fan inscrit</p>
                        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Inscrivez le premier fan pour commencer!</p>
                    </div>
                ) : (
                    <div className="card" style={{ overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Email</th>
                                        <th>Langue</th>
                                        <th>Équipes suivies</th>
                                        <th style={{ width: '200px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fans.map(fan => (
                                        <tr key={fan.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, var(--primary), var(--gold))',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <Mail size={16} style={{ color: 'white' }} />
                                                    </div>
                                                    <span style={{ fontWeight: '500' }}>{fan.email}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.35rem',
                                                    padding: '0.35rem 0.75rem',
                                                    background: 'rgba(212, 175, 55, 0.1)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {getLanguageLabel(fan.language)}
                                                </span>
                                            </td>
                                            <td>
                                                {fan.teams ? (
                                                    <span style={{ color: 'var(--secondary-light)', fontWeight: '500' }}>
                                                        {fan.teams}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        className="btn btn-sm btn-success"
                                                        onClick={() => setShowSubModal(fan.id)}
                                                    >
                                                        <Heart size={14} /> Abonner
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => handleDelete(fan.id)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* New Fan Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Nouveau fan</h2>
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
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Adresse email</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="fan@example.com"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Langue préférée</label>
                                <select
                                    className="form-select"
                                    value={formData.language}
                                    onChange={e => setFormData({ ...formData, language: e.target.value })}
                                >
                                    <option value="fr">🇫🇷 Français</option>
                                    <option value="en">🇬🇧 English</option>
                                    <option value="ar">🇸🇦 العربية</option>
                                </select>
                            </div>
                            <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
                                <Mail size={18} /> Inscrire le fan
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Subscribe Modal */}
            {showSubModal && (
                <div className="modal-overlay" onClick={() => setShowSubModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Abonner à une équipe</h2>
                            <button
                                onClick={() => setShowSubModal(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    padding: '0.25rem',
                                    display: 'flex'
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        {teams.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏳️</div>
                                <p>Aucune équipe disponible</p>
                                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                    Créez d'abord des équipes pour pouvoir y abonner des fans.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {teams.map(team => (
                                    <button
                                        key={team.id}
                                        className="btn btn-secondary"
                                        onClick={() => handleSubscribe(showSubModal, team.id)}
                                        style={{
                                            justifyContent: 'flex-start',
                                            padding: '1rem 1.25rem'
                                        }}
                                    >
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: '0.5rem'
                                        }}>
                                            🏳️
                                        </div>
                                        <span style={{ fontWeight: '600' }}>{team.name}</span>
                                        <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                            ({team.country})
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
