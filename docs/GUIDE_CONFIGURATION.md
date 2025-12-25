# CAN 2025 Fan Notification Platform
## Guide de Configuration Complet

Ce guide vous accompagne étape par étape pour configurer et déployer la plateforme multi-cloud CAN 2025.

---

## Table des Matières

1. [Prérequis](#1-prérequis)
2. [Configuration Locale](#2-configuration-locale)
3. [Configuration Azure SQL Database](#3-configuration-azure-sql-database)
4. [Configuration GCP (Cloud Run + CI/CD)](#4-configuration-gcp)
5. [Configuration AWS (EventBridge + Lambda + SES)](#5-configuration-aws)
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
# Mode développement (base de données simulée)
NODE_ENV=development
PORT=8080

# Azure SQL (laisser vide pour mode mock)
# DB_SERVER=
# DB_NAME=
# DB_USER=
# DB_PASSWORD=

# AWS (optionnel pour dev)
# AWS_EVENTBRIDGE_ENDPOINT=

WEBHOOK_TOKEN=dev-secret-token
```

**Démarrer le backend :**
```bash
npm run dev
```
> ✅ Le backend démarre sur http://localhost:8080

### 2.2 Frontend (Next.js)

```bash
# Nouvelle fenêtre terminal
cd frontend

# Installer les dépendances
npm install

# Démarrer le frontend
npm run dev
```
> ✅ Le frontend démarre sur http://localhost:3000

### 2.3 Tester en Local

1. Ouvrir http://localhost:3000
2. Aller dans **Équipes** → Créer 2 équipes
3. Aller dans **Fans** → Inscrire un fan → L'abonner à une équipe
4. Aller dans **Matchs** → Créer un match
5. Vérifier les logs du backend : événement `match.scheduled` affiché

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

### 4.5 Configurer les Secrets (Variables d'environnement)

```bash
# Créer les secrets pour Azure SQL
gcloud secrets create azure-db-server --data-file=-
# Entrer: can2025-server.database.windows.net

gcloud secrets create azure-db-password --data-file=-
# Entrer: <votre-mot-de-passe>
```

### 4.6 Déployer Manuellement (Premier déploiement)

```bash
# Backend
cd api
gcloud run deploy can2025-backend \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,PORT=8080"

# Frontend (après avoir noté l'URL du backend)
cd ../frontend
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

### 5.2 Vérifier votre Email dans SES

```bash
# Vérifier l'email expéditeur
aws ses verify-email-identity \
  --email-address noreply@votre-domaine.com

# En mode sandbox, vérifier aussi les destinataires
aws ses verify-email-identity \
  --email-address destinataire@example.com
```

### 5.3 Déployer la Stack CloudFormation

```bash
cd aws

aws cloudformation create-stack \
  --stack-name can2025-notifications \
  --template-body file://cloudformation.json \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=BackendApiUrl,ParameterValue=https://can2025-backend-xxxxx.run.app \
    ParameterKey=SesFromEmail,ParameterValue=noreply@votre-domaine.com

# Attendre la création
aws cloudformation wait stack-create-complete --stack-name can2025-notifications
```

### 5.4 Déployer le Code Lambda

```bash
cd lambda

# Créer le package
zip -r function.zip handler.py

# Mettre à jour la fonction
aws lambda update-function-code \
  --function-name can2025-notification-handler \
  --zip-file fileb://function.zip
```

### 5.5 Créer l'API Gateway (pour recevoir les événements du backend)

```bash
# Créer l'API HTTP
aws apigatewayv2 create-api \
  --name can2025-events-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:eu-west-1:ACCOUNT_ID:function:can2025-notification-handler
```

---

## 6. Déploiement

### 6.1 Déploiement Automatique (CI/CD)

```bash
# Tout push sur main déclenche le déploiement
git add .
git commit -m "Deploy CAN 2025 platform"
git push origin main
```

**Vérifier le build :**
1. GCP Console → Cloud Build → History
2. Attendre que le build soit vert ✅

### 6.2 URLs de Production

Après déploiement, noter les URLs :
- **Frontend** : `https://can2025-frontend-xxxxx.run.app`
- **Backend** : `https://can2025-backend-xxxxx.run.app`

---

## 7. Test et Démonstration

### 7.1 Scénario de Démonstration (5-7 min)

| Étape | Action | Résultat Attendu |
|-------|--------|------------------|
| 1 | Push Git | Cloud Build déploie automatiquement |
| 2 | Ouvrir le frontend | Interface CAN 2025 |
| 3 | Créer 2 équipes | Maroc, Sénégal |
| 4 | Inscrire 2 fans | Emails vérifiés SES |
| 5 | Abonner fans aux équipes | Abonnements créés |
| 6 | Créer un match | → Email "match.scheduled" |
| 7 | Ajouter un but | → Email "goal.scored" |
| 8 | Publier une alerte | → Email "alert.published" |

### 7.2 Vérifier les Logs

**Backend (GCP) :**
```bash
gcloud run logs read can2025-backend --region europe-west1
```

**Lambda (AWS) :**
```bash
aws logs tail /aws/lambda/can2025-notification-handler --follow
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
Vérifier que le backend a CORS activé (déjà fait dans le code).

### Problème : Email non reçu
1. Vérifier que l'email est vérifié dans SES
2. Vérifier les logs Lambda
3. En sandbox, tous les destinataires doivent être vérifiés

### Problème : Cloud Build échoue
1. Vérifier que les APIs sont activées
2. Vérifier les permissions du service account

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
AWS_EVENTBRIDGE_ENDPOINT=https://events.eu-west-1.amazonaws.com
AWS_EVENTBRIDGE_BUS=can2025-events
```

### Frontend
```env
NEXT_PUBLIC_API_URL=https://can2025-backend-xxxxx.run.app
```

### Lambda
```env
BACKEND_API_URL=https://can2025-backend-xxxxx.run.app
SES_FROM_EMAIL=noreply@yourdomain.com
AWS_REGION=eu-west-1
```

---

## Répartition des Tâches (5 membres)

| Membre | Tâche | Section du Guide |
|--------|-------|------------------|
| Membre 1 | GCP Artifact Registry | Section 4.3 |
| Membre 2 | GCP Cloud Run | Section 4.6 |
| Membre 3 | Pipeline CI/CD | Section 4.4-4.5 |
| Membre 4 | Azure SQL Database | Section 3 |
| Membre 5 | AWS Events + Notifications | Section 5 |

---

**Bonne configuration ! 🚀**
