-- CAN 2025 Fan Notification Platform - Azure SQL Schema

-- Teams table
CREATE TABLE teams (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(100) NOT NULL UNIQUE,
    country NVARCHAR(100) NOT NULL UNIQUE
);

-- Fans table
CREATE TABLE fans (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) NOT NULL UNIQUE,
    language NVARCHAR(10) DEFAULT 'fr',
    created_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Fan-Team subscriptions (many-to-many)
CREATE TABLE fan_teams (
    fan_id UNIQUEIDENTIFIER NOT NULL,
    team_id UNIQUEIDENTIFIER NOT NULL,
    PRIMARY KEY (fan_id, team_id),
    FOREIGN KEY (fan_id) REFERENCES fans(id),
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Matches table
CREATE TABLE matches (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    team_a_id UNIQUEIDENTIFIER NOT NULL,
    team_b_id UNIQUEIDENTIFIER NOT NULL,
    stadium NVARCHAR(200) NOT NULL,
    city NVARCHAR(100) NOT NULL,
    kickoff_time DATETIME2 NOT NULL,
    status NVARCHAR(20) DEFAULT 'SCHEDULED',
    FOREIGN KEY (team_a_id) REFERENCES teams(id),
    FOREIGN KEY (team_b_id) REFERENCES teams(id),
    CHECK (status IN ('SCHEDULED', 'LIVE', 'HALFTIME', 'FINISHED', 'CANCELLED'))
);

-- Goals table
CREATE TABLE goals (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    match_id UNIQUEIDENTIFIER NOT NULL,
    team_id UNIQUEIDENTIFIER NOT NULL,
    minute INT NOT NULL,
    player NVARCHAR(100),
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (match_id) REFERENCES matches(id),
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Alerts table
CREATE TABLE alerts (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    scope_type NVARCHAR(20) NOT NULL,
    scope_id NVARCHAR(100),
    category NVARCHAR(20) NOT NULL,
    severity NVARCHAR(20) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    CHECK (scope_type IN ('CITY', 'STADIUM', 'MATCH', 'ALL')),
    CHECK (category IN ('WEATHER', 'SECURITY', 'TRAFFIC', 'GENERAL')),
    CHECK (severity IN ('INFO', 'WARN', 'CRITICAL'))
);

-- Outbox events table (for event-driven architecture)
CREATE TABLE outbox_events (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    type NVARCHAR(50) NOT NULL,
    payload_json NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(20) DEFAULT 'NEW',
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    processed_at DATETIME2,
    CHECK (status IN ('NEW', 'SENT', 'FAILED', 'PROCESSED'))
);

-- Indexes for performance
CREATE INDEX idx_fan_teams_fan ON fan_teams(fan_id);
CREATE INDEX idx_fan_teams_team ON fan_teams(team_id);
CREATE INDEX idx_matches_teams ON matches(team_a_id, team_b_id);
CREATE INDEX idx_matches_city ON matches(city);
CREATE INDEX idx_goals_match ON goals(match_id);
CREATE INDEX idx_outbox_status ON outbox_events(status, created_at);
