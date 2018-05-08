/*
TODO
Lacking:
	- Queue handling:
		*How to check for queued messages?
		*How to prioritize?
		*Send notification of place in queue!
	- Implement reqkey and get confirmation from other node!
		*How to get confirmation from owner?
		*Out of band? Mail?

	Sender 	-	server 	 -	Receiver
						<-	Reqkey
				Key 	->

IMPORTANT!!!
Handle case when client is already busy.
Make connection wait until current process is done.
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
	LOOKUP: "lookup" //For looking up email presence
};

function wscon(){
	sc = new WebSocket('wss://' + server);


	sc.onopen = function () {
	   	send(wss_prot.LOOKUP);
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

async function gotMessageFromServer(message){
	var msg = JSON.parse(message.data);
	//console.log("Received: ", msg);
	switch(msg.prot){
		//Lookup message
		case wss_prot.LOOKUP:
			console.log("Lookup message received: ", msg.data);
			lookupReply(msg.data);
			break;

		case wss_prot.AUTH_S_REPLY:
			console.log("Protocol received: Authentication setup reply");
			if((msg.data).res){
				console.log("Authentication setup successful!");
				//Test the authentication set up!
				authenticate(msg.data);
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
			reset();
			//Show correct information on screen
    		$('#showHome').modal('hide');
    		//TODO beautify!
    		var st = 'Current email: '+km.email+'<br><br>Receivers email: '+msg.destination+'<br><i>Indicated by sender</i><br><br>Senders email: '+msg.origin;
    		km.otherEnd=msg.origin;
  			$('#emailDet').html(st);
  			var inf = msg.data;
  			inf = inf.files;
			var output = [];
			output.push('<h3>Files:</h3>');
			// List information about files to be received!
			for(key in inf){
  				//console.log(inf);
				//console.log(key);
				output.push('<li>Name: <strong>', inf[key].fname, '</strong> ', 'Type: <strong>'+inf[key].ftype +'</strong> Size: <strong>' + inf[key].fsize + ' kbytes</strong>','</li>');
			}
			document.getElementById('listRec').innerHTML = '<ul style="list-style-type: none;">' + output.join('') + '</ul>';
  			$('#showReceive').modal('show');
			break;

		//TODO
		case wss_prot.KEY:
			if(msg.data){
				console.log("Received key: ", msg.data);
				//TODO add key! msg.data = {email: key}
			}else{
				console.log("No information stored for requested address!");
			}
			break;

		case wss_prot.ACCEPT:
			console.log("Protocol received: Accept! Offer: ", msg.data);
			//create answer
			//console.log(message.data);
    		var pubkey = km.findKey(km.otherEnd);
			var d = await decrypt(pubkey, JSON.stringify(msg.data));

			handleOfferFromPC1(d);
			break;

		case wss_prot.REFUSE:
			console.log("Protocol received: Refuse");
			alert('Sender refused connection!');
			send(wss_prot.DONE);
			reset();
			break;

		case wss_prot.ANSWER:
			console.log("Protocol received: Answer! Answer: ", msg.data);
			//set remote description msg.data!
			var d = await decryptReply(JSON.stringify(msg.data));
		    $('#myStat').html('Waiting for connection to be established...');
			handleAnswerFromPC2(d);
			break;

		case wss_prot.ICE:
			console.log("Protocol received: ICE! ICE: ", msg.data);
			//Test!
			addIce(JSON.stringify(msg.data));
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

function lookupReply(msg){
	/*servkey=msg.key;
	console.log(servkey);
	//Import server's key
	km.importKey(servkey, ["encrypt", "wrapKey"])
	.then(function(key){
		//km.servkey=key;
		km.storeKey(server, servkey);*/
		//If previously connected to the server, authenticate
		if(msg.res){			
			console.log("Email found in server!");
			authenticate(msg);
		//If not setup 
		}else{
			console.log("Email not found in server!");
			authSetup();
		}
	/*})
	.catch(function(e){
		console.error("Reading in error: ", e);
	})*/
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

async function authenticate(msg){
	console.log("Authenticate", msg);

	//Retrieve IV
	var temp = Object.values(msg.iv);
	temp = new Uint8Array(temp);
	km.serviv=temp;
	//Get wrapped session key
	temp = new Uint8Array( Object.values(msg.wrap) );
	//Unwrap session key
	await km.unwrapKey(temp.buffer, km.key.privateKey)
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	//Proves you have private key corresponding to servers stored public key!
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	//Encrypt own email with correct sessionkey
	.then(function(symKey){
		km.servSymmetric=symKey;
		//console.log(symKey);
		return km.encryptData(km.servSymmetric, convertStringToArrayBufferView(myMail), km.serviv)
	})
	//returns an ArrayBuffer containing the encrypted data
	.then(function(encrypted){
		encryData = new Uint8Array(encrypted);
		console.info("Data encrypted: ", encryData);
		var msg = {ciph: encryData}
		console.log("Encrypted", msg);
	  	send(wss_prot.AUTH_INIT, msg);
	})
	.catch(function(err){
		console.error(err);
	});
}

function wsInitFiles(){
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

function convertStringToArrayBufferView(str){
    var bytes = new Uint8Array(str.length);
    for (var iii = 0; iii < str.length; iii++) 
    {
        bytes[iii] = str.charCodeAt(iii);
    }

    return bytes;
}   

//------------------------------------------------------------------------------
//Handles graceful shutdown!
window.addEventListener('unload', messageSend, false);

function messageSend(){
    //sc.send(JSON.stringify({'log': log, 'uuid': uuid}));
    sc.close();
}