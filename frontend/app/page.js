'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trophy, Users, Calendar, AlertTriangle, Bell, Zap, Flag, MapPin, Star } from 'lucide-react'

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
                <section style={{ textAlign: 'center', padding: '5rem 0 4rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <span style={{
                            display: 'inline-block',
                            padding: '0.5rem 1.25rem',
                            background: 'linear-gradient(135deg, rgba(196, 30, 58, 0.15), rgba(29, 111, 66, 0.15))',
                            borderRadius: '9999px',
                            border: '1px solid rgba(212, 175, 55, 0.3)',
                            color: '#D4AF37',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase'
                        }}>
                            🏆 Maroc 2025
                        </span>
                    </div>
                    <h1 className="hero-title">
                        <span className="hero-gradient">
                            Fan Notification Platform
                        </span>
                    </h1>
                    <p style={{
                        fontSize: '1.25rem',
                        color: 'var(--text-muted)',
                        maxWidth: '650px',
                        margin: '0 auto 2.5rem',
                        lineHeight: '1.7'
                    }}>
                        Suivez la Coupe d'Afrique des Nations 2025 en temps réel.
                        Recevez des notifications instantanées pour vos équipes favorites.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link href="/fans" className="btn btn-primary">
                            <Users size={20} /> S'inscrire
                        </Link>
                        <Link href="/matches" className="btn btn-success">
                            <Calendar size={20} /> Voir les matchs
                        </Link>
                    </div>
                </section>

                {/* Decorative Divider */}
                <div className="divider"></div>

                {/* Stats */}
                <section className="stats-grid" style={{ marginBottom: '4rem' }}>
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
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '3rem'
                        }}>
                            <Zap size={44} style={{ color: '#D4AF37' }} />
                        </div>
                        <div className="stat-label">Notifications temps réel</div>
                    </div>
                </section>

                {/* Features */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 className="section-title">
                        Fonctionnalités
                    </h2>
                    <div style={{ height: '1rem' }}></div>
                    <div className="grid grid-3">
                        <div className="feature-card">
                            <span className="feature-icon">📅</span>
                            <h3 className="feature-title">Calendrier des matchs</h3>
                            <p className="feature-desc">
                                Recevez une notification avec la date, l'heure et le stade pour chaque match de vos équipes favorites.
                            </p>
                        </div>
                        <div className="feature-card">
                            <span className="feature-icon">⚽</span>
                            <h3 className="feature-title">Buts en direct</h3>
                            <p className="feature-desc">
                                Soyez alerté instantanément lorsqu'un but est marqué avec le score mis à jour en temps réel.
                            </p>
                        </div>
                        <div className="feature-card">
                            <span className="feature-icon">⚠️</span>
                            <h3 className="feature-title">Alertes importantes</h3>
                            <p className="feature-desc">
                                Recevez des alertes météo, sécurité ou trafic pour planifier votre déplacement au stade.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Recent Matches */}
                {recentMatches.length > 0 && (
                    <section style={{ marginBottom: '4rem' }}>
                        <h2 className="section-title">
                            Matchs récents
                        </h2>
                        <div style={{ height: '1rem' }}></div>
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
                                        <span><MapPin size={14} /> {match.city}</span>
                                    </div>
                                    <div style={{ marginTop: '1rem' }}>
                                        <span className={`badge ${match.status === 'LIVE' ? 'badge-danger' : 'badge-info'}`}>
                                            {match.status === 'LIVE' ? '🔴 EN DIRECT' : match.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}


            </main>

            {/* Footer */}
            <footer className="footer">
                <p>
                    <span style={{ color: '#C41E3A' }}>●</span>
                    {' '}CAN 2025 Fan Notification Platform{' '}
                    <span style={{ color: '#D4AF37' }}>●</span>
                    {' '}Projet Multi-Cloud{' '}
                    <span style={{ color: '#1D6F42' }}>●</span>
                </p>
            </footer>
        </div>
    )
}
