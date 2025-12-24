-- CAN 2025 Sample Data for Demo

-- Insert CAN 2025 Teams
INSERT INTO teams (id, name, country) VALUES 
(NEWID(), 'Lions de l''Atlas', 'Maroc'),
(NEWID(), 'Lions de la Teranga', 'Sénégal'),
(NEWID(), 'Super Eagles', 'Nigeria'),
(NEWID(), 'Pharaons', 'Égypte'),
(NEWID(), 'Éléphants', 'Côte d''Ivoire'),
(NEWID(), 'Fennecs', 'Algérie');

-- Get team IDs for reference (run separately)
-- SELECT id, name FROM teams;

-- Sample fans (for demo with verified SES emails)
INSERT INTO fans (id, email, language) VALUES
(NEWID(), 'fan1@example.com', 'fr'),
(NEWID(), 'fan2@example.com', 'en'),
(NEWID(), 'fan3@example.com', 'fr');
