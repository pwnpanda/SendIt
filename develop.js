//https://github.com/cjb/serverless-webrtc - INFO

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
var nrOfFiles = 0;
var files='';
var recvFM='';
var fileArray='';

//Chunksize
//Set to 1200 bytes, according to:
//https://cs.chromium.org/chromium/src/third_party/libjingle/source/talk/media/sctp/sctpdataengine.cc?l=52
//https://bloggeek.me/send-file-webrtc-data-api/
var maxChunkSize = 1200;

//According to https://github.com/tskimmett/rtc-pubnub-fileshare/blob/master/connection.js
var MAX_FSIZE = 160;    // MiB -- browser will crash when trying to bring more than that into memory.

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
  console.log('Send channel state is: ' + readyState);
  if (readyState === 'open') {
    startSending();
  }
}

//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
function onReceiveChannelStateChange() {
  var readyState = receiveChannel.readyState;
  console.log('Receive channel state is: ' + readyState);
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
  console.log('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.binaryType = 'arraybuffer';
  receiveChannel.onmessage = onReceiveMessageCallback;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;

  receivedSize = 0;
  bitrateMax = 0;
}