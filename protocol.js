var protocol = {
	//MINE------------------------------>
	AUTH_CHALLENGE: "challenge",
	AUTH_RESPONSE: "response",
	AUTH_SETUP: "setup",
	AUTH_S_REPLY: "setup_reply",
	//MINE END-------------------------->
	OFFER: "offer",
	ANSWER: "answer",
	REQUEST: "req-chunk",
	DATA: "data",
	DONE: "done",
	ERR_REJECT: "err-reject",
	CANCEL: "cancel"
};

//Chunksize
//Set to 1200 bytes, according to:
//https://cs.chromium.org/chromium/src/third_party/libjingle/source/talk/media/sctp/sctpdataengine.cc?l=52
//https://bloggeek.me/send-file-webrtc-data-api/
var maxChunkSize = 1200;

//According to https://github.com/tskimmett/rtc-pubnub-fileshare/blob/master/connection.js
var MAX_FSIZE = 160;    // MiB -- browser will crash when trying to bring more than that into memory.

var nChunksSent = 0;
var curFileNum=0;
var nrOfFiles;
var fmArray;

//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
//Receive the data
//Handle different types of messages here!
function onReceiveMessageCallback(event) {
	var data = JSON.parse(event.data);
	console.info("Recieved data: ", data);
	
	if(data.action == protocol.DATA){
		fmArray[curFileNum].receiveChunk(data);
	}
	else if(data.action == protocol.REQUEST){
		nChunksSent += data.ids.length;
		displayProgress(data.nReceived / fmArray[curFileNum].fileChunks.length);
		data.ids.forEach(function (id) {
			doSend(packageChunk(id));
		});
	}
	else if(data.action == protocol.DONE){
		//File recieved by partner
		console.log("File recieved by partner!");
		curFileNum++;
		if(curFileNum == nrOfFiles){
			closeDataChannels();
			document.querySelector('#transferDetailsEnd').innerHTML = 'Filename: ' + fmArray[curFileNum-1].fileName + '. Filenumber ' + curFileNum + '/' + nrOfFiles + '. Percent: 100/100';
		} else{
			offerShare();
		}
	} else{
		handleSignal(data);
	}
}


//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
//Close channels and cleanup
function closeDataChannels() {
	$('#connectedScreen').modal('hide');
	$('#endScreen').modal('show');


	console.log('Closing data channel');
	activedc.close();
	console.info('Closed data channel');

	pc1.close();
	pc2.close();
	pc1 = null;
	pc2 = null;
	console.info('Closed peer connections');
	km.getObjectData();
}

