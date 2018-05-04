//NodeJS imports
var fs = require('fs');
var path = require('path'); 

var protocol = {
	//MINE------------------------------>
	AUTH_SETUP: "setup",
	AUTH_S_REPLY: "setup_reply",
	//MINE END-------------------------->
	OFFER: "offer",
	ANSWER: "answer",
	REQUEST_META: 'req_meta',
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
//Changed according to NodeJS! TODO test 1gb
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
			closeDataChannels({action: protocol.DONE});
			document.querySelector('#transferDetailsEnd').innerHTML = 'Filename: ' + fmArray[curFileNum-1].fileName + '. Filetype: '+fmArray[curFileNum-1].fileType + '. Filenumber ' + curFileNum + '/' + nrOfFiles + '. Percent: 100/100';
			//Add line for each file completed!
			var doc = document.querySelector('#download');
			doc.innerHTML = "Files sent: <br>";
			for (var i = 0; i < nrOfFiles; i++) {
				 var ul = document.createElement("ul");
				 ul.innerHTML = fmArray[i].fileName+fmArray[i].fileType + ' &emsp;  Filenumber ' + (i+1) + '/' + nrOfFiles;
				 doc.append(ul);
			}
			$("#openInFolder").hide();

		} else{
			offerShare();
		}
	} else{
		handleSignal(data);
	}
}


//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
//Close channels and cleanup
function closeDataChannels(e) {
	if(activedc != null && activedc !== undefined && activedc.readyState === 'open' && e!=null){
		doSend(e);
		console.log('Closing data channel');
		activedc.close();
	}
	$('#connectedScreen').modal('hide');
	$('#endScreen').modal('show');


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
	document.querySelector('#transferDetails').innerHTML = 'Filename: ' + fmArray[curFileNum].fileName+ '. Filetype: ' + fmArray[curFileNum].fileType  + '. Filenumber: ' + (curFileNum+1) + '/' + nrOfFiles + '. Percent: ' + (perc*100).toFixed(2) + '/100';
}
//Create the Authentication message to send
function createAuthMsg(type){
	var msg;
	console.log("Creating message of type ", type);
	//Sending authentication setup/ setup reply
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
		case protocol.REQUEST_META:
			console.log("Requesting file data!");
			offerShare();
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
			closeDataChannels(null);
			break;
		
		//Route all authentication-signals to processAuth
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
	document.querySelector('#transferDetailsEnd').innerHTML = 'Filename: ' + fmArray[curFileNum].fileName + '. Filetype: ' + fmArray[curFileNum].fileType +  '. Filenumber: ' + (curFileNum+1) + '/' + nrOfFiles + '. Percent: 100/100';
	var storePath = path.join(dlPath, fmArray[curFileNum].fileName+(fmArray[curFileNum].fileType));
  	ensureDirectoryExistence(storePath);
  	var data = fmArray[curFileNum].downloadFile();
  	fs.writeFile(storePath, data, function(err) {
	    if(err) {
	        console.log(err);
	    } else {
	        alert("The file was saved: " + storePath);
	    }
    })
	curFileNum++;
	
	if(curFileNum == nrOfFiles){
  		var div = document.querySelector("#download");
		div.innerHTML = "Files received: <br>"
		
		for (var i = 0; i < nrOfFiles; i++) {
			 var ul = document.createElement("ul");
			 ul.innerHTML = fmArray[i].fileName+fmArray[i].fileType + ' &emsp;  Filenumber ' + (i+1) + '/' + nrOfFiles;
			 div.append(ul);
		}

  		$('#openInFolder').show();
		closeDataChannels({action: protocol.DONE});
	}
}
//Registers the different events
function registerFileEvents(fm) {
	fm.onrequestready = chunkRequestReady;
	fm.onprogress = displayProgress;
	fm.ontransfercomplete = transferComplete;
}
//ensureDirectoryExistence MOVED TO readFile!
