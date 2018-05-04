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
	INIT: "start", //Ask for connection
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

var email = prompt("Please enter your email", "send@test.com");
var pubkey;
var keypair;
var symmetric;
var servkey;


var  sc = new WebSocket('wss://' + window.location.hostname + ':7443');
//when connected to websocket
sc.onopen = function () {
	//Create keypair
	window.crypto.subtle.generateKey(
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
		keypair=keys;
		//Get public key ready for sharing
		return window.crypto.subtle.exportKey(
			"jwk",
			keys.publicKey
		)
	})
	.then(function(expkey){
		pubkey=expkey;
		//Initiate connection
   		send(wss_prot.LOOKUP);
	})
	.catch(function(e){
		console.error("Key generation/export error: ", e);
	});
	
};

sc.onmessage = gotMessageFromServer;
sc.onclose = function(){
    console.log("Socket closed by server!");
	
};

sc.onerror = function(err){
    console.log("Socket-error occurred: ", err);

};

//Handle messages from server
function gotMessageFromServer(message){
	var msg = JSON.parse(message.data);
	//console.log("Received: ", msg);
	switch(msg.prot){
		case wss_prot.LOOKUP:
			console.log("Message received: ", msg.data);
			servkey=(msg.data).key;
			console.log(servkey);
			//Import server's key
			window.crypto.subtle.importKey(
				"jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
				servkey,
				{   //these are the algorithm options
						name: "RSA-OAEP",
						hash: {name: "SHA-1"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
				},
				true, //whther the key is extractable (i.e. can be used in exportKey)
				["encrypt", "wrapKey"]
			)
			.then(function(key){
				servkey=key;
				//If previously connected to the server, authenticate
				if((msg.data).res){
					console.log("Email found in server!");
					authInit(msg.data);
				//If not setup 
				}else{
					console.log("Email not found in server!");
					authSetup();
				}
			})
			.catch(function(e){
				console.error("Reading in error: ", e);
			})
			break;

		case wss_prot.AUTH_S_REPLY:
			console.log("Protocol received: Authentication setup reply");
			if((msg.data).res){
				console.log("Authentication setup successful!");
				//Test the authentication set up!
				authInit(msg.data);
			}else{
				console.log("Authentication setup failed!");
				console.error("Terminate connection!");
			}
			break;

		case wss_prot.AUTH_RESULT:
			console.log("Protocol received: Authentication Result");
			if(msg.data){
				console.log("Authentication successful!");
				init();
			}else{
				console.log("Authentication failed!");
			}
			break;

		case wss_prot.ERROR:
			console.log("Protocol received: Error! Details: ", msg.data);
			break;

		case wss_prot.WAIT:
			console.log("Protocol received: Wait!");
			break;

		case wss_prot.INIT:
			console.log("Protocol received: Initialize connection. Data: ", msg.data);
			if(confirm('Receive!')){
				var offer = "offer";
				send(wss_prot.ACCEPT, offer, msg.origin);
			}else{
				console.log('Declined receiving data from %s!', msg.origin);
				send(wss_prot.REFUSE, null, msg.origin);
			}
			break;

		case wss_prot.KEY:
			if(msg.data){
				console.log("Received key: ", msg.data);
				//TODO add key! msg.data = {email: key}
			}else{
				console.log("No information stored for requested address!");
			}
			break;

		case wss_prot.ACCEPT:
			console.log("Protocol received: Accept! Offer: ", msg.offer);
			//set remote description msg.data! todo
			//create answer
			createAnswer(msg);
			break;

		case wss_prot.REFUSE:
			console.log("Protocol received: Refuse");
			send(wss_prot.DONE);
			break;

		case wss_prot.ANSWER:
			console.log("Protocol received: Answer! Answer: ", msg.data);
			//set remote description msg.data! todo
			break;

		case wss_prot.ICE:
			console.log("Protocol received: ICE! ICE: msg.data");
			//Test!
			//addIce(msg.data);
			break;

		case wss_prot.AUTH_SETUP:
			console.log("Protocol received: Authentication setup\nERROR! Not supposed to be here!");
			break;
		case wss_prot.AUTH_INIT:
			console.log("Protocol received: Authentication Initiation\nERROR! Not supposed to be here!");
			break;
		case wss_prot.REQKEY:
			console.log("Protocol received: Request Key\nERROR! Not supposed to be here!");
			break;

		default:
			console.log("Unknown message: ", msg);
			break;
	}	
}

function send(sig, data=null, dst=null){
	var msg = {
		prot: sig,
		origin: email,
		destination: dst,
		data: data
	}
	msg = JSON.stringify(msg);
	if(sc.readyState === WebSocket.OPEN) {
		console.log("Sending: ", msg);
        sc.send(msg);
    }else{
		console.log("Error sending! Socket state: ", sc.readyState);
    }
}

function authSetup(){
	//key = km.key.publicKey
	send(wss_prot.AUTH_SETUP, pubkey);
}

async function authInit(msg){
	console.log(msg);

	//Retrieve IV
	var temp = Object.values(msg.iv);
	temp = new Uint8Array(temp);
	var iv=temp;
	//Get wrapped session key
	temp = new Uint8Array( Object.values(msg.wrap) );
	//Unwrap session key
	await crypto.subtle.unwrapKey(
		"raw", //the import format, must be "raw" (only available sometimes)
		temp.buffer, //the key you want to unwrap
		keypair.privateKey, //the private key with "unwrapKey" usage flag
		{   //these are the wrapping key's algorithm options
		    name: "RSA-OAEP",
		    modulusLength: 2048,
		    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
		    hash: {name: "SHA-1"},
		},
		{   //this what you want the wrapped key to become (same as when wrapping)
		    name: "AES-GCM",
		    length: 256
		},
		true, //whether the key is extractable (i.e. can be used in exportKey)
		["encrypt", "decrypt"]
	)
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	//Proves you have private key corresponding to servers stored public key!
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	//Encrypt own email with correct sessionkey
	.then(function(symKey){
		symmetric=symKey;
		console.log(symKey);
		return window.crypto.subtle.encrypt(
			{
				name: "AES-GCM",
				iv: iv,
			},
			symKey, //from generateKey or importKey above
			convertStringToArrayBufferView(email)
			)
	})
	//returns an ArrayBuffer containing the encrypted data
	.then(function(encrypted){
		encryData = new Uint8Array(encrypted);
		console.info("Data encrypted: ", encryData);
		var msg = {ciph: encryData}
		console.log("Object", msg);
	  	send(wss_prot.AUTH_INIT, msg);
	})
	.catch(function(err){
		console.error(err);
	});
}

function init(){
	//Need meta-data of file!
	let data = { files:
		{
			0: { fname: 'testFile', fileType: 'exe', fSize: '2000 kb'},
			1: { fname: 'testPic', fileType: 'jpg', fSize: '1000 kb' }
		}
	}
	if(confirm('Sending!')){
		send(wss_prot.INIT, data, '2');
	}else{
		console.log('Declined sending data!');
	}
}

//------------------------------------------------------------------------------
//Handles graceful shutdown!
window.addEventListener('unload', messageSend, false);

function messageSend(){
    //sc.send(JSON.stringify({'log': log, 'uuid': uuid}));
    sc.close();
}

function convertStringToArrayBufferView(str){
    var bytes = new Uint8Array(str.length);
    for (var iii = 0; iii < str.length; iii++) 
    {
        bytes[iii] = str.charCodeAt(iii);
    }

    return bytes;
}   
