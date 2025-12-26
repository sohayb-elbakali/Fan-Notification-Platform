'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, AlertTriangle, Cloud, Shield, Car, X, Bell, Info } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

const CATEGORIES = [
    { value: 'WEATHER', label: 'Conditions Météo', icon: Cloud, color: '#0891b2' },
    { value: 'SECURITY', label: 'Sécurité & Accès', icon: Shield, color: '#ef4444' },
    { value: 'TRAFFIC', label: 'Trafic & Transport', icon: Car, color: '#f59e0b' },
    { value: 'GENERAL', label: 'Information Générale', icon: Info, color: '#8b5cf6' }
]

const SEVERITIES = [
    { value: 'INFO', label: 'Information', color: '#0891b2' },
    { value: 'WARN', label: 'Attention', color: '#f59e0b' },
    { value: 'CRITICAL', label: 'Urgent', color: '#ef4444' }
]

export default function AlertsPage() {
    const [alerts, setAlerts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({
        scopeType: 'CITY', scopeId: '', category: 'WEATHER', severity: 'INFO', message: ''
    })
    const [message, setMessage] = useState(null)

    useEffect(() => { fetchAlerts() }, [])

    const fetchAlerts = async () => {
        try {
            const res = await fetch(`${API_URL}/alerts`)
            const data = await res.json()
            setAlerts(data.alerts || [])
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const res = await fetch(`${API_URL}/alerts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            const data = await res.json()
            if (res.ok) {
                setMessage({ type: 'success', text: `Alerte publiée! Événement: alert.published (${data.eventId?.slice(0, 8)}...)` })
                setShowModal(false)
                setFormData({ scopeType: 'CITY', scopeId: '', category: 'WEATHER', severity: 'INFO', message: '' })
                fetchAlerts()
            } else {
                setMessage({ type: 'danger', text: data.error })
            }
        } catch (error) {
            setMessage({ type: 'danger', text: 'Erreur de connexion' })
        }
    }

    const getCategoryIcon = (cat) => {
        const found = CATEGORIES.find(c => c.value === cat)
        if (!found) return <AlertTriangle size={20} />
        const Icon = found.icon
        // Use gold/white for icons in the dark theme context
        return <Icon size={20} style={{ color: 'var(--text-light)' }} />
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleString('fr-FR', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        })
    }

    const getSeverityBadge = (severity) => {
        switch (severity) {
            case 'CRITICAL': return <span className="badge badge-danger">Urgent</span>
            case 'WARN': return <span className="badge badge-warning">Attention</span>
            default: return <span className="badge badge-info">Info</span>
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
                        <Link href="/matches" className="nav-link">Matchs</Link>
                        <Link href="/alerts" className="nav-link active">Alertes</Link>
                    </nav>
                </div>
            </header>

            <main className="container">
                <div className="page-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 className="page-title">Alertes & Notifications</h1>
                            <p className="page-subtitle">Informations en temps réel pour les supporters</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={20} /> Nouvelle alerte
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
                        Chargement des alertes...
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔕</div>
                        <p style={{ fontSize: '1.1rem' }}>Aucune alerte active</p>
                        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Les notifications importantes apparaîtront ici.</p>
                    </div>
                ) : (
                    <div className="grid grid-2">
                        {alerts.map(alert => (
                            <div key={alert.id} className="card">
                                <div className="card-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {getCategoryIcon(alert.category)}
                                        </div>
                                        <div>
                                            <div className="card-title" style={{ fontSize: '1.1rem' }}>
                                                {CATEGORIES.find(c => c.value === alert.category)?.label || alert.category}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {formatDate(alert.createdAt)}
                                            </div>
                                        </div>
                                    </div>
                                    {getSeverityBadge(alert.severity)}
                                </div>
                                <p style={{
                                    marginBottom: '1.25rem',
                                    fontSize: '0.95rem',
                                    lineHeight: '1.6',
                                    color: 'var(--text-light)'
                                }}>
                                    {alert.message}
                                </p>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    paddingTop: '1rem',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                                    color: 'var(--text-muted)',
                                    fontSize: '0.85rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <TargetIcon type={alert.scopeType} />
                                        <span style={{ fontWeight: '500', color: 'var(--gold)' }}>
                                            {formatScope(alert.scopeType, alert.scopeId)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* New Alert Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Nouvelle alerte</h2>
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
                            <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Catégorie</label>
                                    <select
                                        className="form-select"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Niveau d'urgence</label>
                                    <select
                                        className="form-select"
                                        value={formData.severity}
                                        onChange={e => setFormData({ ...formData, severity: e.target.value })}
                                    >
                                        {SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Cible</label>
                                    <select
                                        className="form-select"
                                        value={formData.scopeType}
                                        onChange={e => setFormData({ ...formData, scopeType: e.target.value })}
                                    >
                                        <option value="CITY">Ville Spécifique</option>
                                        <option value="STADIUM">Stade</option>
                                        <option value="MATCH">Match</option>
                                        <option value="ALL">Tout le monde</option>
                                    </select>
                                </div>
                                {formData.scopeType !== 'ALL' && (
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Identifiant (Nom)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.scopeId}
                                            onChange={e => setFormData({ ...formData, scopeId: e.target.value })}
                                            placeholder="Ex: Casablanca"
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Message</label>
                                <textarea
                                    className="form-input"
                                    rows={4}
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                    placeholder="Détails de l'alerte à diffuser..."
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                <Bell size={18} /> Diffuser l'alerte
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

// Helper components
function TargetIcon({ type }) {
    switch (type) {
        case 'CITY': return <span title="Ville">🏙️</span>
        case 'STADIUM': return <span title="Stade">🏟️</span>
        case 'MATCH': return <span title="Match">⚽</span>
        case 'ALL': return <span title="Global">🌍</span>
        default: return <span>📍</span>
    }
}

function formatScope(type, id) {
    if (type === 'ALL') return 'Diffusion Globale'
    return `${id || 'N/A'}`
}
