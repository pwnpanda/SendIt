//https://github.com/cjb/serverless-webrtc - INFO

var sendPath = "~/tmp/Send/*"
var recvPath = "~/tmp/Receive/"

var cfg = {'iceServers': [{'url': 'stun:23.21.150.121'}]},
  con = { 'optional': [{'DtlsSrtpKeyAgreement': true}] }

/* THIS IS ALICE, THE CALLER/SENDER */

// Since the same JS file contains code for both sides of the connection,
// activedc tracks which of the two possible datachannel variables we're using.
var activedc
var localCon = new RTCPeerConnection(cfg, con)
var remoteCon = new RTCPeerConnection(cfg, con)
var sendChannel, receiveChannel = null
var localConicedone = false

var dataOpt = {
	ordered: true, //Orderd transfer of packets
	reliable: true, //reliable transfer
};
//And a query to grab the information.
/*
function handleFileInputChange() {
  var file = path;
  console.log('File(s) to send',file)
  if (!file) {
    trace('No file chosen');
  } else {
    createSenderConnection(file);
    //TODO -  Delete files in sendPath
  }
}
*/
//BUTTONS
$('#showLocalOffer').modal('hide')
$('#getRemoteAnswer').modal('hide')
$('#waitForConnection').modal('hide')
$('#createOrJoin').modal('show')


//P1->S1 - If createbutton is pressed, create offer and show
$('#createBtn').click(function () {
  $('#showLocalOffer').modal('show')
  createLocalOffer()
  //TODO - create file instead of showing it.
  //NOTE - Progress by HTML button press
})

//S1->S2 / R2->Trans - Offer sent button -  action
//TODO - Skip this and make it automatic after creation of file
$('#offerSentBtn').click(function () {
  $('#getRemoteAnswer').modal('show')
})

//S2->Trans / R1->R2
$('#answerSentBtn').click(function () {
  $('#waitForConnection').modal('show')
})

//P1->R1 - If connect to sender-button is pressed, Paste offer.
$('#joinBtn').click(function () {
  $('#getRemoteOffer').modal('show')
  //TODO - Take in filein stead of copy-pasting offer
  //NOTE - Progress by HTML button press
})

//R1->R2 - Offer inserted and processed
$('#offerRecdBtn').click(function () {
  var offer = $('#remoteOffer').val()
  var offerDesc = new RTCSessionDescription(JSON.parse(offer))
  console.log('Received remote offer', offerDesc)
  handleOfferFromLocalCon(offerDesc)
  $('#showLocalAnswer').modal('show')
})

//Trans - Show transport info
$('#answerRecdBtn').click(function () {
  var answer = $('#remoteAnswer').val()
  var answerDesc = new RTCSessionDescription(JSON.parse(answer))
  handleAnswerFromRemoteCon(answerDesc)
  $('#waitForConnection').modal('show')
})


//https://github.com/cjb/serverless-webrtc - INFO
//Sets up a datachannel
function setupDC () {
  try {
    sendChannel = localCon.createDataChannel('test', dataOpt)
    sendChannel.binaryType = 'arraybuffer';
    activedc = sendChannel
    console.log('Created datachannel (localCon)')
    sendChannel.onopen = onSendChannelStateChange;
    sendChannel.onclose = onSendChannelStateChange;

    remoteCon.onDataChannel = receiveChannelCallback;
  } catch (e) { console.warn('No data channel (localCon)', e); }
}
//https://github.com/cjb/serverless-webrtc - INFO
//Creates a connection promise
function createLocalOffer () {
	setupDC();
	localCon.createOffer(function (desc) {
	  localCon.setLocalDescription(desc, function () {}, function () {})
	  console.log('created local offer', desc)
	},
	function () { console.warn("Couldn't create offer") },
	null)
}

//https://github.com/cjb/serverless-webrtc - INFO
//Adds connection-info from localCon
function handleOfferFromLocalCon (offerDesc) {
  remoteCon.setRemoteDescription(offerDesc)
  remoteCon.createAnswer(function (answerDesc) {
    console.log('Created local answer: ', answerDesc)
    remoteCon.setLocalDescription(answerDesc)
  },
  function () { console.warn("Couldn't create offer") },
  null)
}

//https://github.com/cjb/serverless-webrtc - INFO
//Adds connection-info from remoteCon
function handleAnswerFromRemoteCon (answerDesc) {
  console.log('Received remote answer: ', answerDesc)
  localCon.setRemoteDescription(answerDesc)
}

//https://github.com/cjb/serverless-webrtc - INFO
//What happens when ICE-candidate is found
localCon.onicecandidate = function (e) {
  console.log('ICE candidate (localCon)', e)
  if (e.candidate == null) {
    //HTML SPECIFIC - WEBPAGE
    //Pastes the offer in the correct box
    $('#localOffer').html(JSON.stringify(localCon.localDescription))
  }
}

