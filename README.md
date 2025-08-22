# Next.js WebRTC Backend

A Next.js backend application for WebRTC signaling using AWS Kinesis Video Streams (KVS).

## 🚀 Features

- **WebRTC Signaling**: AWS Kinesis Video Streams integration
- **ICE Server Management**: Automatic TURN/STUN server configuration
- **Channel Management**: Dynamic channel creation and management
- **RESTful API**: Clean API endpoints for WebRTC initialization

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- AWS Account with Kinesis Video Streams access
- AWS credentials with appropriate permissions

## 🛠️ Development Setup

### 1. Quick Start

```bash
# Clone the repository
git clone <your-repo-url>
cd next-be-webrtc

# Run the setup script
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
```

### 2. Manual Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp env.example .env.local

# Edit .env.local with your AWS credentials
nano .env.local
```

### 3. Environment Variables

Create a `.env.local` file with the following variables:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# KVS Channel Configuration
KVS_CHANNEL_NAME=your-channel-name

# Development Server Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

## 🚀 Development Commands

### Start Development Server

```bash
# Using the enhanced start script
chmod +x scripts/dev-start.sh
./scripts/dev-start.sh

# Or using npm directly
npm run dev
```

### Test API Endpoints

```bash
# Test all endpoints
chmod +x scripts/test-api.sh
./scripts/test-api.sh

# Manual testing
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/kvs/initialize \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "channelName": "test-channel"}'
```

### Build and Production

```bash
# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 📡 API Endpoints

### Health Check

```
GET /api/health
```

Returns server status.

### KVS Initialize

```
POST /api/kvs/initialize
```

**Request Body:**

```json
{
  "userId": "string",
  "channelName": "string" // optional, uses env variable if not provided
}
```

**Response:**

```json
{
  "iceServers": [
    {
      "Uris": ["stun:stun.kinesisvideo.us-east-1.amazonaws.com:443"]
    },
    {
      "Password": "string",
      "Ttl": 300,
      "Uris": ["turn:server:port"],
      "Username": "string"
    }
  ],
  "channelEndpoint": "wss://signed-websocket-url",
  "channelARN": "arn:aws:kinesisvideo:region:account:channel/name/id"
}
```

## 🔧 Development Use Cases

### 1. Local Development

- Server accessible at `http://localhost:3000`
- Network accessible at `http://YOUR_LOCAL_IP:3000`
- Hot reload enabled
- Environment validation on startup

### 2. API Testing

- Automated endpoint testing
- Response validation
- Error handling verification
- Color-coded output for easy debugging

### 3. Environment Management

- Automatic dependency checking
- Environment variable validation
- AWS credential verification
- Channel configuration setup

### 4. WebRTC Integration

- ICE server configuration
- TURN/STUN server setup
- Channel endpoint generation
- Signed WebSocket URLs

## 🧪 Testing

### Manual Testing

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test KVS initialization
curl -X POST http://localhost:3000/api/kvs/initialize \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123"}'
```

### Automated Testing

```bash
# Run the test script
./scripts/test-api.sh
```

## 🔒 Security Considerations

- **Environment Variables**: Never commit `.env.local` to version control
- **AWS Credentials**: Use IAM roles with minimal required permissions
- **CORS**: Configure CORS headers appropriately for production
- **HTTPS**: Use HTTPS in production environments

## 🚀 Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel --prod
```

### Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Docker

```bash
docker build -t next-be-webrtc .
docker run -p 3000:3000 next-be-webrtc
```

## 📝 Troubleshooting

### Common Issues

1. **Missing Environment Variables**

   - Run `./scripts/dev-setup.sh` to create `.env.local`
   - Ensure all required AWS credentials are set

2. **AWS Permissions**

   - Verify IAM user has Kinesis Video Streams permissions
   - Check region configuration matches your AWS setup

3. **Port Already in Use**

   - Kill existing processes: `lsof -ti:3000 | xargs kill -9`
   - Or use a different port: `npm run dev -- -p 3001`

4. **CORS Issues**
   - Check CORS headers in API responses
   - Verify client origin is allowed

## 📚 Resources

- [AWS Kinesis Video Streams Documentation](https://docs.aws.amazon.com/kinesisvideostreams/)
- [Next.js Documentation](https://nextjs.org/docs)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
