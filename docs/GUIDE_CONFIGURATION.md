# CAN 2025 Fan Notification Platform
## Guide de Configuration Complet

Ce guide vous accompagne étape par étape pour configurer et déployer la plateforme multi-cloud CAN 2025.

---

## Table des Matières

1. [Prérequis](#1-prérequis)
2. [Configuration Locale](#2-configuration-locale)
3. [Configuration Azure SQL Database](#3-configuration-azure-sql-database)
4. [Configuration GCP (Cloud Run + notify-service)](#4-configuration-gcp)
5. [Configuration AWS (Lambda + Function URL)](#5-configuration-aws)
6. [Déploiement](#6-déploiement)
7. [Test et Démonstration](#7-test-et-démonstration)
8. [Dépannage](#8-dépannage)

---

## 1. Prérequis

### Comptes Cloud Requis
- [ ] **Google Cloud Platform (GCP)** - [console.cloud.google.com](https://console.cloud.google.com)
- [ ] **Microsoft Azure** - [portal.azure.com](https://portal.azure.com)
- [ ] **Amazon Web Services (AWS)** - [console.aws.amazon.com](https://console.aws.amazon.com)

### Outils à Installer
```bash
# Node.js (v18 ou supérieur)
node --version  # v18.x.x ou plus

# Docker Desktop
docker --version

# Google Cloud CLI
gcloud --version

# AWS CLI
aws --version

# Azure CLI (optionnel)
az --version
```

### Cloner le Projet
```bash
git clone <votre-repo>
cd Fan-Notification-Platform
```

---

## 2. Configuration Locale

### 2.1 Backend (API)

```bash
# Aller dans le dossier API
cd api

# Installer les dépendances
npm install

# Créer le fichier .env
cp .env.example .env
```

**Éditer `api/.env` :**
```env
# Mode développement
NODE_ENV=development
PORT=8080

# Azure SQL (laisser vide pour mode mock)
# DB_SERVER=
# DB_NAME=
# DB_USER=
# DB_PASSWORD=

# AWS Lambda Function URL
LAMBDA_FUNCTION_URL=http://localhost:9000  # Pour dev local

WEBHOOK_TOKEN=dev-secret-token
```

**Démarrer le backend :**
```bash
npm run dev
```
> ✅ Le backend démarre sur http://localhost:8080

### 2.2 Notify Service (Nouveau)

```bash
# Aller dans le dossier notify-service
cd notify-service

# Installer les dépendances
npm install

# Créer le fichier .env
cp .env.example .env
```

**Éditer `notify-service/.env` :**
```env
PORT=9001
NOTIFY_TOKEN=dev-secret-token
LOG_LEVEL=debug
```

**Démarrer le notify-service :**
```bash
npm run dev
```
> ✅ Le notify-service démarre sur http://localhost:9001

### 2.3 Frontend (Next.js)

```bash
# Nouvelle fenêtre terminal
cd frontend

# Installer les dépendances
npm install

# Démarrer le frontend
npm run dev
```
> ✅ Le frontend démarre sur http://localhost:3000

### 2.4 Tester en Local

1. Ouvrir http://localhost:3000
2. Aller dans **Équipes** → Créer 2 équipes
3. Aller dans **Fans** → Inscrire un fan → L'abonner à une équipe
4. Aller dans **Matchs** → Créer un match
5. Vérifier les logs du backend et du notify-service

---

## 3. Configuration Azure SQL Database

### 3.1 Créer la Base de Données

1. **Connectez-vous** à [portal.azure.com](https://portal.azure.com)

2. **Créer un groupe de ressources**
   - Rechercher "Resource groups"
   - Cliquer "Create"
   - Nom : `can2025-rg`
   - Région : `West Europe`

3. **Créer le serveur SQL**
   - Rechercher "SQL servers"
   - Cliquer "Create"
   - Serveur : `can2025-server` (doit être unique)
   - Authentification : SQL Authentication
   - Admin : `can2025admin`
   - Password : `<votre-mot-de-passe-fort>`

4. **Créer la base de données**
   - Sur le serveur, cliquer "Create database"
   - Nom : `can2025db`
   - Compute : Basic ou S0 (gratuit pour étudiants)

### 3.2 Configurer le Firewall

1. Sur le serveur SQL → **Networking**
2. Cocher "Allow Azure services"
3. Ajouter votre IP client :
   - Cliquer "Add client IP"
4. **Save**

### 3.3 Exécuter le Schema

1. Ouvrir **Query Editor** sur la base de données
2. Se connecter avec les identifiants admin
3. Copier/coller le contenu de `database/schema.sql`
4. Exécuter ▶️

### 3.4 Obtenir la Connection String

1. Base de données → **Connection strings**
2. Copier la chaîne ADO.NET
3. Mettre à jour `api/.env` :
```env
DB_SERVER=can2025-server.database.windows.net
DB_NAME=can2025db
DB_USER=can2025admin
DB_PASSWORD=<votre-mot-de-passe>
```

---

## 4. Configuration GCP

### 4.1 Créer un Projet GCP

```bash
# Se connecter à GCP
gcloud auth login

# Créer un projet
gcloud projects create can2025-project --name="CAN 2025"

# Définir le projet actif
gcloud config set project can2025-project

# Activer la facturation (requis)
# Faire via console.cloud.google.com
```

### 4.2 Activer les APIs

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com
```

### 4.3 Créer le Repository Artifact Registry

```bash
gcloud artifacts repositories create can2025 \
  --repository-format=docker \
  --location=europe-west1 \
  --description="CAN 2025 Docker images"
```

### 4.4 Configurer Cloud Build

1. **Connecter votre dépôt Git**
   - Console GCP → Cloud Build → Triggers
   - Cliquer "Connect Repository"
   - Sélectionner GitHub / GitLab
   - Autoriser et sélectionner le repo

2. **Créer le Trigger**
   - Cliquer "Create Trigger"
   - Nom : `can2025-deploy`
   - Event : Push to branch
   - Branch : `^main$`
   - Configuration : Cloud Build configuration file
   - Fichier : `cloudbuild.yaml`

### 4.5 Déployer le notify-service (GCP Cloud Run)

```bash
cd notify-service

# Déployer le service
gcloud run deploy notify-service \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "NOTIFY_TOKEN=<votre-token-secret>,LOG_LEVEL=info"
```

**Noter l'URL du service :**
```
https://notify-service-xxxxx.run.app
```

### 4.6 Déployer le Backend (GCP Cloud Run)

```bash
cd api

# Déployer le backend
gcloud run deploy can2025-backend \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,PORT=8080,LAMBDA_FUNCTION_URL=https://xxxxx.lambda-url.eu-west-1.on.aws/"
```

### 4.7 Déployer le Frontend (GCP Cloud Run)

```bash
cd frontend

# Déployer le frontend (après avoir noté l'URL du backend)
gcloud run deploy can2025-frontend \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_API_URL=https://can2025-backend-xxxxx.run.app"
```

---

## 5. Configuration AWS

### 5.1 Configurer AWS CLI

```bash
aws configure
# AWS Access Key ID: <votre-access-key>
# AWS Secret Access Key: <votre-secret-key>
# Default region: eu-west-1
# Default output format: json
```

### 5.2 Créer le Rôle IAM pour Lambda

```bash
# Créer la policy de confiance
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Créer le rôle
aws iam create-role \
  --role-name can2025-lambda-role \
  --assume-role-policy-document file://trust-policy.json

# Attacher la policy de base
aws iam attach-role-policy \
  --role-name can2025-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

### 5.3 Créer et Déployer la Lambda

```bash
cd lambda

# Créer le package
zip -r function.zip handler.py

# Créer la fonction Lambda
aws lambda create-function \
  --function-name can2025-event-processor \
  --runtime python3.9 \
  --handler handler.lambda_handler \
  --role arn:aws:iam::ACCOUNT_ID:role/can2025-lambda-role \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 128

# Ajouter les variables d'environnement
aws lambda update-function-configuration \
  --function-name can2025-event-processor \
  --environment "Variables={GCP_NOTIFY_URL=https://notify-service-xxxxx.run.app/notify,GCP_NOTIFY_TOKEN=<votre-token-secret>}"
```

### 5.4 Activer Function URL

```bash
# Créer la configuration Function URL
aws lambda create-function-url-config \
  --function-name can2025-event-processor \
  --auth-type NONE \
  --cors '{
    "AllowOrigins": ["*"],
    "AllowMethods": ["POST"],
    "AllowHeaders": ["Content-Type"]
  }'

# Ajouter la permission pour invocation publique
aws lambda add-permission \
  --function-name can2025-event-processor \
  --statement-id FunctionURLAllowPublicAccess \
  --action lambda:InvokeFunctionUrl \
  --principal "*" \
  --function-url-auth-type NONE
```

### 5.5 Obtenir l'URL de la Function

```bash
aws lambda get-function-url-config \
  --function-name can2025-event-processor \
  --query 'FunctionUrl' \
  --output text
```

**Exemple de sortie :**
```
https://abc123xyz.lambda-url.eu-west-1.on.aws/
```

> ⚠️ **Important** : Utilisez cette URL dans la configuration du backend (`LAMBDA_FUNCTION_URL`)

### 5.6 Tester la Lambda

```bash
# Envoyer un événement de test
curl -X POST "https://abc123xyz.lambda-url.eu-west-1.on.aws/" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "goal.scored",
    "matchId": "M123",
    "minute": 63,
    "score": {"A": 2, "B": 1},
    "recipients": ["+212612345678"]
  }'
```

---

## 6. Déploiement

### 6.1 Ordre de Déploiement

1. **Azure SQL** → Base de données
2. **GCP notify-service** → Service de notification
3. **AWS Lambda** → Processeur d'événements (avec URL notify-service)
4. **GCP Backend** → API (avec URL Lambda)
5. **GCP Frontend** → Interface utilisateur

### 6.2 Déploiement Automatique (CI/CD)

```bash
# Tout push sur main déclenche le déploiement
git add .
git commit -m "Deploy CAN 2025 platform"
git push origin main
```

**Vérifier le build :**
1. GCP Console → Cloud Build → History
2. Attendre que le build soit vert ✅

### 6.3 URLs de Production

Après déploiement, noter les URLs :
- **Frontend** : `https://can2025-frontend-xxxxx.run.app`
- **Backend** : `https://can2025-backend-xxxxx.run.app`
- **Notify Service** : `https://notify-service-xxxxx.run.app`
- **Lambda Function URL** : `https://xxxxx.lambda-url.eu-west-1.on.aws/`

---

## 7. Test et Démonstration

### 7.1 Scénario de Démonstration (5-7 min)

| Étape | Action | Résultat Attendu |
|-------|--------|------------------|
| 1 | Push Git | Cloud Build déploie automatiquement |
| 2 | Ouvrir le frontend | Interface CAN 2025 |
| 3 | Créer 2 équipes | Maroc, Sénégal |
| 4 | Inscrire 2 fans | Avec numéros de téléphone |
| 5 | Abonner fans aux équipes | Abonnements créés |
| 6 | Créer un match | → Lambda appelée → notify-service log |
| 7 | Ajouter un but | → SMS "goal.scored" préparé |

### 7.2 Vérifier les Logs

**Backend (GCP) :**
```bash
gcloud run logs read can2025-backend --region europe-west1
```

**Notify Service (GCP) :**
```bash
gcloud run logs read notify-service --region europe-west1
```

**Lambda (AWS) :**
```bash
aws logs tail /aws/lambda/can2025-event-processor --follow
```

### 7.3 Exemple de Payload

**Événement envoyé à Lambda :**
```json
{
  "type": "goal.scored",
  "matchId": "M123",
  "minute": 63,
  "score": {"A": 2, "B": 1},
  "recipients": ["+2126xxxxxxxx", "+33xxxxxxxxx"]
}
```

**Payload envoyé au notify-service :**
```json
{
  "channel": "sms",
  "recipients": ["+2126xxxxxxxx"],
  "message": "BUT! Maroc 2-1 à 63'.",
  "eventType": "goal.scored",
  "timestamp": "2025-01-15T15:30:00Z"
}
```

---

## 8. Dépannage

### Problème : Port déjà utilisé
```bash
# Windows : trouver le process
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Ou changer le port dans .env
PORT=8080
```

### Problème : CORS
Vérifier que le backend et Lambda ont CORS activé.

### Problème : Lambda pas appelée
1. Vérifier `LAMBDA_FUNCTION_URL` dans le backend
2. Vérifier les logs Lambda
3. Tester l'URL avec curl

### Problème : notify-service ne répond pas
1. Vérifier que le service est déployé
2. Vérifier le token (`X-Notify-Token`)
3. Vérifier les logs notify-service

### Problème : Token invalide
```
Error: Invalid X-Notify-Token
```
Vérifier que `GCP_NOTIFY_TOKEN` (Lambda) = `NOTIFY_TOKEN` (notify-service)

### Problème : Connexion Azure SQL
```bash
# Vérifier la connexion
sqlcmd -S can2025-server.database.windows.net -U can2025admin -P <password> -d can2025db -Q "SELECT 1"
```

---

## Récapitulatif des Ports

| Service | Port Local | Port Production |
|---------|------------|-----------------|
| Frontend (Next.js) | 3000 | 3000 |
| Backend (Node.js) | 8080 | 8080 |
| Notify Service | 9001 | 8080 |
| Azure SQL | 1433 | 1433 |

---

## Récapitulatif des Variables d'Environnement

### Backend (`api/.env`)
```env
NODE_ENV=production
PORT=8080
DB_SERVER=can2025-server.database.windows.net
DB_NAME=can2025db
DB_USER=can2025admin
DB_PASSWORD=***
LAMBDA_FUNCTION_URL=https://xxxxx.lambda-url.eu-west-1.on.aws/
```

### Notify Service (`notify-service/.env`)
```env
PORT=8080
NOTIFY_TOKEN=<shared-secret-token>
LOG_LEVEL=info
```

### Lambda
```env
GCP_NOTIFY_URL=https://notify-service-xxxxx.run.app/notify
GCP_NOTIFY_TOKEN=<shared-secret-token>
```

### Frontend
```env
NEXT_PUBLIC_API_URL=https://can2025-backend-xxxxx.run.app
```

---

## Répartition des Tâches (5 membres)

| Membre | Tâche | Section du Guide |
|--------|-------|------------------|
| Membre 1 | GCP Artifact Registry | Section 4.3 |
| Membre 2 | GCP Cloud Run (Backend + notify-service) | Section 4.5-4.7 |
| Membre 3 | Pipeline CI/CD | Section 4.4 |
| Membre 4 | Azure SQL Database | Section 3 |
| Membre 5 | AWS Lambda + Function URL | Section 5 |

---

## Diagramme de Flux

```
┌──────────┐     ┌─────────────┐     ┌───────────────────┐     ┌─────────────────┐
│  Admin   │────▶│   Backend   │────▶│ Lambda (AWS)      │────▶│ notify-service  │
│ (Front)  │     │   (GCP)     │     │ Function URL      │     │ (GCP)           │
└──────────┘     └──────┬──────┘     └───────────────────┘     └─────────────────┘
                        │                                              │
                        ▼                                              ▼
                 ┌─────────────┐                               ┌─────────────────┐
                 │  Azure SQL  │                               │   Logs / Store  │
                 └─────────────┘                               └─────────────────┘
```

---

**Bonne configuration ! 🚀**
