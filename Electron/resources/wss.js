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
	INIT: "start", //Offer sending - forwarded
	DONE: "done", //Connection finished
	REQKEY: "request_key", //Request public key

//Server-Client messages
	KEY: "key", //Share keys for other end

//Client-Client messages
	ACCEPT: "accept", //Accept offer - contains offer!
	REFUSE: "refuse", //Refuse offer
	ANSWER: "answer", //Contains answer
	ICE: "ice" //Contains ICE-candidates
};

sc = new WebSocket('wss://' + server);
sc.onmessage = gotMessageFromServer;


function gotMessageFromServer(message) {

    var signal = JSON.parse(message.data);
    errorHandler("Signal received ",signal);

    switch(signal.signal){
    	//Authentication
    	case wss_prot.AUTH_S_REPLY:
    		console.log("Received authentication setup complete confirmation.");
    		//Create init message
    		break;
    	case wss_prot.AUTH_RESULT:
    		console.log("Received authentication result: ", signal.data);
    		//Create init message, if success!
    		//If error, data contains info
    		break;
    	//All directions
    	case wss_prot.WAIT:
    		console.log("Waiting for response from receiver");
    		//Do nothing until next message arrives - update waiting screen!
    		//Data tells what we're waiting for
    		break;
    	case wss_prot.ERROR:
    		//Something went wrong somewhere - data contains info!
    		console.log("Connection error: ", signal.data);
    		break;
    	case wss_prot.INIT:
    		console.log("Received offered connection - Show data and give option to connect");
    		//Data contains Sender, receiver and file info.
    		break;
    	//Server to client
    	case wss_prot.KEY:
    		//Add key for partner to keyring.
    		console.log("Public key of connection: ", signal.data);
    		break;
    	//End-to-End
    	case wss_prot.ACCEPT:
    		console.log("Receiver accepted connection - starting setup");
    		//Generate offer, encrypt and send
    		break;
    	case wss_prot.REFUSE:
    		console.log("Receiver refused connection - returning to menu");
    		//Return to main screen
    		break;
    	case wss_prot.ANSWER:
    		console.log("Received answer");
    		//Process answer (in data)
    		//Connect
    		break;
    	case wss_prot.ICE:
    		console.log("Received ICE informations");
    		//Add ICE!
    		break;
    	default:
    		console.log("Unknown signal received from server: ", signal);
    		break;
    }
}

//Move?
function wsSend(sig, data){
	var msg = {
		signal: sig,
		origin: km.email,
		destination: km.otherEnd,
		data: data
	}
	sc.send(JSON.stringify(msg));
}