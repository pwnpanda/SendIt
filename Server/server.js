const HTTPS_PORT = 7443;

const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;
const q = require('./resources/queue.js');
var uuid=1;
var sockuuid=1;
var sUUID = 0;
var conn = {};

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
	LOOKUP: "lookup" //For looking up email presence
};

//console.log("Argv1: " + process.argv[2]);

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
    	//If testing, serve files
    	if (process.argv[2] === 'test'){
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
		//If production no files!
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
   	ws.id=sockuuid++;
   	console.log("Client %d connected!", ws.id);
   	var d= { files:
		{
			0: { fname: 'testFile', ftype: 'exe', fsize: '2000'},
			1: { fname: 'testPic', ftype: 'jpg', fsize: '1000' }
		}
	}
   	//send(ws, wss_prot.INIT, d, 'Test!');

    //Message received in server!
    ws.onmessage = function(message) {
        console.log('received message from: ', ws.id);
        //Handle message!
        handleMessage(ws, message.data);
    };

    ws.onclose = function(){
    	console.log("Socket closed! Client nr. %d disconnected!", ws.id);
    };

    ws.onerror = function(err){
    	console.log("Error occurred: ", err);
    };
});


function handleMessage(sock, msg) {
	console.log(msg);
	msg = JSON.parse(msg);
	switch(msg.prot){
		case wss_prot.LOOKUP:
			console.log("Received mail: ", msg.origin);
			if(msg.origin in conn){
				console.log("Found mail ", msg.origin);
				send(sock, wss_prot.LOOKUP, true);
			}else{
				console.log("Did not find mail ", msg.origin);
				send(sock, wss_prot.LOOKUP, false);
			}
			break;

		case wss_prot.AUTH_SETUP:
			console.log("Protocol received: Authentication setup");
			auth_S_Reply(sock, msg);
			break;

		case wss_prot.AUTH_INIT:
			console.log("Protocol received: Authentication Initiation");
			auth_result(sock, msg);
			break;

		case wss_prot.ERROR:
			console.log("Protocol received: Error! Details: ", msg.data);
			if(msg.destination != null){
				forward(sock, msg);
			}
			break;

		case wss_prot.WAIT:
			console.log("Protocol received: Wait");
			if(msg.destination != null){
				forward(sock, msg);
			}
			break;

		case wss_prot.INIT:
			console.log("Protocol received: Initialize connection");
			forward(sock, msg);
			break;
		
		case wss_prot.DONE:
			console.log("Protocol received: Done");
			break;
		
		case wss_prot.REQKEY:
			console.log("Protocol received: Request Key! Looking for key for: ", msg.data);
			if(msg.data in conn){
				console.log("Found key for ", msg.data);
				var x = msg.data;
				send(sock, wss_prot.KEY, {x: (conn[msg.data]).key });
			}else{
				console.log("No key found for ", msg.data);
				send(sock, wss_prot.KEY);
			}
			break;
		
		case wss_prot.ACCEPT:
			console.log("Protocol received: Accept");
			forward(sock, msg);
			break;
		
		case wss_prot.REFUSE:
			console.log("Protocol received: Refuse");
			forward(sock, msg);
			break;
		
		case wss_prot.ANSWER:
			console.log("Protocol received: Answer");
			forward(sock, msg);
			break;
		
		case wss_prot.ICE:
			console.log("Protocol received: ICE");
			forward(sock, msg);
			break;
		
		case wss_prot.AUTH_S_REPLY:
			console.log("Protocol received: Authentication setup reply\nERROR! Not supposed to be in server!");
			break;
		case wss_prot.AUTH_RESULT:
			console.log("Protocol received: Authentication Result\nERROR! Not supposed to be in server!");
			break;
		case wss_prot.KEY:
			console.log("Protocol received: Key\nERROR! Not supposed to be in server!");
			break;
		
		default:
			console.log("Unknown message: ", msg);
			break;
	}
}


function beginExchange(sock) {
	send(sock, wss_prot.INIT);
}


function auth_S_Reply(sock, msg){
	console.log("Org: ", msg.origin)
	//reply true or false - evaluate!
	var auth=true;
   	//Check if key already associated with email
   	for (var ent in conn){
   		//console.log(conn[key]);
   		if(conn[ent].key === msg.data){
   			auth=false;
   			console.log("Key already exists for another email: %s!", conn[key].id);
   		}
   	}

   	if(msg.origin in conn){
   		auth = false;
   		console.log("Authentication error! E-mail already registered!")
   	}
   	if(auth){
   		conn[msg.origin]= new Object();
   		conn[msg.origin].key = msg.data;
   		conn[msg.origin].sock = sock;
   		conn[msg.origin].id = uuid++;

   		console.log(conn);
   	}

	send(sock, wss_prot.AUTH_S_REPLY, auth, msg.origin);
}

function auth_result(sock, data){
	console.log("Conn: ", conn)
	//reply true or false - evaluate!
	var auth=true;
	if(data.origin in conn){
		if(isAuth(data.data)){
			console.log("User %s is authenticated!", data.origin);
			conn[data.origin].sock=sock
		}else{
			auth=false;
			console.log("User %s is not authenticated!", data.origin);
		}
	}else{
		console.log("Details not stored for this user (%s) - please do an authentication setup!", data.origin);
		auth=false;
	}
	console.log("Conn: ", conn)

	send(sock, wss_prot.AUTH_RESULT, auth, data.origin);
}

function isAuth(data){
	console.log(data);
	//run test! - TODO
	return true;
}

function forward(sock, msg) {
	if (msg.destination in conn){
		console.log("Forwarding protocol %s to %s!",  msg.prot, msg.destination);
		sendFw(conn[msg.destination], msg);
	} else{
		console.log("Destination %s not connected!", msg.destination);
		if(msg.prot==wss_prot.INIT){
			/*todo - add checking functionality for queued messages on connect!
			//q.add2Q(msg);
			console.log("Waiting for %s to connect!\n Sending waiting signal to %s", msg.destination, msg.origin);
			send(sock, wss_prot.WAIT);
			*/
			send(sock, wss_prot.REFUSE);
		}else{
			console.log("Connection error! %s went offline", sock.id);
			send(sock, wss_prot.ERROR, 'Other end disconnected from server!');
		}
	}
}

function send(sock, sig, data=null, dst=null){
	var msg = {
		prot: sig,
		origin: 'server',
		destination: dst,
		data: data
	}
	msg = JSON.stringify(msg);
	if(sock.readyState === WebSocket.OPEN) {
		console.log("Sending to: ", sock.id)
		console.log("Sending: ", msg);
        sock.send(msg);
    }else{
    	console.log("Error sending to; ", sock.id);
    	console.log("Error sending: ", msg);
		console.log("Socket state: ", sock.readyState);
    }
}

function sendFw(sock, msg){
	msg = JSON.stringify(msg);
	if(sock.readyState === WebSocket.OPEN) {
		console.log("Sending to: ", sock.id)
		console.log("Sending: ", msg);
        sock.send(msg);
    }else{
    	console.log("Error sending to; ", sock.id);
    	console.log("Error sending: ", msg);
		console.log("Socket state: ", sock.readyState);
    }
}

process.on('SIGTERM', closeAll, 'SIGTERM');
process.on('SIGINT', closeAll, 'SIGINT');
//process.on('exit', closeAll, 'exit');
process.on(`uncaughtException`, closeAll, `uncaughtException`);


function closeAll (sig) {
	console.log('\nShutting down gracefully after %s :)!', sig)
	wss.clients.forEach(function(c) {
		c.close();
	 });
	process.exit(sig);
};