'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Calendar, MapPin, Trophy, Target } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export default function MatchesPage() {
    const [matches, setMatches] = useState([])
    const [teams, setTeams] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showGoalModal, setShowGoalModal] = useState(null)
    const [formData, setFormData] = useState({
        teamAId: '', teamBId: '', stadium: '', city: '', kickoffTime: ''
    })
    const [goalData, setGoalData] = useState({ teamId: '', minute: '', player: '' })
    const [message, setMessage] = useState(null)

    useEffect(() => { fetchData() }, [])

    const fetchData = async () => {
        try {
            const [matchesRes, teamsRes] = await Promise.all([
                fetch(`${API_URL}/matches`),
                fetch(`${API_URL}/teams`)
            ])
            const matchesData = await matchesRes.json()
            const teamsData = await teamsRes.json()
            setMatches(matchesData.matches || [])
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
            const res = await fetch(`${API_URL}/matches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            const data = await res.json()
            if (res.ok) {
                setMessage({ type: 'success', text: `Match créé! Événement: match.scheduled (${data.eventId?.slice(0, 8)}...)` })
                setShowModal(false)
                setFormData({ teamAId: '', teamBId: '', stadium: '', city: '', kickoffTime: '' })
                fetchData()
            } else {
                setMessage({ type: 'danger', text: data.error })
            }
        } catch (error) {
            setMessage({ type: 'danger', text: 'Erreur de connexion' })
        }
    }

    const handleGoal = async (e) => {
        e.preventDefault()
        try {
            const res = await fetch(`${API_URL}/matches/${showGoalModal.id}/goals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teamId: goalData.teamId,
                    minute: parseInt(goalData.minute),
                    player: goalData.player
                })
            })
            const data = await res.json()
            if (res.ok) {
                setMessage({ type: 'success', text: `But enregistré! Événement: goal.scored (${data.eventId?.slice(0, 8)}...)` })
                setShowGoalModal(null)
                setGoalData({ teamId: '', minute: '', player: '' })
                fetchData()
            } else {
                setMessage({ type: 'danger', text: data.error })
            }
        } catch (error) {
            setMessage({ type: 'danger', text: 'Erreur de connexion' })
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
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
                        <Link href="/fans" className="nav-link">Fans</Link>
                        <Link href="/matches" className="nav-link active">Matchs</Link>
                        <Link href="/alerts" className="nav-link">Alertes</Link>
                    </nav>
                </div>
            </header>

            <main className="container">
                <div className="page-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 className="page-title">Matchs CAN 2025</h1>
                            <p className="page-subtitle">Gérer les matchs et les buts</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={teams.length < 2}>
                            <Plus size={20} /> Nouveau match
                        </button>
                    </div>
                </div>

                {message && (
                    <div className={`alert alert-${message.type}`}>
                        {message.text}
                        <button onClick={() => setMessage(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
                    </div>
                )}

                {teams.length < 2 && (
                    <div className="alert alert-warning">
                        Créez au moins 2 équipes avant de pouvoir créer un match.
                    </div>
                )}

                {loading ? (
                    <div className="empty-state">Chargement...</div>
                ) : matches.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📅</div>
                        <p>Aucun match programmé</p>
                    </div>
                ) : (
                    <div className="grid grid-2">
                        {matches.map(match => (
                            <div key={match.id} className="match-card">
                                <div className="match-teams">
                                    <div style={{ textAlign: 'center' }}>
                                        <div className="team-name">{match.teamA?.name}</div>
                                        <div className="match-score">{match.teamA?.goals || 0}</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <span className="match-vs">VS</span>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {formatDate(match.kickoffTime)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div className="team-name">{match.teamB?.name}</div>
                                        <div className="match-score">{match.teamB?.goals || 0}</div>
                                    </div>
                                </div>
                                <div className="match-info" style={{ marginBottom: '1rem' }}>
                                    <span><MapPin size={14} /> {match.stadium}</span>
                                    <span>📍 {match.city}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className={`badge ${match.status === 'LIVE' ? 'badge-danger' : match.status === 'FINISHED' ? 'badge-success' : 'badge-info'}`}>
                                        {match.status}
                                    </span>
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => {
                                            setShowGoalModal(match)
                                            setGoalData({ teamId: match.teamA?.id || '', minute: '', player: '' })
                                        }}
                                    >
                                        <Target size={14} /> Ajouter but
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* New Match Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Nouveau match</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '1.5rem' }}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Équipe A</label>
                                <select className="form-select" value={formData.teamAId} onChange={e => setFormData({ ...formData, teamAId: e.target.value })} required>
                                    <option value="">Sélectionner...</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Équipe B</label>
                                <select className="form-select" value={formData.teamBId} onChange={e => setFormData({ ...formData, teamBId: e.target.value })} required>
                                    <option value="">Sélectionner...</option>
                                    {teams.filter(t => t.id !== formData.teamAId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Stade</label>
                                <input type="text" className="form-input" value={formData.stadium} onChange={e => setFormData({ ...formData, stadium: e.target.value })} placeholder="Stade Mohammed V" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ville</label>
                                <input type="text" className="form-input" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} placeholder="Casablanca" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date et heure</label>
                                <input type="datetime-local" className="form-input" value={formData.kickoffTime} onChange={e => setFormData({ ...formData, kickoffTime: e.target.value })} required />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                Créer le match
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Goal Modal */}
            {showGoalModal && (
                <div className="modal-overlay" onClick={() => setShowGoalModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Ajouter un but</h2>
                            <button onClick={() => setShowGoalModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '1.5rem' }}>✕</button>
                        </div>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            {showGoalModal.teamA?.name} vs {showGoalModal.teamB?.name}
                        </p>
                        <form onSubmit={handleGoal}>
                            <div className="form-group">
                                <label className="form-label">Équipe qui marque</label>
                                <select className="form-select" value={goalData.teamId} onChange={e => setGoalData({ ...goalData, teamId: e.target.value })} required>
                                    <option value={showGoalModal.teamA?.id}>{showGoalModal.teamA?.name}</option>
                                    <option value={showGoalModal.teamB?.id}>{showGoalModal.teamB?.name}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Minute</label>
                                <input type="number" className="form-input" value={goalData.minute} onChange={e => setGoalData({ ...goalData, minute: e.target.value })} placeholder="45" min="1" max="120" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Joueur (optionnel)</label>
                                <input type="text" className="form-input" value={goalData.player} onChange={e => setGoalData({ ...goalData, player: e.target.value })} placeholder="Nom du buteur" />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                <Trophy size={18} /> Enregistrer le but
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