//https://github.com/cjb/serverless-webrtc - INFO
//What happens when ICE-candidate is found
remoteCon.onicecandidate = function (e) {
  console.log('ICE candidate (remoteCon)', e)
  if (e.candidate == null) {
    //HTML SPECIFIC - WEBPAGE
    //Pastes the offer in the correct box
    $('#localAnswer').html(JSON.stringify(remoteCon.localDescription))
  }
}

//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
function onSendChannelStateChange() {
  var readyState = sendChannel.readyState;
  trace('Send channel state is: ' + readyState);
  if (readyState === 'open') {
    sendData();
  }
}

//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
function onReceiveChannelStateChange() {
  var readyState = receiveChannel.readyState;
  trace('Receive channel state is: ' + readyState);
 //HTML shit I don't need? - REMOVE
  if (readyState === 'open') {
    timestampStart = (new Date()).getTime();
    timestampPrev = timestampStart;
    statsInterval = window.setInterval(displayStats, 500);
    window.setTimeout(displayStats, 100);
    window.setTimeout(displayStats, 300);
  }
}

//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
function receiveChannelCallback(event) {
  trace('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.binaryType = 'arraybuffer';
  receiveChannel.onmessage = onReceiveMessageCallback;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;

  receivedSize = 0;
  bitrateMax = 0;
  //HTML shit I don't need? - REMOVE
  downloadAnchor.textContent = '';
  downloadAnchor.removeAttribute('download');
  if (downloadAnchor.href) {
    URL.revokeObjectURL(downloadAnchor.href);
    downloadAnchor.removeAttribute('href');
  }
}

//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
//Send the data
function sendData() {
  var file = sendPath;
  trace('File is ' + [file.name, file.size, file.type,
      file.lastModifiedDate
  ].join(' '));

  // Handle 0 size files.
  statusMessage.textContent = '';
  downloadAnchor.textContent = '';
  if (file.size === 0) {
    statusMessage.textContent = 'No files to send - please put file in ~/tmp/send';
    closeDataChannels();
    return;
  }
  sendProgress.max = file.size;
  receiveProgress.max = file.size;
  //Set to 1200 bytes, according to:
  //https://cs.chromium.org/chromium/src/third_party/libjingle/source/talk/media/sctp/sctpdataengine.cc?l=52
  //https://bloggeek.me/send-file-webrtc-data-api/
  var chunkSize = 1200;
  var sliceFile = function(offset) {
    var reader = new window.FileReader();
    reader.onload = (function() {
      return function(e) {
      	//CHange to list with data and metadata!
      	//Sends slice
        sendChannel.send(e.target.result);
        //If there is more to send, 
        if (file.size > offset + e.target.result.byteLength) {
          window.setTimeout(sliceFile, 0, offset + chunkSize);
        }
        //Update sending progress
        sendProgress.value = offset + e.target.result.byteLength;
      };
    })(file);
    var slice = file.slice(offset, offset + chunkSize);
    reader.readAsArrayBuffer(slice);
  };
  sliceFile(0);
}
//TODO - re-do this whole section?
//Use chunknr to identify progress!
//https://stackoverflow.com/questions/14438187/javascript-filereader-parsing-long-file-in-chunks

//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
//Receive the data
function onReceiveMessageCallback(event) {
   trace('Received Message ' + event.data.byteLength);
  receiveBuffer.push(event.data);
  receivedSize += event.data.byteLength;

  receiveProgress.value = receivedSize;

  // we are assuming that our signaling protocol told
  // about the expected file size (and name, hash, etc).
  //NEED TO IMPLEMENT THIS - TODO
  var file = fileInput.files[0];
  if (receivedSize === file.size) {
    var received = new window.Blob(receiveBuffer);
    receiveBuffer = [];

    downloadAnchor.href = URL.createObjectURL(received);
    downloadAnchor.download = file.name;
    downloadAnchor.textContent =
      'Click to download \'' + file.name + '\' (' + file.size + ' bytes)';
    downloadAnchor.style.display = 'block';

    closeDataChannels();
  }
}


//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
//Close channels and cleanup
function closeDataChannels() {
  trace('Closing data channels');
  sendChannel.close();
  trace('Closed data channel with label: ' + sendChannel.label);
  if (receiveChannel) {
    receiveChannel.close();
    trace('Closed data channel with label: ' + receiveChannel.label);
  }
  localConnection.close();
  remoteConnection.close();
  localConnection = null;
  remoteConnection = null;
  trace('Closed peer connections');
  //TODO remove files!
}