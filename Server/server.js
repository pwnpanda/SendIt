const HTTPS_PORT = 7443;

const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;
const q = require('./resources/queue.js');
const crypto = require('@trust/webcrypto');
var uuid=1;
var sockuuid=1;
var sUUID = 0;
var conn = {};
var key = new Object();

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
start();

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

//Read in keypair or create one if first run.
function start(){
	
	try{
		var buf = fs.readFileSync("./keys.crp", "utf8");
		var dec = buf.split(";\n");

		//console.log(buf);
		key.privateKey = JSON.parse(dec[0]);
		key.publicKey = JSON.parse(dec[1]);

		//create list of conn!
		for (var i = 2; i < dec.length-1; i++) {
			console.log(dec[i]);
			var tmp = dec[i].split(";");
			conn[tmp[0]] = new Object();
			conn[tmp[0]].key = JSON.parse(tmp[1]);
		}

		key.expkey = key.publicKey;

		Promise.all([
			(
				crypto.subtle.importKey(
					"jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
					key.privateKey,
					{   //these are the algorithm options
						name: "RSA-OAEP",
						hash: {name: "SHA-1"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
					},
					true, //whther the key is extractable (i.e. can be used in exportKey)
					["decrypt", "unwrapKey"]//["wrapKey", "unwrapKey"]
				)
			),
			(
				crypto.subtle.importKey(
					"jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
					key.publicKey,
					{   //these are the algorithm options
						name: "RSA-OAEP",
						hash: {name: "SHA-1"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
					},
					true, //whther the key is extractable (i.e. can be used in exportKey)
					["encrypt", "wrapKey"]//["wrapKey", "unwrapKey"]
				)
			)
		])
		.then(function (keys) {
			console.log("Keys imported!");
			key.privateKey = keys[0];
			key.publicKey = keys[1];
		});
	}catch(err){
		console.log("Error reading cryptofile: ", err);
		//create keys
		crypto.subtle.generateKey(
			{
				name: "RSA-OAEP",
				modulusLength: 2048, //can be 1024, 2048, or 4096
				publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
				hash: {name: "SHA-1"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
			},
			true, //whether the key is extractable (i.e. can be used in exportKey)
			["encrypt", "decrypt", "wrapKey", "unwrapKey"]
			//["encrypt", "decrypt"] //must be ["encrypt", "decrypt"] or ["wrapKey", "unwrapKey"]
		)
		.then(function(keys){
			console.log("Keys created!");
			key=keys;
			return crypto.subtle.exportKey(
				"jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
				key.publicKey //can be a publicKey or privateKey, as long as extractable was true
			)
		})
		.then(function(expkey){
			key.expkey=expkey;
		})
		.catch(function(err){
			console.error(err);
		});
	}
	
	//console.log("Keys", key);
	
}
// ----------------------------------------------------------------------------------------

var httpsServer = https.createServer(serverConfig, handleRequest);
httpsServer.listen(HTTPS_PORT, '0.0.0.0');

// Create a server for handling websocket calls
var wss = new WebSocketServer({server: httpsServer});

wss.on('connection', function(ws) {
   	ws.id=sockuuid++;
   	console.log("Client %d connected!", ws.id);

    //Message received in server!
    ws.onmessage = function(message) {
        console.log('received message from id: ', ws.id);
        //Handle message!
        handleMessage(ws, message.data);
    };

    ws.onclose = function(){
    	console.log("Socket closed! Client id nr. %d disconnected!", ws.id);
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
			//console.log(key.publicKey);


			if(msg.origin in conn){
				console.log("Found mail ", msg.origin);
				var thiscon = conn[msg.origin];
				//Check queue for waiting connections!
				//checkQueue(thiscon);

				//create session key!
				createSymmkey(sock, wss_prot.LOOKUP, thiscon, key.expkey);
				//send(sock, wss_prot.LOOKUP, {res: true, symkey: key.symkey});
			}else{
				console.log("Did not find mail ", msg.origin);
				send(sock, wss_prot.LOOKUP, {res: false, key: key.expkey});
			}
			break;

		case wss_prot.AUTH_SETUP:
			console.log("Protocol received: Authentication setup");
			auth_S_Reply(sock, msg);
			break;

		case wss_prot.AUTH_INIT:
			console.log("Protocol received: Authentication Initiation");
			console.log(msg);
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
			//Check the queue!
			//var thiscon = conn[msg.origin];
			//checkQueue();
			break;
		
		case wss_prot.REQKEY:
			console.log("Protocol received: Request Key! Looking for key for: ", msg.data);
			//todo fix!
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

//Return setup result
function auth_S_Reply(sock, msg){
	console.log("Org mail: ", msg.origin)
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
   		var thiscon = conn[msg.origin];

   		console.log(conn);
   		createSymmkey(sock, wss_prot.AUTH_S_REPLY, thiscon);

   	}else{
	   	//Share symkey! TODO
		send(sock, wss_prot.AUTH_S_REPLY, {res: auth}, msg.origin);
	}
}

//Return authentication result
async function auth_result(sock, data){
	console.log("Conn: ", conn);
	console.log("Data: ", data.origin)
	//data=JSON.parse(data);
	if(data.origin in conn){
		if(await isAuth(data)){
			console.log("User mail %s is authenticated!", data.origin);
			conn[data.origin].sock=sock
			send(sock, wss_prot.AUTH_RESULT, true, data.origin);
		}else{
			console.log("User mail %s is not authenticated!", data.origin);
			send(sock, wss_prot.AUTH_RESULT, false, data.origin);
			sock.close();
			conn[data.origin].sock=null;
		}

	}else{
		console.log("Details not stored for this user mail (%s) - please do an authentication setup!", data.origin);
		send(sock, wss_prot.AUTH_RESULT, false, data.origin);
		sock.close();
	}
}

//Compare and authenticate
async function isAuth(data){
	//console.log("isAuth data: ", data);
	//decrypt data
	var decrypted = await decrypt(data);
	console.log("Email: " + data.origin + " Decrypted: " + decrypted);
	if(data.origin === decrypted){
		return true;
	}
	return false;
}

//Decrypt data and return value or empty string
async function decrypt(data){
	var thiscon = conn[data.origin];
	var decryData;
	data=data.data;
	decryData = Object.values(data.ciph);
	
	return crypto.subtle.decrypt(
		{
			name: "AES-GCM",
			iv: thiscon.iv,
			//label: Uint8Array([...]) //optional
		},
		thiscon.symmetric,
		//this.key.privateKey, //from generateKey or importKey above
		new Uint8Array(decryData)//ArrayBuffer of the data
	)
	.then(function(decrypted){
		//returns an ArrayBuffer containing the decrypted data
		console.warn("Data decrypted raw: ", new Uint8Array(decrypted));
		decryData = new Uint8Array(decrypted);
		decryData = convertArrayBufferViewtoString(decryData);
		console.log("Data decrypted: ", decryData);
		return decryData;
	})
	.catch(function(err){
		console.error(err);
		return '';
	});
}

//Convert from array buffer to string
function convertArrayBufferViewtoString(buffer){
    var str = "";
    for (var iii = 0; iii < buffer.byteLength; iii++) 
    {
        str += String.fromCharCode(buffer[iii]);
    }

    return str;
}

//Send message through socket
function send(sock, sig, data=null, dst=null){
	var msg = {
		prot: sig,
		origin: 'server',
		destination: dst,
		data: data
	}
	msg = JSON.stringify(msg);
	if(sock.readyState === WebSocket.OPEN) {
		console.log("Sending to id: ", sock.id)
		console.log("Sending: ", msg);
        sock.send(msg);
    }else{
    	console.log("Error sending to id; %s Mail: %s ", sock.id, dst);
    	console.log("Error sending: ", msg);
		console.log("Socket state: ", sock.readyState);
    }
}

//Try to forward message
function forward(sock, msg) {
	if (msg.destination in conn){
		console.log("Forwarding protocol %s to %s!",  msg.prot, msg.destination);
		sendFw(conn[msg.destination].sock, msg);
	} else{
		console.log("Destination email %s not connected!", msg.destination);
		if(msg.prot==wss_prot.INIT){
			/*todo - add checking functionality for queued messages on connect!
			//q.add2Q(msg);
			console.log("Waiting for %s to connect!\n Sending waiting signal to %s", msg.destination, msg.origin);
			send(sock, wss_prot.WAIT);
			*/
			send(sock, wss_prot.REFUSE);
		}else{
			console.log("Connection error! ID %s went offline", sock.id);
			send(sock, wss_prot.ERROR, 'Other end disconnected from server!');
		}
	}
}
//Send to correct destination
function sendFw(sock, msg){
	msg = JSON.stringify(msg);
	if(sock.readyState === WebSocket.OPEN) {
		console.log("Sending to ID: %s Mail: %s", sock.id, msg.destination)
		console.log("Sending: ", msg);
        sock.send(msg);
    }else{
    	console.log("Error sending to; ", sock.id);
    	console.log("Error sending: ", msg);
		console.log("Socket state: ", sock.readyState);
    }
}

//Create symmetric key for connection
function createSymmkey(sock, prot, thiscon, expkey=null){
	thiscon.iv = crypto.getRandomValues(new Uint8Array(12));

	//Import clients public key!!!

	//Create symmetric key 
	crypto.subtle.generateKey(
			{
				name: "AES-GCM",
				length: 256,	
			},
			true,
			["encrypt", "decrypt"]
	)
	.then(function(key){
		//Encrypt with symmetric key
		thiscon.symmetric=key;
		return crypto.subtle.importKey(
			"jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
			thiscon.key,
			{   //these are the algorithm options
					name: "RSA-OAEP",
					hash: {name: "SHA-1"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
			},
			true, //whther the key is extractable (i.e. can be used in exportKey)
			["encrypt", "wrapKey"])
	})
	.then(function(key){
		
		console.log(thiscon.symmetric)
		//console.log(thiscon.key)
		//encrypt (wrap) symmetric key with server public key
		return crypto.subtle.wrapKey(
			"raw", //the export format, must be "raw" (only available sometimes)
		    thiscon.symmetric, //the key you want to wrap, must be able to fit in RSA-OAEP padding
		    key, //the public key with "wrapKey" usage flag
		    {   //these are the wrapping key's algorithm options
		        name: "RSA-OAEP",
		        hash: {name: "SHA-1"},
		    }
		)
	})
	.then(function(wrapKey){
	  //Create object for sharing: iv, wrapped symmetric key amnd cipher
	  //wrapKey is null?!? TODO
	  var wrapped = new Uint8Array(wrapKey);
	  var msg;
	  if(expkey){
	  	msg = {res: true, iv: thiscon.iv, wrap: wrapped, key: expkey};
	  }else{
	  	msg = {res: true, iv: thiscon.iv, wrap: wrapped};

	  }
	  console.log("Object", msg);
	  send(sock, prot, msg);
	})
	.catch(function(err){
	  console.error(err);
	});
}

//Exit handling!-------------------------------------------------------------------
process.on('SIGTERM', closeAll, 'SIGTERM');
process.on('SIGINT', closeAll, 'SIGINT');
//process.on('exit', closeAll, 'exit');
process.on(`uncaughtException`, closeAll, `uncaughtException`);

//Error-handling and gracious shutdown
async function closeAll (sig) {
	console.log('\nShutting down gracefully after %s :)!', sig)
	wss.clients.forEach(function(c) {
		c.close();
	 });
	await writeFile();
	process.exit(sig);
};

//Write data to file
async function writeFile(){
	var write;
	//Stores the own email, then own private key, then list of know hosts and public-key-pairs.
	await Promise.all(
		[(
			crypto.subtle.exportKey(
				"jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
				key.privateKey //can be a publicKey or privateKey, as long as extractable was true
			)
		),
			crypto.subtle.exportKey(
				"jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
				key.publicKey //can be a publicKey or privateKey, as long as extractable was true
			)
		])
	.then(function (keys) {
		write =JSON.stringify(keys[0]) + ";\n" + JSON.stringify(keys[1]) + ";\n";
		
		//TEST!
		for(con in conn){
			write = write + con +";"+JSON.stringify(conn[con].key)+";\n";
		}
				
		try{
	 		fs.writeFileSync("./keys.crp", write);
		}catch(err){
			console.error(err);
		}
	}).catch(function(err){
		//Error-handling just in case
		console.error(err);
	});
}