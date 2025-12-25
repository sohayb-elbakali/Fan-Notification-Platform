'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, AlertTriangle, Cloud, Shield, Car } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

const CATEGORIES = [
    { value: 'WEATHER', label: 'Météo', icon: Cloud, color: '#0891b2' },
    { value: 'SECURITY', label: 'Sécurité', icon: Shield, color: '#ef4444' },
    { value: 'TRAFFIC', label: 'Trafic', icon: Car, color: '#f59e0b' },
    { value: 'GENERAL', label: 'Général', icon: AlertTriangle, color: '#8b5cf6' }
]

const SEVERITIES = [
    { value: 'INFO', label: 'Information', color: '#0891b2' },
    { value: 'WARN', label: 'Avertissement', color: '#f59e0b' },
    { value: 'CRITICAL', label: 'Critique', color: '#ef4444' }
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
        return <Icon size={20} style={{ color: found.color }} />
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleString('fr-FR')
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 className="page-title">Alertes</h1>
                            <p className="page-subtitle">Publier des alertes météo, sécurité ou trafic</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={20} /> Nouvelle alerte
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
                ) : alerts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">⚠️</div>
                        <p>Aucune alerte publiée</p>
                    </div>
                ) : (
                    <div className="grid grid-2">
                        {alerts.map(alert => (
                            <div key={alert.id} className="card">
                                <div className="card-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {getCategoryIcon(alert.category)}
                                        <span className="card-title">{alert.category}</span>
                                    </div>
                                    <span className={`badge ${alert.severity === 'CRITICAL' ? 'badge-danger' : alert.severity === 'WARN' ? 'badge-warning' : 'badge-info'}`}>
                                        {alert.severity}
                                    </span>
                                </div>
                                <p style={{ marginBottom: '0.75rem' }}>{alert.message}</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    <span>📍 {alert.scopeType}: {alert.scopeId || 'Tous'}</span>
                                    <span>{formatDate(alert.createdAt)}</span>
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
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '1.5rem' }}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Type de portée</label>
                                <select className="form-select" value={formData.scopeType} onChange={e => setFormData({ ...formData, scopeType: e.target.value })}>
                                    <option value="CITY">Ville</option>
                                    <option value="STADIUM">Stade</option>
                                    <option value="MATCH">Match</option>
                                    <option value="ALL">Tous</option>
                                </select>
                            </div>
                            {formData.scopeType !== 'ALL' && (
                                <div className="form-group">
                                    <label className="form-label">Identifiant de portée</label>
                                    <input type="text" className="form-input" value={formData.scopeId} onChange={e => setFormData({ ...formData, scopeId: e.target.value })} placeholder="Ex: Casablanca" required />
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Catégorie</label>
                                <select className="form-select" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Sévérité</label>
                                <select className="form-select" value={formData.severity} onChange={e => setFormData({ ...formData, severity: e.target.value })}>
                                    {SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Message</label>
                                <textarea
                                    className="form-input"
                                    rows={3}
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                    placeholder="Détails de l'alerte..."
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                <AlertTriangle size={18} /> Publier l'alerte
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
