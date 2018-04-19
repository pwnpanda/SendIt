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


var  sc = new WebSocket('wss://' + window.location.hostname + ':7443');
sc.onopen = function () {
   	send({prot: wss_prot.TEST, msg:'ping'});
};

sc.onmessage = gotMessageFromServer;
sc.onclose = function(code, reason){
    console.log("Socket closed! Code: %d Reason: %s", code, reason);
	
};

sc.onerror = function(err){
    console.log("Socket-error occurred: ", err);

};

function gotMessageFromServer(message){
	var msg = JSON.parse(message.data);
	//console.log("Received: ", msg);
	switch(msg.prot){
		case wss_prot.TEST:
			console.log("Message received: ", msg.msg);
			if(msg.msg === 'pong'){
				console.log("PingPong done!");
				send({ prot: wss_prot.INIT });
			}
			break;
		case wss_prot.AUTH_S_REPLY:
			console.log("Protocol received: Authentication setup reply");
			break;
		case wss_prot.AUTH_RESULT:
			console.log("Protocol received: Authentication Result");
			break;
		case wss_prot.ERROR:
			console.log("Protocol received: Error");
			break;
		case wss_prot.WAIT:
			console.log("Protocol received: Wait");
			break;
		case wss_prot.INIT:
			console.log("Protocol received: Initialize connection");
			send({prot: wss_prot.ACCEPT});
			break;
		case wss_prot.KEY:
			console.log("Protocol received: Key");
			break;
		case wss_prot.ACCEPT:
			console.log("Protocol received: Accept");
			break;
		case wss_prot.REFUSE:
			console.log("Protocol received: Refuse");
			send({prot: wss_prot.DONE});
			break;
		case wss_prot.ANSWER:
			console.log("Protocol received: Answer");
			break;
		case wss_prot.ICE:
			console.log("Protocol received: ICE");
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

function send(data){
	data = JSON.stringify(data);
	if(sc.readyState === WebSocket.OPEN) {
		console.log("Sending: ", data);
        sc.send(data);
    }else{
		console.log("Error sending! Socket state: ", sc.readyState);
    }
}