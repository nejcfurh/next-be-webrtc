# KVS WebRTC Backend Server

A Next.js 14 backend server that handles AWS Kinesis Video Streams (KVS) WebRTC authentication and signing for mobile clients. This server keeps AWS credentials secure on the backend while allowing mobile apps to connect to KVS WebRTC streams.

## Features

- Server-side AWS SDK v3 credential management
- Signed URL generation for WebRTC connections
- ICE server configuration retrieval
- CORS enabled for mobile app development
- REST API endpoints for mobile client integration

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure AWS credentials in `.env.local`:

```env
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=your_aws_instance_region
```

3. Run the development server:

```bash
npm run dev
```

The server will be available at `http://localhost:3000`

## API Endpoints

### Initialize KVS Connection

`POST /api/kvs/initialize` on your mobile client.

Initialize a viewer connection to KVS with all necessary configuration.

**Request Body:**

```json
{
  "userId": "unique-user-id"
}
```

**Response:**

```json
{
  "signaling": {
    "wssEndpoint": "wss://signed-url...",
    "httpsEndpoint": "https://endpoint...",
    "channelArn": "arn:aws:kinesisvideo...",
    "clientId": "VIEWER-unique-user-id",
    "region": "us-east-1"
  },
  "iceServers": [
    {
      "urls": "stun:stun.kinesisvideo.us-east-1.amazonaws.com:443"
    },
    {
      "urls": "turn:endpoint...",
      "username": "username",
      "credential": "password"
    }
  ]
}
```

### Health Check

`GET /api/health`

Check server status and configuration.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": {
    "hasAwsCredentials": true,
    "region": "us-east-1",
    "channelConfigured": true
  }
}
```

## Mobile Client Integration

Your mobile app should:

1. Call `/api/kvs/initialize` with a user ID to get the signed WebSocket URL and ICE servers
2. Use the returned configuration to establish the WebRTC connection
3. The signed URL already includes authentication - no need to expose AWS credentials

Example mobile client code modification:

```javascript
// Instead of signing on the client:
// const signedUrl = await requestSigner.getSignedURL(...)

// Call your backend:
const response = await fetch('http://localhost:3000/api/kvs/initialize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: user.id }),
});

const config = await response.json();

// Use the pre-signed configuration
const signalingClient = new SignalingClient({
  channelARN: config.signaling.channelArn,
  channelEndpoint: config.signaling.wssEndpoint, // Already signed!
  clientId: config.signaling.clientId,
  role: Role.VIEWER,
  region: config.signaling.region,
  // No requestSigner needed - URL is pre-signed
});

// Use the ICE servers from the backend
const peerConnection = new RTCPeerConnection({
  iceServers: config.iceServers,
});
```

## Development Notes

- CORS is enabled for all origins in development mode
- For production, update CORS settings in `middleware.ts` to restrict origins
- The server handles all AWS SDK operations, keeping credentials secure
- Mobile clients receive pre-signed URLs that expire after a certain time

## Security Considerations

- Never expose AWS credentials to client applications
- In production, implement proper authentication/authorization
- Restrict CORS origins to your specific mobile app domains
- Consider implementing rate limiting for API endpoints
- Use HTTPS in production environments
