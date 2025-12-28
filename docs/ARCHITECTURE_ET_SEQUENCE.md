# 🏗️ Architecture et Séquence du Projet CAN 2025 Fan Notification

Ce document détaille chaque composant du système et explique le flux de données complet, de la création d'un événement jusqu'à la réception de la notification par le fan.

---

## 🧩 1. Détail des Services

### 🖥️ **1. Frontend (Interface Utilisateur)**
- **Technologie** : Next.js (React), Tailwind CSS.
- **Hébergement** : GCP Cloud Run.
- **Rôle** :
  - **Pour les Fans** : S'inscrire, choisir ses équipes favorites (Maroc, Sénégal, etc.), voir les matchs à venir.
  - **Pour les Admins** : Créer des matchs, mettre à jour les scores en direct, publier des alertes.
- **Communication** : Appelle le Backend API via HTTP REST.

### ⚙️ **2. Backend API (Cœur du Système)**
- **Technologie** : Node.js, Express.
- **Hébergement** : GCP Cloud Run.
- **Rôle** :
  - Gestion des utilisateurs (Fans) et des abonnements aux équipes.
  - Gestion des matchs (CRUD) et des événements (Buts, Cartons).
  - **Pattern Outbox** : Lorsqu'un événement survient (ex: But), il est d'abord "stocké" dans une table `outbox_events` pour garantir qu'il ne soit jamais perdu.
  - **Dispatcher** : Envoie les événements stockés vers AWS Lambda.
- **Base de Données** : Connecté à Azure SQL.

### 🗄️ **3. Azure SQL Database**
- **Technologie** : SQL Server (Azure).
- **Rôle** : Stockage persistant et relationnel.
  - Tables principales : `fans`, `teams`, `matches`, `fan_teams` (abonnements), `outbox_events`.
- **Sécurité** : Accessible uniquement par le Backend via mot de passe stocké dans GCP Secret Manager.

### ⚡ **4. AWS Lambda (Processeur d'Événements)**
- **Technologie** : Python 3.9.
- **Hébergement** : AWS Lambda (Region: eu-west-3 Paris).
- **Rôle** :
  - Reçoit l'événement brut du Backend.
  - **Logique Métier de Notification** : Formate le message selon le type d'événement (ex: "⚽ BUT! Maroc 1-0...").
  - Prépare la liste des destinataires.
  - Appelle le *Notify Service* pour l'envoi réel.
- **Accès** : Exposé via une **Function URL** publique (sécurisée par politique IAM).

### 📮 **5. Notify Service (Envoi de Messages)**
- **Technologie** : Node.js.
- **Hébergement** : GCP Cloud Run.
- **Rôle** :
  - Service "stateless" purement dédié à l'envoi.
  - Reçoit un message formaté et une liste d'emails.
  - Connecté au serveur SMTP (Gmail) pour délivrer les courriels.
- **Sécurité** : Protégé par un `X-Notify-Token` partagé.

---

## 🔄 2. Diagramme de Séquence (Flux de Notification)

Voici le chemin parcouru par une donnée lorsqu'un Admin signale un But.

### **Phase 1 : L'Action (GCP & Azure)**
1.  **Admin** : Clique sur "⚽ Ajouter un but" sur le **Frontend**.
2.  **Frontend** : Envoie une requête `POST /matches/{id}/events` au **Backend API**.
3.  **Backend** :
    *   Enregistre le but dans la table `matches` (Azure SQL).
    *   Crée un événement dans la table `outbox_events` (Azure SQL).
    *   *Réponse immédiate au Frontend (200 OK).*

### **Phase 2 : Le Dispatch (GCP -> AWS)**
4.  **Backend (Worker)** : Détecte le nouvel événement dans l'Outbox.
5.  **Backend** : Récupère la liste des fans abonnés aux deux équipes du match (ex: Fans du Maroc + Fans du Sénégal).
6.  **Backend** : Envoie une requête HTTP POST vers l'URL de la **AWS Lambda** avec le payload (Détails du but + Liste des emails).

### **Phase 3 : Le Traitement (AWS)**
7.  **AWS Lambda** : Reçoit l'événement.
8.  **AWS Lambda** :
    *   Vérifie le type (`goal.scored`).
    *   Génère le message texte : *"⚽ BUT! Maroc 1-0 Sénégal (35')"*.
    *   Log l'activité.

### **Phase 4 : La Délivrance (AWS -> GCP -> Utilisateur)**
9.  **AWS Lambda** : Appelle le **Notify Service** (sur GCP) via HTTP POST.
10. **Notify Service** :
    *   Vérifie le token de sécurité.
    *   Utilise `nodemailer` avec le compte SMTP Gmail.
    *   Envoie l'email à chaque fan dans la liste.
11. **Fan** : Reçoit la notification sur son téléphone ! 📱

---

## 🛡️ Résumé de la Sécurité

