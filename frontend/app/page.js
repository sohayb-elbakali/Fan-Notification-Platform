'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trophy, Users, Calendar, AlertTriangle, Bell, Zap } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export default function HomePage() {
    const [stats, setStats] = useState({ fans: 0, teams: 0, matches: 0 })
    const [recentMatches, setRecentMatches] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [fansRes, teamsRes, matchesRes] = await Promise.all([
                fetch(`${API_URL}/fans`).catch(() => ({ json: () => ({ count: 0 }) })),
                fetch(`${API_URL}/teams`).catch(() => ({ json: () => ({ count: 0 }) })),
                fetch(`${API_URL}/matches`).catch(() => ({ json: () => ({ count: 0, matches: [] }) }))
            ])

            const fans = await fansRes.json()
            const teams = await teamsRes.json()
            const matches = await matchesRes.json()

            setStats({
                fans: fans.count || 0,
                teams: teams.count || 0,
                matches: matches.count || 0
            })
            setRecentMatches((matches.matches || []).slice(0, 3))
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            {/* Header */}
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
                        <Link href="/alerts" className="nav-link">Alertes</Link>
                    </nav>
                </div>
            </header>

            <main className="container">
                {/* Hero Section */}
                <section style={{ textAlign: 'center', padding: '4rem 0' }}>
                    <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem' }}>
                        <span style={{ background: 'linear-gradient(135deg, #059669, #0891b2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Fan Notification Platform
                        </span>
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 2rem' }}>
                        Suivez la CAN 2025 en temps réel. Recevez des notifications pour vos équipes favorites.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <Link href="/fans" className="btn btn-primary">
                            <Users size={20} /> S'inscrire
                        </Link>
                        <Link href="/matches" className="btn btn-secondary">
                            <Calendar size={20} /> Voir les matchs
                        </Link>
                    </div>
                </section>

                {/* Stats */}
                <section className="stats-grid" style={{ marginBottom: '3rem' }}>
                    <div className="stat-card">
                        <div className="stat-value">{stats.teams}</div>
                        <div className="stat-label">Équipes</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.fans}</div>
                        <div className="stat-label">Fans inscrits</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.matches}</div>
                        <div className="stat-label">Matchs programmés</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">
                            <Zap size={40} style={{ color: '#f59e0b' }} />
                        </div>
                        <div className="stat-label">Notifications temps réel</div>
                    </div>
                </section>

                {/* Features */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 className="page-title" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        Fonctionnalités
                    </h2>
                    <div className="grid grid-3">
                        <div className="card">
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📅</div>
                            <h3 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Calendrier des matchs</h3>
                            <p style={{ color: 'var(--text-muted)' }}>
                                Recevez une notification avec la date, l'heure et le stade pour chaque match.
                            </p>
                        </div>
                        <div className="card">
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚽</div>
                            <h3 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Buts en direct</h3>
                            <p style={{ color: 'var(--text-muted)' }}>
                                Soyez alerté instantanément lorsqu'un but est marqué avec le score mis à jour.
                            </p>
                        </div>
                        <div className="card">
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
                            <h3 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Alertes</h3>
                            <p style={{ color: 'var(--text-muted)' }}>
                                Recevez des alertes météo, sécurité ou trafic pour planifier votre déplacement.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Recent Matches */}
                {recentMatches.length > 0 && (
                    <section style={{ marginBottom: '3rem' }}>
                        <h2 className="page-title" style={{ marginBottom: '1.5rem' }}>
                            Matchs récents
                        </h2>
                        <div className="grid grid-3">
                            {recentMatches.map(match => (
                                <div key={match.id} className="match-card">
                                    <div className="match-teams">
                                        <span className="team-name">{match.teamA?.name || 'Équipe A'}</span>
                                        <span className="match-vs">VS</span>
                                        <span className="team-name">{match.teamB?.name || 'Équipe B'}</span>
                                    </div>
                                    <div className="match-info">
                                        <span>🏟️ {match.stadium}</span>
                                        <span>📍 {match.city}</span>
                                    </div>
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <span className={`badge ${match.status === 'LIVE' ? 'badge-danger' : 'badge-info'}`}>
                                            {match.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Architecture Info */}
                <section className="card" style={{ marginBottom: '3rem', textAlign: 'center' }}>
                    <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Architecture Multi-Cloud</h3>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>☁️</div>
                            <strong>GCP</strong>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Cloud Run + CI/CD</p>
                        </div>
                        <div>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔷</div>
                            <strong>Azure</strong>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>SQL Database</p>
                        </div>
                        <div>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔶</div>
                            <strong>AWS</strong>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Events + Email</p>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', borderTop: '1px solid var(--surface-light)' }}>
                <p>CAN 2025 Fan Notification Platform - Projet Multi-Cloud</p>
            </footer>
        </div>
    )
}
