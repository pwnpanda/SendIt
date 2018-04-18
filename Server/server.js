const HTTPS_PORT = 7443;

const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;

// Yes, SSL is required
const serverConfig = {
    key: fs.readFileSync('server-key.pem'),
    cert: fs.readFileSync('server-cert.pem'),
};

var httpsServer = https.createServer(serverConfig, handleRequest);
httpsServer.listen(HTTPS_PORT, '0.0.0.0');

// Create a server for the client html page
var handleRequest = function(request, response) {
    // Render the single client html file for any request the HTTP server receives
    errorHandler('request received(http): ' + request.url);
    try{
        console.log('Invalid URL requested - no HTML support!');
        response.writeHead(404);
        response.end();
    }catch(e){
        errorHandler("Exception when serving file(https): ", e);
    }
};

var httpsServer = https.createServer(handleRequest);
httpsServer.listen(HTTPS_PORT, '0.0.0.0');

// ----------------------------------------------------------------------------------------

// Create a server for handling websocket calls
var wss = new WebSocketServer({server: httpsServer});

wss.on('connection', function(ws) {
    //Message received in server!
    ws.on('message', function(message) {
        // Broadcast any received message to all clients
        console.log('received: %s', message);
        //Handle message!
    });
});

//wss.push?
//wss.send(message);

//Server shutdown gracefully usage?
wss.broadcast = function(data) {
    //Message broadcasted to clients!
    this.clients.forEach(function(client) {
        if(client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};