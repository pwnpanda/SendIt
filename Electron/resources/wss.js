/*
TODO need to add wss!

Connection-initiation, authentication, message handling, teardown

IMPORTANT!!!
Handle case when client is already busy. Make connection wait until current process is done.

Handle after wss messages:
createLocalOffer();
*/

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
	TEST: "tst" //For testing setup
};

function wscon(){
	sc = new WebSocket('wss://' + server);


	sc.onopen = function () {
	   	send(wss_prot.TEST, 'ping');
	};

	sc.onmessage = gotMessageFromServer;
	sc.onclose = function(ev){
	    console.log("Socket closed by server!", ev);
		
	};

	sc.onerror = function(err){
		var str="Socket-error occurred! Not connected to server!";
	    console.log("Socket-error occurred: ", err);
	    $('#sockerror').html(str);
	};
}

function gotMessageFromServer(message){
	var msg = JSON.parse(message.data);
	//console.log("Received: ", msg);
	switch(msg.prot){
		case wss_prot.TEST:
			console.log("Message received: ", msg.data);
			if(msg.data === 'pong'){
				console.log("PingPong done!");
				authSetup();
			}
			break;

		case wss_prot.AUTH_S_REPLY:
			console.log("Protocol received: Authentication setup reply");
			if(msg.data){
				console.log("Authentication setup successful!");
				//Test the authentication set up!
				authInit();
			}else{
				console.log("Authentication setup failed!");
				sc.close();
	    		$('#sockerror').html('Server authentication failed!');
			}
			break;

		case wss_prot.AUTH_RESULT:
			console.log("Protocol received: Authentication Result");
			if(msg.data){
				console.log("Authentication successful!");
				//init();
			}else{
				console.log("Authentication failed!");
				sc.close();
	    		$('#sockerror').html('Server authentication failed!');
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
		origin: myMail,
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
	//Wait for keys
	Promise.resolve(km.key)
	.then(function(key){
		console.log("Keypair created!", key)
		km.key=key;
		//Export the key
		return km.exportKey(key.publicKey);
	})
	.then(function(key){
		console.log("Public key ready for export", key);
		send(wss_prot.AUTH_SETUP, key);
		km.getObjectData(false);
	})
	.catch(function(err){
		console.error(err);
	});
}

function authInit(){
	//Create authentication proof! TODO
	//console.log(km);
	//var msg = encrypt(km.key.privateKey, km.email);
	var msg='OK!';
	send(wss_prot.AUTH_INIT, msg);
}

function wsInit(){
	//Need meta-data of file!
	var data;
	//console.warn(fmArray);
	for (var i = 0; i < nrOfFiles; i++) {
		var file= { 
			fname: fmArray[i].fileName,
		 	ftype: fmArray[i].fileType,
		 	fsize: fmArray[i].size
		};
		if(data !== 'undefined'){
			data = new Object();
			data.files=new Object();
		}
		(data.files)[i]=file;
	}
	console.log(data);
	send(wss_prot.INIT, data, km.otherEnd);
}

window.addEventListener('unload', messageSend, false);

function messageSend(){
    //sc.send(JSON.stringify({'log': log, 'uuid': uuid}));
    sc.close();
}