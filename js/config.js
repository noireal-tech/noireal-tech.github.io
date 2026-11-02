// Endless Clay settings, read by the game (index.html) and the phone app (phone.html).
// See "Relay (TURN) server" in README.md for how to fill these in.
//
// 1. Link server and fixed TURN servers (PeerJS options). null: PeerJS's free public link server, no relay.
//    With only a relay (keeps the free link server):
// window.ENDLESS_CLAY_PEER_SERVER = { config: { iceServers: [
//   { urls: 'stun:stun.l.google.com:19302' },
//   { urls: ['turn:turn.example.com:3478?transport=udp', 'turn:turn.example.com:3478?transport=tcp', 'turns:turn.example.com:5349?transport=tcp'],
//     username: 'clay', credential: 'a-long-random-password' }
// ] } };
//    Your own link server too: add host: 'peer.example.com', port: 443, path: '/', secure: true next to config.
window.ENDLESS_CLAY_PEER_SERVER = null;
//
// 2. TURN credentials from an address (a managed TURN service, or your own endpoint for expiring credentials).
//    It's fetched before linking and must answer with a list of ICE servers (or { iceServers: … }). For example:
// window.ENDLESS_CLAY_ICE_URL = 'https://yourapp.metered.live/api/v1/turn/credentials?apiKey=YOUR_KEY';
window.ENDLESS_CLAY_ICE_URL = null;
