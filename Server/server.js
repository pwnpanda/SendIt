const HTTPS_PORT = 7443;

const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;
var uuid=1;
var sUUID = 0;

var wss_prot = {
//Authentication	
	AUTH_SETUP: "setup", //Register keys
	AUTH_S_REPLY: "setup_reply", //Registration OK/NOT OK
	AUTH_INIT: "auth_init", //Start authentication
	AUTH_RESULT: "result", //Authentication result

//All directions
	ERROR: "error", //error occured - specified in data
	WAIT: "wait", //Waiting for other end - specified in data

//Client-Server messages
	INIT: "start", //Offer sending - forwarded
	DONE: "done", //Connection finished
	REQKEY: "request_key", //Request public key - Include own public key!

//Server-Client messages
	KEY: "key", //Share keys for other end

//Client-Client messages
	ACCEPT: "accept", //Accept offer - contains offer!
	REFUSE: "refuse", //Refuse offer
	ANSWER: "answer", //Contains answer
	ICE: "ice", //Contains ICE-candidates
	TEST: "tst" //For testing setup
};


// Yes, SSL is required
const serverConfig = {
    key: fs.readFileSync('server-key.pem'),
    cert: fs.readFileSync('server-cert.pem'),
};

// Create a server for the client html page
var handleRequest = function(request, response) {
    // Render the single client html file for any request the HTTP server receives
    console.log('request received(https): ' + request.url);
    try{
    	if(request.url === '/') {
            response.writeHead(200, {'Content-Type': 'text/html'});
	        response.end(fs.readFileSync('/home/robin/Project/Server/test/wss_test.html'));
        } else if(request.url === '/wss_test.js') {
	    	response.writeHead(200, {'Content-Type': 'application/javascript'});
	        response.end(fs.readFileSync('/home/robin/Project/Server/test/wss_test.js'));
	    }else{
	        console.log('Invalid URL requested - no HTML support!');
	        response.writeHead(404);
	        response.end();
	    }
    }catch(e){
        console.log("Exception when serving file(https): ", e);
    }
};

var httpsServer = https.createServer(serverConfig, handleRequest);
httpsServer.listen(HTTPS_PORT, '0.0.0.0');
// ----------------------------------------------------------------------------------------

// Create a server for handling websocket calls
var wss = new WebSocketServer({server: httpsServer});

wss.on('connection', function(ws) {
    ws.id=uuid++;
    send(ws, {prot: wss_prot.TEST, msg:'ping'});
    //Message received in server!
    ws.on('message', function(message) {
        // Broadcast any received message to all clients
        console.log('received: %s', message);
        //Handle message!
        handleMessage(ws, message);
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

function send(sock, data){
	data = JSON.stringify(data);
	if(sock.readyState === WebSocket.OPEN) {
		console.log("Sending to: ", sock.id)
		console.log("Sending: ", data);
        sock.send(data);
    }else{
    	console.log("Error sending to; ", sock.id);
    	console.log("Error sending: ", data);
		console.log("Socket state: ", sock.readyState);
    }
}

function handleMessage(sock, msg) {
	msg = JSON.parse(msg);
	switch(msg.prot){
		case wss_prot.TEST:
			console.log("Received: ", msg.msg);
			console.log("PingPong done!");
			beginExchange(sock);
			break;
		case wss_prot.ACCEPT:
			console.log("Protocol received: ACCEPT");
			break;
		case wss_prot.INIT:
			console.log("Protocol received: INIT");
			send({prot: wss_prot.ACCEPT});
			break;
		default:
			console.log("Unknown message: ", msg);
			break;
	}
}


function beginExchange(sock) {
	var msg = { prot: wss_prot.INIT };
	send(sock, msg);
}