1.  **Frontend -> Backend** : HTTPS standard.
2.  **Backend -> Azure SQL** : Connexion cryptée avec credentials gérés par **GCP Secret Manager**.
3.  **Backend -> AWS Lambda** : Appel HTTPS vers Function URL. (La Lambda vérifie si nécessaire, mais ici elle est publique avec logique interne).
4.  **AWS Lambda -> Notify Service** : Appel HTTPS protégé par un **Token Secret** (`X-Notify-Token`) stocké dans les variables d'environnement des deux côtés.

---

## 📢 3. Logique de Ciblage des Notifications

Le système utilise **deux stratégies de ciblage différentes** selon le type d'événement. Les notifications ne sont pas envoyées à tout le monde de manière aveugle.

---

### 🏆 **Événements de Match (Buts, Match Programmé, Fin de Match)**

| Type d'événement | Code | Destinataires |
|------------------|------|---------------|
| Match programmé | `match.scheduled` | Fans abonnés à l'équipe A **OU** l'équipe B |
| But marqué | `goal.scored` | Fans abonnés à l'équipe A **OU** l'équipe B |
| Fin de match | `match.ended` | Fans abonnés à l'équipe A **OU** l'équipe B |

**Exemple concret :**
```
Match : Maroc 🇲🇦 vs Sénégal 🇸🇳

Fans notifiés :
✅ Ahmed (abonné au Maroc)           → Reçoit la notification
✅ Fatou (abonnée au Sénégal)        → Reçoit la notification
✅ Youssef (abonné aux DEUX équipes) → Reçoit la notification (1 seule fois)
❌ Karim (abonné à l'Algérie)        → NE reçoit PAS la notification
```

**Logique SQL utilisée :**
```sql
SELECT DISTINCT f.email
FROM fans f
INNER JOIN fan_teams ft ON f.id = ft.fan_id
WHERE ft.team_id IN (team_a_id, team_b_id)
```

Le système :
1. Récupère les IDs des deux équipes du match.
2. Cherche tous les fans ayant une entrée dans `fan_teams` pour l'une ou l'autre équipe.
3. Utilise `DISTINCT` pour éviter les doublons (si un fan suit les deux équipes).

---

### 🚨 **Alertes Générales (Annonces Administratives)**

Les alertes ont un **scope (portée)** configurable :

| Scope Type | Qui reçoit ? | Cas d'usage |
|------------|--------------|-------------|
| `ALL` | **Tous les fans** enregistrés dans la base | Changement de programme, annonce officielle |
| `CITY` | Fans dont les équipes favorites jouent dans cette ville | Alerte trafic, météo locale, sécurité |

**Exemple concret - Scope ALL :**
```
Alerte : "⚠️ Report de tous les matchs de demain"
Scope : ALL

→ TOUS les 5000 fans enregistrés reçoivent l'email.
```

**Exemple concret - Scope CITY :**
```
Alerte : "🚗 Forte affluence autour du Stade Mohammed V"
Scope : CITY = "Casablanca"

→ Seuls les fans abonnés à des équipes qui jouent à Casablanca reçoivent l'alerte.
```

**Logique SQL pour CITY :**
```sql
SELECT DISTINCT f.email
FROM fans f
INNER JOIN fan_teams ft ON f.id = ft.fan_id
INNER JOIN matches m ON (ft.team_id = m.team_a_id OR ft.team_id = m.team_b_id)
WHERE m.city = 'Casablanca'
```

---

### 📊 Schéma Récapitulatif du Ciblage

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TYPE D'ÉVÉNEMENT                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📅 match.scheduled  ─┐                                                     │
│  ⚽ goal.scored       ├──► Fans abonnés à Équipe A OU Équipe B              │
│  🏁 match.ended      ─┘                                                     │
│                                                                             │
│  🚨 alert.published                                                         │
│      ├── scope: ALL  ────────────────► TOUS les fans enregistrés            │
│      └── scope: CITY (ex: Rabat) ────► Fans avec équipes jouant à Rabat     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 🔢 Table de Relation `fan_teams`

Cette table est la clé du système de ciblage. Elle stocke les abonnements :

| fan_id | team_id |
|--------|---------|
| 1 (Ahmed) | MAR |
| 1 (Ahmed) | SEN |
| 2 (Fatou) | SEN |
| 3 (Karim) | ALG |

Quand un match Maroc vs Sénégal est créé :
- Le système cherche `team_id IN ('MAR', 'SEN')`
- Il trouve Ahmed (2 fois → dédupliqué) et Fatou
- Karim (ALG) n'est pas inclus

---

### ⚡ Performance et Scalabilité

- **DISTINCT** : Évite d'envoyer plusieurs fois la même notification.
- **Index SQL** : Les colonnes `team_id`, `fan_id`, et `city` sont indexées.
- **Batch Processing** : Le Notify Service peut traiter des centaines d'emails en parallèle.
- **Asynchrone** : L'envoi ne bloque pas la réponse HTTP du Backend.
