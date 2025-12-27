import json
import os
import urllib.request
import urllib.error
from datetime import datetime

# Configuration
GCP_NOTIFY_URL = os.environ.get('GCP_NOTIFY_URL', 'http://localhost:9001/notify')
GCP_NOTIFY_TOKEN = os.environ.get('GCP_NOTIFY_TOKEN', 'dev-secret-token')


def lambda_handler(event, context):
    """
    AWS Lambda handler for CAN 2025 events
    Receives events via Function URL and forwards to GCP notify-service
    """
    print(f"Received event: {json.dumps(event)}")
    
    try:
        # Parse the request body (Function URL sends body as string)
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event
        
        event_type = body.get('type', '')
        match_id = body.get('matchId', '')
        minute = body.get('minute', 0)
        score = body.get('score', {})
        recipients = body.get('recipients', [])
        
        print(f"Processing event type: {event_type}")
        print(f"Match ID: {match_id}, Recipients: {len(recipients)}")
        
        if not recipients:
            return build_response(200, {'message': 'No recipients to notify'})
        
        # Build notification message
        message = build_notification_message(event_type, body)
        
        # Build payload for GCP notify-service
        notify_payload = {
            'channel': 'sms',
            'recipients': recipients,
            'message': message,
            'eventType': event_type,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'metadata': {
                'matchId': match_id,
                'minute': minute,
                'score': score
            }
        }
        
        # Call GCP notify-service
        result = call_notify_service(notify_payload)
        
        return build_response(200, {
            'event_type': event_type,
            'recipients_count': len(recipients),
            'notify_result': result
        })
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        return build_response(400, {'error': 'Invalid JSON payload'})
    except Exception as e:
        print(f"Error processing event: {str(e)}")
        return build_response(500, {'error': str(e)})


def build_notification_message(event_type, data):
    """
    Build notification message based on event type
    """
    if event_type == 'goal.scored':
        score = data.get('score', {})
        team_a = data.get('teamAName', 'A')
        team_b = data.get('teamBName', 'B')
        minute = data.get('minute', '?')
        score_a = score.get('A', score.get('teamA', 0))
        score_b = score.get('B', score.get('teamB', 0))
        player = data.get('player', '')
        
        msg = f"⚽ BUT! {team_a} {score_a}-{score_b} {team_b} à {minute}'"
        if player:
            msg += f" ({player})"
        return msg
    
    elif event_type == 'match.scheduled':
        team_a = data.get('teamAName', 'Équipe A')
        team_b = data.get('teamBName', 'Équipe B')
        kickoff = data.get('kickoffTime', 'À confirmer')
        stadium = data.get('stadium', '')
        
        msg = f"🏆 CAN 2025: {team_a} vs {team_b}"
        if kickoff:
            msg += f" - {kickoff}"
        if stadium:
            msg += f" @ {stadium}"
        return msg
    
    elif event_type == 'match.ended':
        score = data.get('score', {})
        team_a = data.get('teamAName', 'A')
        team_b = data.get('teamBName', 'B')
        score_a = score.get('A', score.get('teamA', 0))
        score_b = score.get('B', score.get('teamB', 0))
        
        return f"🎉 FIN DU MATCH! {team_a} {score_a}-{score_b} {team_b}"
    
    elif event_type == 'alert.published':
        category = data.get('category', 'Alerte')
        message = data.get('message', '')
        severity = data.get('severity', 'INFO')
        
        emoji = {'INFO': 'ℹ️', 'WARN': '⚠️', 'CRITICAL': '🚨'}.get(severity, '📢')
        return f"{emoji} {category}: {message[:100]}"
    
    else:
        return f"📢 CAN 2025: {event_type}"


def call_notify_service(payload):
    """
    Call GCP Cloud Run notify-service via HTTP POST
    """
    try:
        data = json.dumps(payload).encode('utf-8')
        
        req = urllib.request.Request(
            GCP_NOTIFY_URL,
            data=data,
            headers={
                'Content-Type': 'application/json',
                'X-Notify-Token': GCP_NOTIFY_TOKEN
            },
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            response_body = response.read().decode('utf-8')
            print(f"Notify service response: {response.status} - {response_body}")
            return {
                'status': response.status,
                'body': response_body
            }
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else str(e)
        print(f"HTTP Error calling notify service: {e.code} - {error_body}")
        return {
            'status': e.code,
            'error': error_body
        }
    except urllib.error.URLError as e:
        print(f"URL Error calling notify service: {str(e)}")
        return {
            'status': 0,
            'error': str(e.reason)
        }
    except Exception as e:
        print(f"Error calling notify service: {str(e)}")
        return {
            'status': 0,
            'error': str(e)
        }


def build_response(status_code, body):
    """
    Build Lambda Function URL response
    """
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        'body': json.dumps(body)
    }
