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

var email = prompt("Please enter your name", "John Wick");
var pubkey = prompt("Please enter your key", "123");

//let pubkey = '{"alg":"RSA-OAEP-512","e":"AQAB","ext":true,"key_ops":["wrapKey"],"kty":"RSA","n":"rtlxyjEqswXQ1POnDu1Q0ZuF1HuDH1hcH9aJV2MoNPTggZUin_IecFnprfbtBPFFFNgVXq3LnUb5iiVXbzRFJPy7f9t0VX7heIqKe5FEHCbaoy_rSKE7ItlTI8hFsMNGvT-ZaB5smVeMLOnRnBivW-rMXymKOBkPcUIt9PI5ETBnfyWceyF2S8kPt6RQF-kkX5N8cAM6DoOYRF0bbKkZM5HyJwOyQin_Eva_ScyEzxLaldhltQNcpaDV58qpCM2HdfODKMHu_j6A45ZrGyddOa7a1nrvrms89hgNsCtSMJzG7U8HFvUjiSYskP0z-LisN5h01HYj77JcGNl1THYCRQ"}';
//let privkey = '{"alg":"RSA-OAEP-512","d":"hwJHpsQIIGuhMI1itVfxS6g20jb8rDtiBwN00REzfpCGuggZ0D732fDTSwybP3G80bd36L9xtWOUU2M5_Bf0O_caIEOntExgdN8kxv0IBmTJ9a-OkWpNaz87vylpBnACMybkoUy8tjqvdg6lV06IOQU4AVLl8yMGlYFwUu6luerLfFIthm51Q709m3tWHq1cFLlw4IxJkg4fBh69nCBZ25ThJo1XKI7buxMhBHG_0btaFKyapF06B0_8efz8e8IXfXy8gcokbkoxWNU6w_HwifpXILXePkXillKXmWRv3u2OrzGxYuiiJrDWQO7TcQyZBhOr9Ohi-0J5g1vP68DUkQ","dp":"MQTYwF3oInz0zUcov8cafLNn0gJlZST7WLTTtjV8Jzs6zRMIXSOqG3BOzYoPW9WZdcavFhPscnUXLOqBxG5KlPtxb_nIz1f3Z4utF_wFoUTOoY_SW_hyAoeUFxxsn4TpId3M0XkAFHEg3_SDYnqQSAp_7X9TNDWquMpLvbF2rg0","dq":"N1wx9u7aVT5iP2FgbZ4flhAIwuEMvkfsig-rqTJScN8KuLiiVt1d4UjqyAz1UXICKBekny4u7bFSktzJcgDvzKyn9ZvsSIfHJhUTaePSngaM__SoH8J3yu8rg1sQL7FN0Lr9gRMccB95CXO-3wYu3znTAnCEGOvx2z22l7HILas","e":"AQAB","ext":true,"key_ops":["unwrapKey"],"kty":"RSA","n":"rtlxyjEqswXQ1POnDu1Q0ZuF1HuDH1hcH9aJV2MoNPTggZUin_IecFnprfbtBPFFFNgVXq3LnUb5iiVXbzRFJPy7f9t0VX7heIqKe5FEHCbaoy_rSKE7ItlTI8hFsMNGvT-ZaB5smVeMLOnRnBivW-rMXymKOBkPcUIt9PI5ETBnfyWceyF2S8kPt6RQF-kkX5N8cAM6DoOYRF0bbKkZM5HyJwOyQin_Eva_ScyEzxLaldhltQNcpaDV58qpCM2HdfODKMHu_j6A45ZrGyddOa7a1nrvrms89hgNsCtSMJzG7U8HFvUjiSYskP0z-LisN5h01HYj77JcGNl1THYCRQ","p":"1qgkfVNhZ7Y6rPgzTFJrJSazkBmUXV4w4ct1kPjSaL4_S5prFT7VHlFkTb3rgYErD5GDfEVsP-6mGAt46tMQcWjUTYIvkonZMk74OnOGBq24m7OSUP2sXv8fAcDpHKkmVFiD55rDKdxObgvB2xXocGVmh6rlNHXN0gm5mAUATLM","q":"0IaPRGK3eoefF-7t9g_R64rsE6AA7ot-9mUqdg-PwO4tDJmYUkYEipVXx7tWaxMqcyyban5NXJh-mPtAh8CU-6qNqlYaDK8V9xZBDD6-64VzpAkfoBsvFs4sB85_QN1BFAlzEz1VV3hq5HQBgxkVwKdp3hBPeVe_e-zmQeR74Sc","qi":"o8kqZPEyMw5GU2PtwAFAfxBtMT7M3UjrxZMRq-W8GZfkEZraVl3ljj_jc4wdgb6BsPcCCYR5bJosefK8a8snw5lx_4cGV-gqbbFvQGZU0pNrWm06_pVrnbI5elhtuqoZoRRVqmtM-qGa8tEI72fHf-fxy1F_xcnAl183HloReTo"}';

var  sc = new WebSocket('wss://' + window.location.hostname + ':7443');
sc.onopen = function () {
   	send(wss_prot.TEST, 'ping');
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
			console.log("Protocol received: Error");
			break;
		case wss_prot.WAIT:
			console.log("Protocol received: Wait");
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
			console.log("Protocol received: Key");
			break;
		case wss_prot.ACCEPT:
			console.log("Protocol received: Accept");
			break;
		case wss_prot.REFUSE:
			console.log("Protocol received: Refuse");
			send(wss_prot.DONE);
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

function authInit(){
	//Create authentication proof! TODO
	//var msg = encrypt(privkey, email);
	let msg = {
		iv: 'iv',
		key: 'key',
		ciph: 'cipher'
	}
	send(wss_prot.AUTH_INIT, msg);
}

function init(){
	//Need meta-data of file!
	let data = { files:
		{
			1: { fname: 'testFile', fileType: 'exe', fSize: '2000 kb'},
			2: { fname: 'testPic', fileType: 'jpg', fSize: '1000 kb' }
		}
	}
	if(confirm('Sending!')){
		send(wss_prot.INIT, data, '2');
	}else{
		console.log('Declined sending data!');
	}
}

window.addEventListener('unload', messageSend, false);

function messageSend(){
    //sc.send(JSON.stringify({'log': log, 'uuid': uuid}));
    sc.close();
}
//Flow
	// Start by authenticating.
	//Then get authentication reply
	//Then init
	//Then reply
	//Then split!
//	send(wss_prot.INIT);