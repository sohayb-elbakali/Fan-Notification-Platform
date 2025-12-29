# ⚽ CAN 2025 Fan Notification Platform

> **Plateforme multi-cloud de notifications en temps réel pour les fans de la Coupe d'Afrique des Nations 2025**

![Architecture](https://img.shields.io/badge/Architecture-Multi--Cloud-blue)
![GCP](https://img.shields.io/badge/GCP-Cloud%20Run-4285F4)
![AWS](https://img.shields.io/badge/AWS-Lambda-FF9900)
![Azure](https://img.shields.io/badge/Azure-SQL%20Database-0089D0)

---

## 🎯 À Propos du Projet

La **CAN 2025 Fan Notification Platform** est une solution cloud-native permettant aux fans de football de recevoir des notifications en temps réel lors de la Coupe d'Afrique des Nations 2025 au Maroc.

### ✨ Fonctionnalités Principales

- 📱 **Notifications en temps réel** - Recevez instantanément les alertes de buts, de matchs programmés et d'alertes importantes
- ⚽ **Suivi d'équipes** - Abonnez-vous à vos équipes favorites pour ne rien manquer
- 📧 **Multi-canal** - Notifications par email (et SMS en préparation)
- 🌍 **Multi-cloud** - Architecture distribuée sur GCP, AWS et Azure

---

## 🏗️ Architecture Multi-Cloud

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ARCHITECTURE MULTI-CLOUD                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌────────────────────────────────────────────────────────────────┐    │
│   │                 GCP (Cloud Run + Secret Manager)                │    │
│   │                                                                 │    │
│   │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │    │
│   │  │  Frontend   │───▶│  Backend    │    │  Notify     │        │    │
│   │  │  (Next.js)  │    │  API        │    │  Service    │        │    │
│   │  │             │    │  (Node.js)  │    │  (Node.js)  │        │    │
│   │  └─────────────┘    └──────┬──────┘    └──────▲──────┘        │    │
│   │                            │                   │               │    │
│   └────────────────────────────┼───────────────────┼───────────────┘    │
│                                │                   │                     │
│                                ▼                   │                     │
│   ┌────────────────────────────────────────────────┼───────────────┐    │
│   │              AWS Lambda (eu-west-3 Paris)      │               │    │
│   │  ┌─────────────────────────────────────────────┴─────────┐    │    │
│   │  │         can2025-event-processor                        │    │    │
│   │  │         Traite les événements et appelle notify-svc    │    │    │
│   │  └───────────────────────────────────────────────────────┘    │    │
│   └────────────────────────────────────────────────────────────────┘    │
│                                │                                         │
│                                ▼                                         │
│   ┌────────────────────────────────────────────────────────────────┐    │
│   │                      AZURE SQL Database                         │    │
│   │              (fans, teams, matches, goals, alerts)              │    │
│   └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Structure du Projet

```
Fan-Notification-Platform/
├── 📁 api/                  # Backend Node.js (Express)
│   ├── src/
│   │   ├── routes/          # Endpoints REST (matches, teams, fans, alerts)
│   │   ├── services/        # Services métier (outbox, events)
│   │   └── config/          # Configuration base de données
│   └── Dockerfile
│
├── 📁 notify-service/       # Service de notifications
│   ├── src/
│   │   └── index.js         # Envoi d'emails via SMTP
│   └── Dockerfile
│
├── 📁 frontend/             # Application Next.js
│   ├── src/
│   │   ├── app/             # Pages et layouts
│   │   └── components/      # Composants React
│   └── Dockerfile
│
├── 📁 lambda/               # AWS Lambda (Python)
│   └── handler.py           # Traitement des événements
│
├── 📁 database/             # Scripts SQL
│   └── schema.sql           # Schéma Azure SQL
│
└── 📁 docs/                 # Documentation
    └── GUIDE_CONFIGURATION.md
```

---

## 🔗 Services Déployés

| Service | URL | Région |
|---------|-----|--------|
| **Frontend** | `https://can2025-frontend-xxxxx.a.run.app` | europe-west9 |
| **Backend API** | `https://can2025-backend-xxxxx.a.run.app` | europe-west9 |
| **Notify Service** | `https://can2025-notify-service-xxxxx.a.run.app` | europe-west9 |
| **Lambda** | `https://xxxxx.lambda-url.eu-west-3.on.aws/` | eu-west-3 |

> ⚠️ **Note**: Les URLs réelles sont stockées dans GCP Secret Manager pour des raisons de sécurité.

---

## 📡 API Endpoints

### Teams
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/teams` | Liste toutes les équipes |
| POST | `/teams` | Créer une équipe |

### Matches
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/matches` | Liste tous les matchs |
| POST | `/matches` | Créer un match → **Déclenche notification** |
| POST | `/matches/:id/goals` | Ajouter un but → **Déclenche notification** |

### Fans
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/fans` | Liste tous les fans |
| POST | `/fans` | Inscrire un fan |
| POST | `/fans/:id/teams` | Abonner un fan à une équipe |

### Alerts
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/alerts` | Liste toutes les alertes |
| POST | `/alerts` | Publier une alerte → **Déclenche notification** |

---

## 🔔 Flux de Notification

```
1. Création Match/Alert/Goal via Backend API
                    │
                    ▼
2. Backend publie event dans outbox_events
   + appelle AWS Lambda Function URL
                    │
                    ▼
3. Lambda reçoit event + liste des destinataires (emails)
   et formate le message (ex: "⚽ BUT! Maroc 1-0 Algérie")
                    │
                    ▼
4. Lambda appelle GCP Notify Service (/notify)
                    │
                    ▼
5. Notify Service envoie emails à tous les fans abonnés
   avec un template HTML stylisé CAN 2025
```

---

## 🛠️ Technologies Utilisées

| Couche | Technologie |
|--------|-------------|
| **Frontend** | Next.js 14, React, Tailwind CSS |
| **Backend** | Node.js, Express.js |
| **Notify Service** | Node.js, Nodemailer |
| **Lambda** | Python 3.9 |
| **Database** | Azure SQL Database |
| **Secrets** | GCP Secret Manager |
| **Containers** | Docker, GCP Artifact Registry |
| **Hosting** | GCP Cloud Run |

---

## 👥 Équipe de Développement

| Membre | Responsabilité |
|--------|----------------|
| 1 | GCP Artifact Registry + Docker |
| 2 | GCP Cloud Run + Secret Manager |
| 3 | AWS Lambda + Function URL |
| 4 | Azure SQL Database |
| 5 | Frontend + Intégration |

---

## 📖 Documentation

Pour la configuration détaillée et le guide de déploiement, consultez:
- [📘 Guide de Configuration](docs/GUIDE_CONFIGURATION.md)

---

## 🧪 Tests Rapides

```bash
# Vérifier la santé du notify-service
curl https://can2025-notify-service-xxxxx.a.run.app/health

# Lister les équipes
curl https://can2025-backend-xxxxx.a.run.app/teams

# Lister les matchs
curl https://can2025-backend-xxxxx.a.run.app/matches
```

> 💡 Remplacez `xxxxx` par l'identifiant de votre déploiement Cloud Run.

---

## 📜 Licence

Ce projet est développé dans le cadre d'un projet académique pour la CAN 2025.

---

**⚽ Allez les Lions! 🦁🇲🇦**
