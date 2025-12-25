import json
import os
import boto3
import urllib.request
import urllib.parse

# AWS clients
ses_client = boto3.client('ses', region_name=os.environ.get('AWS_REGION', 'eu-west-1'))

# Configuration
BACKEND_API_URL = os.environ.get('BACKEND_API_URL', 'http://localhost:8080')
FROM_EMAIL = os.environ.get('SES_FROM_EMAIL', 'noreply@can2025.com')

def lambda_handler(event, context):
    """
    AWS Lambda handler for CAN 2025 events from EventBridge
    """
    print(f"Received event: {json.dumps(event)}")
    
    try:
        # Extract event details
        detail_type = event.get('detail-type', '')
        detail = event.get('detail', {})
        
        if isinstance(detail, str):
            detail = json.loads(detail)
        
        print(f"Processing event type: {detail_type}")
        
        # Get recipients from backend API
        recipients = get_recipients(detail_type, detail)
        
        if not recipients:
            print("No recipients found")
            return {'statusCode': 200, 'body': 'No recipients'}
        
        print(f"Found {len(recipients)} recipients")
        
        # Send notifications
        subject, body = build_email_content(detail_type, detail)
        results = send_emails(recipients, subject, body)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'event_type': detail_type,
                'recipients_count': len(recipients),
                'sent': results['sent'],
                'failed': results['failed']
            })
        }
        
    except Exception as e:
        print(f"Error processing event: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def get_recipients(event_type, detail):
    """
    Fetch recipients from backend API
    """
    try:
        if event_type in ['match.scheduled', 'goal.scored']:
            match_id = detail.get('matchId')
            url = f"{BACKEND_API_URL}/recipients/{match_id}/recipients"
        elif event_type == 'alert.published':
            alert_id = detail.get('alertId')
            url = f"{BACKEND_API_URL}/recipients/alerts/{alert_id}/recipients"
        else:
            return []
        
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            return data.get('recipients', [])
            
    except Exception as e:
        print(f"Error fetching recipients: {str(e)}")
        return []


def build_email_content(event_type, detail):
    """
    Build email subject and body based on event type
    """
    if event_type == 'match.scheduled':
        subject = f"⚽ Match programmé: {detail.get('teamAName', 'Équipe A')} vs {detail.get('teamBName', 'Équipe B')}"
        body = f"""
🏆 CAN 2025 - Match programmé

{detail.get('teamAName', 'Équipe A')} vs {detail.get('teamBName', 'Équipe B')}

📅 Date: {detail.get('kickoffTime', 'À confirmer')}
🏟️ Stade: {detail.get('stadium', 'À confirmer')}
📍 Ville: {detail.get('city', 'À confirmer')}

Ne manquez pas ce match!

---
CAN 2025 Fan Notification Platform
        """
        
    elif event_type == 'goal.scored':
        score = detail.get('score', {})
        subject = f"⚽ BUT! {detail.get('teamName', 'Équipe')} marque!"
        body = f"""
🎉 BUT MARQUÉ!

{detail.get('teamName', 'Équipe')} marque à la {detail.get('minute', '?')}ème minute!

Buteur: {detail.get('player', 'Inconnu')}

📊 Score actuel:
{detail.get('teamAName', 'Équipe A')} {score.get('teamA', 0)} - {score.get('teamB', 0)} {detail.get('teamBName', 'Équipe B')}

---
CAN 2025 Fan Notification Platform
        """
        
    elif event_type == 'alert.published':
        severity_emoji = {'INFO': 'ℹ️', 'WARN': '⚠️', 'CRITICAL': '🚨'}.get(detail.get('severity'), '📢')
        subject = f"{severity_emoji} Alerte {detail.get('category', 'Générale')}"
        body = f"""
{severity_emoji} ALERTE - {detail.get('category', 'Générale')}

Niveau: {detail.get('severity', 'INFO')}
Zone: {detail.get('scopeType', 'Général')} - {detail.get('scopeId', 'Toutes zones')}

Message:
{detail.get('message', 'Aucun détail disponible')}

---
CAN 2025 Fan Notification Platform
        """
    else:
        subject = "CAN 2025 - Notification"
        body = f"Événement: {event_type}\n\nDétails: {json.dumps(detail, indent=2)}"
    
    return subject, body


def send_emails(recipients, subject, body):
    """
    Send emails via AWS SES
    """
    results = {'sent': 0, 'failed': 0}
    
    for recipient in recipients:
        email = recipient.get('email')
        if not email:
            continue
            
        try:
            # In sandbox mode, only verified emails will work
            ses_client.send_email(
                Source=FROM_EMAIL,
                Destination={'ToAddresses': [email]},
                Message={
                    'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                    'Body': {'Text': {'Data': body, 'Charset': 'UTF-8'}}
                }
            )
            print(f"Email sent to {email}")
            results['sent'] += 1
            
        except ses_client.exceptions.MessageRejected as e:
            print(f"Email rejected for {email}: {str(e)}")
            results['failed'] += 1
        except Exception as e:
            print(f"Failed to send email to {email}: {str(e)}")
            results['failed'] += 1
    
    return results
