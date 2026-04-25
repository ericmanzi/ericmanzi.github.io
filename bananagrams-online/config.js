// ─── Bananagrams Online — Configuration ──────────────────────────────────────
//
// After deploying the backend (see backend/template.yaml), paste the
// WebSocketURL from the CloudFormation Outputs here.
//
// Deploy steps:
//   cd backend
//   npm install
//   sam build && sam deploy --guided
//
// Then copy the "WebSocketURL" output value below.
// Example: wss://abc123xyz.execute-api.us-east-1.amazonaws.com/prod

const WS_URL = 'wss://REPLACE_WITH_YOUR_WEBSOCKET_URL.execute-api.us-east-1.amazonaws.com/prod';
