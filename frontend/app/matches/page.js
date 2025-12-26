'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Calendar, MapPin, Trophy, Target, X, Clock } from 'lucide-react'

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
                setMessage({ type: 'success', text: `⚽ But enregistré! Événement: goal.scored (${data.eventId?.slice(0, 8)}...)` })
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
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'LIVE':
                return <span className="badge badge-danger">🔴 EN DIRECT</span>
            case 'FINISHED':
                return <span className="badge badge-success">✓ TERMINÉ</span>
            default:
                return <span className="badge badge-info">{status}</span>
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
                        <Link href="/teams" className="nav-link">Équipes</Link>
                        <Link href="/fans" className="nav-link">Fans</Link>
                        <Link href="/matches" className="nav-link active">Matchs</Link>
                        <Link href="/alerts" className="nav-link">Alertes</Link>
                    </nav>
                </div>
            </header>

            <main className="container">
                <div className="page-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 className="page-title">Matchs CAN 2025</h1>
                            <p className="page-subtitle">Gérer les matchs et enregistrer les buts</p>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowModal(true)}
                            disabled={teams.length < 2}
                            style={teams.length < 2 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                            <Plus size={20} /> Nouveau match
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

                {teams.length < 2 && (
                    <div className="alert alert-warning">
                        ⚠️ Créez au moins 2 équipes avant de pouvoir créer un match.
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
                ) : matches.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📅</div>
                        <p style={{ fontSize: '1.1rem' }}>Aucun match programmé</p>
                        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                            Créez votre premier match pour démarrer le tournoi!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-2">
                        {matches.map(match => (
                            <div key={match.id} className="match-card">
                                {/* Match Header with Teams */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '1.5rem',
                                    paddingBottom: '1.25rem',
                                    borderBottom: '1px solid rgba(212, 175, 55, 0.15)'
                                }}>
                                    {/* Team A */}
                                    <div style={{ textAlign: 'center', flex: 1 }}>
                                        <div style={{
                                            width: '50px',
                                            height: '50px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto 0.75rem',
                                            fontSize: '1.5rem'
                                        }}>
                                            🏳️
                                        </div>
                                        <div className="team-name">{match.teamA?.name}</div>
                                        <div className="match-score">{match.teamA?.goals || 0}</div>
                                    </div>

                                    {/* VS & Time */}
                                    <div style={{ textAlign: 'center', padding: '0 1rem' }}>
                                        <span className="match-vs">VS</span>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-muted)',
                                            marginTop: '0.5rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.25rem'
                                        }}>
                                            <Clock size={12} />
                                            {formatDate(match.kickoffTime)}
                                        </div>
                                    </div>

                                    {/* Team B */}
                                    <div style={{ textAlign: 'center', flex: 1 }}>
                                        <div style={{
                                            width: '50px',
                                            height: '50px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, var(--secondary), var(--secondary-dark))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto 0.75rem',
                                            fontSize: '1.5rem'
                                        }}>
                                            🏳️
                                        </div>
                                        <div className="team-name">{match.teamB?.name}</div>
                                        <div className="match-score">{match.teamB?.goals || 0}</div>
                                    </div>
                                </div>

                                {/* Match Info */}
                                <div className="match-info" style={{ marginBottom: '1.25rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        🏟️ {match.stadium}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <MapPin size={14} /> {match.city}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    {getStatusBadge(match.status)}
                                    <button
                                        className="btn btn-sm btn-gold"
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
                            <button
                                onClick={() => setShowModal(false)}
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
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">🔴 Équipe A</label>
                                    <select
                                        className="form-select"
                                        value={formData.teamAId}
                                        onChange={e => setFormData({ ...formData, teamAId: e.target.value })}
                                        required
                                    >
                                        <option value="">Sélectionner...</option>
                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">🟢 Équipe B</label>
                                    <select
                                        className="form-select"
                                        value={formData.teamBId}
                                        onChange={e => setFormData({ ...formData, teamBId: e.target.value })}
                                        required
                                    >
                                        <option value="">Sélectionner...</option>
                                        {teams.filter(t => t.id !== formData.teamAId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">🏟️ Stade</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.stadium}
                                    onChange={e => setFormData({ ...formData, stadium: e.target.value })}
                                    placeholder="Stade Mohammed V"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">📍 Ville</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.city}
                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="Casablanca"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">📅 Date et heure du coup d'envoi</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={formData.kickoffTime}
                                    onChange={e => setFormData({ ...formData, kickoffTime: e.target.value })}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
                                <Calendar size={18} /> Créer le match
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
                            <h2 className="modal-title">⚽ Ajouter un but</h2>
                            <button
                                onClick={() => setShowGoalModal(null)}
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
                        <div style={{
                            padding: '1rem',
                            background: 'rgba(212, 175, 55, 0.1)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '1.5rem',
                            textAlign: 'center'
                        }}>
                            <span style={{ fontWeight: '600', color: 'var(--gold)' }}>
                                {showGoalModal.teamA?.name} vs {showGoalModal.teamB?.name}
                            </span>
                        </div>
                        <form onSubmit={handleGoal}>
                            <div className="form-group">
                                <label className="form-label">Équipe qui marque</label>
                                <select
                                    className="form-select"
                                    value={goalData.teamId}
                                    onChange={e => setGoalData({ ...goalData, teamId: e.target.value })}
                                    required
                                >
                                    <option value={showGoalModal.teamA?.id}>🔴 {showGoalModal.teamA?.name}</option>
                                    <option value={showGoalModal.teamB?.id}>🟢 {showGoalModal.teamB?.name}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Minute du but</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={goalData.minute}
                                    onChange={e => setGoalData({ ...goalData, minute: e.target.value })}
                                    placeholder="45"
                                    min="1"
                                    max="120"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Buteur (optionnel)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={goalData.player}
                                    onChange={e => setGoalData({ ...goalData, player: e.target.value })}
                                    placeholder="Nom du joueur"
                                />
                            </div>
                            <button type="submit" className="btn btn-gold" style={{ width: '100%' }}>
                                <Trophy size={18} /> Enregistrer le but
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