//Show progress
function displayProgress(perc){
	document.querySelector('#transferDetails').innerHTML = 'Filename: ' + fmArray[curFileNum].fileName + '. Filenumber: ' + (curFileNum+1) + '/' + nrOfFiles + '. Percent: ' + (perc*100).toFixed(2) + '/100';
}
//Create the Authentication message to send
function createAuthMsg(type){
	var msg;
	console.log("Creating message of type ", type);
	switch (type){
		//Sending authentication challenge
		case protocol.AUTH_CHALLENGE:
			//Send the challenge encrypted with receiver's public key
			var key = km.findKey(km.otherEnd);
			key = JSON.parse(key);
			km.importKey(key, key.key_ops)
			.then(function(keyObject){
				return km.encryptData(keyObject, km.challenge);
			})
			.then(function(encrypted){
				//returns an ArrayBuffer containing the encrypted data
				var encrData = new Uint8Array(encrypted);
				console.info("Data encrypted: ", encrData);
				return encrData;
			})
			.then(function(encrypted){
				msg = {
				challenge: encrypted,
				sender: km.email,
				action: type
				};
				doSend(msg);
			})
			.catch(function(err){
			console.error(err);
			}); 
			
			break;
		//Sending authentication response
		case protocol.AUTH_RESPONSE:
			//Send the calculated hash encrypted with sender's public key
			tmp = km.encryptData(km.curHash).then(km.cryptoResolved()).catch(km.err());
			msg = {
				challenge: tmp,
				sender: km.email,
				action: type
			}
			break;
		//Sending authentication setup information  
		case protocol.AUTH_SETUP:
		//Just let it pass through, since it is identical to AUTH_S_REPLY, except the type which is already handled
		//Sending authentication setup reply
		case protocol.AUTH_S_REPLY:
			//Gets the promise for exportKey.
			km.exportKey(km.key.publicKey)
			.then(function(keydata){
				//Once the data has been calculated, itreturns the exported key data
				console.info("Exported key: ", keydata);
				return keydata;
			}).then(function(key){
				//Then lastly it creates the message and sends it.
				msg = {
					key: key,
					sender: km.email,
					action: type
				};
				doSend(msg);
			})
			.catch(function(err){
				//Error-handling just in case
				console.error(err);
			 }
			);
			break;
		//Error!
		default: 
			console.error("Malformed message type: ", type);
			break;
	}
}
//Everything below taken from
//https://github.com/tskimmett/rtc-pubnub-fileshare/blob/master/connection.js
//Create offer to share file and send
function offerShare(){
	console.log("Offering share of file nr ", curFileNum);
	var fm = fmArray[curFileNum];
	console.info("Offering share of file: " + fm.fileName);
	var msg = {
		totFiles: nrOfFiles,
		fName: fm.fileName,
		fType: fm.fileType,
		nChunks: fm.fileChunks.length,
		action: protocol.OFFER
	};
	doSend(msg);
}
//Create answer to accept sharing offer
function answerShare(){
	console.log("Answering share...");
	var msg = {
		action: protocol.ANSWER
	};
	doSend(msg);

	fmArray[curFileNum].requestChunks();
}
//Send data
function doSend(msg){
	console.info("Sending data...: ", msg);
	activedc.send(JSON.stringify(msg));
}
//Package data-chunks
function packageChunk(chunkId){
	return {
		action: protocol.DATA,
		id: chunkId,
		content: Base64Binary.encode(fmArray[curFileNum].fileChunks[chunkId])
	};
}
//Handles received signal
function handleSignal(msg) {
	console.info('Handle signal: ', msg);
	//Find correct signal
	switch(msg.action){
		//Other side is ready
		case protocol.ANSWER:
			console.log("THE OTHER PERSON IS READY");
			break;

		//Received offer
		case protocol.OFFER:
			// Sender is ready to send file data. Set up receiving structure
			console.info("Receiving file nr: " + (curFileNum+1) + " of " + msg.totFiles)
			if(curFileNum == 0){
				nrOfFiles = msg.totFiles;
				fmArray = new Array(msg.totFiles);
			}
			fmArray[curFileNum] = new FileManager(maxChunkSize);
			registerFileEvents(fmArray[curFileNum]);
			fmArray[curFileNum].stageRemoteFile(msg.fName, msg.fType, msg.nChunks);
			//Let sender know you received offer
			answerShare();
			break;
		
		//Some kind of error! Handled here!
		case protocol.ERR_REJECT:
		case protocol.CANCEL:
			alert("Unable to communicate! Stopping transfer! Error: ", msg.action);
			closeDataChannels();
			break;
		
		//Route all authentication-signals to processAuth
		case protocol.AUTH_CHALLENGE:
		case protocol.AUTH_RESPONSE:
		case protocol.AUTH_SETUP:
		case protocol.AUTH_S_REPLY:
			console.info("Received authentication signal: ", msg.action);
			processAuth(msg);
			break;
		
		//If none of the above, something strange happened!
		default:
			console.error("Unrecognized signal received! Signal: " + msg.action);
			break;
	}
}
//Called when receiving chunks!
function chunkRequestReady(chunks, fm){
	console.info("Chunks ready: ", chunks.length);
	var req = {
		action: protocol.REQUEST,
		ids: chunks,
		nReceived: fm.nChunksReceived
	};
	console.info('Resend: ', req);
	doSend(req);
}
//Called when receiving last chunk
function transferComplete(){
	console.log("Last chunk received.");
	doSend({ action: protocol.DONE });
	document.querySelector('#transferDetailsEnd').innerHTML = 'Filename: ' + fmArray[curFileNum].fileName + '. Filenumber: ' + (curFileNum+1) + '/' + nrOfFiles + '. Percent: 100/100';
	fmArray[curFileNum].downloadFile();
	curFileNum++;
	if(curFileNum == nrOfFiles){
		closeDataChannels();
	}
}
//Registers the different events
function registerFileEvents(fm) {
			fm.onrequestready = chunkRequestReady;
			fm.onprogress = displayProgress;
			fm.ontransfercomplete = transferComplete;
}