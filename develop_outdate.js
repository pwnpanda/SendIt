//https://github.com/cjb/serverless-webrtc - INFO

var cfg = {'iceServers': [{'url': 'stun:23.21.150.121'}]},
  con = { 'optional': [{'DtlsSrtpKeyAgreement': true}] }

var sdp = {
  optional: [],
  mandatory: {
    OfferToReceiveAudio: false,
    OfferToReceiveVideo: false
  }
}

// Since the same JS file contains code for both sides of the connection,
var p1 = new RTCPeerConnection(cfg, con);
var p2 = new RTCPeerConnection(cfg, con);
var sendChannel, receiveChannel = null;
var active;
var p1icedone = false;
var nrOfFiles = 0;
var files='';
var recvFM='';
var fileArray='';
var ice;

//Chunksize
//Set to 1200 bytes, according to:
//https://cs.chromium.org/chromium/src/third_party/libjingle/source/talk/media/sctp/sctpdataengine.cc?l=52
//https://bloggeek.me/send-file-webrtc-data-api/
var maxChunkSize = 1200;

//According to https://github.com/tskimmett/rtc-pubnub-fileshare/blob/master/connection.js
var MAX_FSIZE = 160;    // MiB -- browser will crash when trying to bring more than that into memory.

var dataOpt = {
	ordered: true, //Orderd transfer of packets
	reliable: true //reliable transfer
}

//BUTTONS
$('#showLocalOffer').modal('hide')
$('#getRemoteAnswer').modal('hide')
$('#waitForConnection').modal('hide')
$('#createOrJoin').modal('show')


//S1->S2 / R2->Trans - Offer sent button -  action
//TODO - Skip this and make it automatic after creation of file
$('#offerSentBtn').click(function () {
  $('#getRemoteAnswer').modal('show')
})

//S2->Trans / R1->R2
$('#answerSentBtn').click(function () {
  $('#waitForConnection').modal('show')
})

//-----------------------------ALICE--------------------
//P1->S1 - If createbutton is pressed, create offer and show
$('#createBtn').click(function () {
  $('#showLocalOffer').modal('show')
  createLocalOffer()
  //NOTE - Progress by HTML button press
})

//Trans - Show transport info
$('#answerRecdBtn').click(function () {
  var answer = $('#remoteAnswer').val();
  answer = JSON.parse(answer);
  var answerDesc = new RTCSessionDescription(answer);
  handleAnswerFromRemoteCon(answerDesc);
  //handleCandidateFromPC2(answer.ICE);
  $('#waitForConnection').modal('show');
})


//https://github.com/cjb/serverless-webrtc - INFO
//Sets up a datachannel
function setupDC () {
  try {
    sendChannel = p1.createDataChannel('test', /*dataOpt*/{reliable: true});
    active = sendChannel;
    //sendChannel.binaryType = 'arraybuffer';
    console.log('Created datachannel (p1)')
    //sendChannel.onopen = onSendChannelStateChange;
    //sendChannel.onmessage = onReceiveMessageCallback;
    sendChannel.onopen = function(e){
      console.log('data channel 1 connect');
      setActive(active);
      doSend(JSON.stringify({message: 'Testing'}));
      //sendChannel.send({data: 'hello'});
    }
    sendChannel.onmessage = function(e){
      console.log('Got message (p1)', e.data);
      //MOAR
    }
    //sendChannel.onclose = onSendChannelStateChange;
  } catch (e) { console.warn('No data channel (p1)', e); }
}


//https://github.com/cjb/serverless-webrtc - INFO
//Creates a connection promise
function createLocalOffer () {
  setupDC();
  p1.createOffer(function (desc) {
    p1.setLocalDescription(desc, function () {}, function () {})
    console.log('created local offer', desc)
  },
  function () { console.warn("Couldn't create offer") },
  sdp)
}

//https://github.com/cjb/serverless-webrtc - INFO
//Adds connection-info from p2
function handleAnswerFromRemoteCon (answerDesc) {
  console.log('Received remote answer: ', answerDesc)
  p1.setRemoteDescription(answerDesc);
}

//https://github.com/cjb/serverless-webrtc - INFO
//What happens when ICE-candidate is found
p1.onicecandidate = function (e) {
  console.log('ICE candidate (p1)', e)
  if (e.candidate == null) {
    //Pastes the offer in the correct box
    //var complString = JSON.stringify({offer: p1.localDescription, ICE: ice});
    var complString = JSON.stringify(p1.localDescription);
    $('#localOffer').html(complString);
  }else{
    ice = e.candidate;
  }
}

//LOGGING - CAN REMOVE

function handleOnconnection(){
  console.log('datachannel connected');
}
p1.onconnection = handleOnconnection

function onsignalingstatechange (state) {
  console.log('Signal STATE p1: ', p1.signalingState);
  console.log('Signal STATE p2: ', p2.signalingState);
  //console.info('signaling state change:', state)
}

function oniceconnectionstatechange (state) {
  console.log('Ice STATE p1: ', p1.connectionState);
  console.log('Ice STATE p2: ', p2.connectionState);
  //console.info('ice connection state change:', state)
}

function onicegatheringstatechange (state) {
  console.log('Gathering STATE p1: ', p1.iceGatheringState);
  console.log('Gathering STATE p2: ', p2.iceGatheringState);
  //console.info('ice gathering state change:', state)
}

p1.onsignalingstatechange = onsignalingstatechange
p1.oniceconnectionstatechange = oniceconnectionstatechange
p1.onicegatheringstatechange = onicegatheringstatechange

//WHERE IS IT CALLED FROM?
function handleCandidateFromPC2 (iceCandidate) {
  console.log('adding ice: ', iceCandidate);
  p1.addIceCandidate(new RTCIceCandidate(iceCandidate))
  .then(
    function(){
      console.log('ICE success');
    },
    function(err){
      console.log('ICE fail: ' + err.toString());
    }
  );
}
//--------------------------------------BOB-----------------------

//P1->R1 - If connect to sender-button is pressed, Paste offer.
$('#joinBtn').click(function () {
  $('#getRemoteOffer').modal('show')
})

//R1->R2 - Offer inserted and processed
$('#offerRecdBtn').click(function () {
  var offer = $('#remoteOffer').val();
  answer = JSON.parse(offer);
 // handleCandidateFromPC1(answer.ICE);
  var offerDesc = new RTCSessionDescription(answer);
  console.log('Received remote offer', offerDesc);
  handleOfferFromLocalCon(offerDesc);
  $('#showLocalAnswer').modal('show');
})


//https://github.com/cjb/serverless-webrtc - INFO
//Adds connection-info from p1
function handleOfferFromLocalCon (offerDesc) {
  p2.setRemoteDescription(offerDesc);
  p2.createAnswer(function (answerDesc) {
    console.log('Created local answer: ', answerDesc)
    p2.setLocalDescription(answerDesc)
  },
  function () { console.warn("Couldn't create offer") },
  sdp)
}

//https://github.com/cjb/serverless-webrtc - INFO
//What happens when ICE-candidate is found
p2.onicecandidate = function (e) {
  console.log('ICE candidate (p2)', e);
  if (e.candidate == null) {
    //Pastes the offer in the correct box
    //var complString = JSON.stringify({offer: p2.localDescription, ICE: ice});
    var complString = JSON.stringify(p2.localDescription);
    $('#localAnswer').html(complString);
  } else{
    ice = e.candidate;
  }
}

// LOGGING

p2.onsignalingstatechange = onsignalingstatechange;
p2.oniceconnectionstatechange = oniceconnectionstatechange;
p2.onicegatheringstatechange = onicegatheringstatechange;

function handleCandidateFromPC1 (iceCandidate) {
  console.log('adding ice: ', iceCandidate);
  p2.addIceCandidate(new RTCIceCandidate(iceCandidate))
  .then(
    function(){
      console.log('ICE success');
    },
    function(err){
      console.log('ICE fail: ' + err.toString());
    }
  );
}

p2.onconnection = handleOnconnection;

p2.onDataChannel = function(e){
    console.log('data channel 2 connect');
    var datachannel = e.channel || e;
    active = datachannel;
    datachannel.onopen = function(e){
      console.log('datachannel connected');
      //datachannel.send({data: 'Hi back!'})
    }
    datachannel.onmessage = function(e){
      console.log('got message: ', e.data);
      console.log(e.data.message);
    }
}

//p2.ondatachannnel = receiveChannelCallback;
//------------------------END-------------------------------




//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
function onSendChannelStateChange() {
  var readyState = sendChannel.readyState;
  console.log('Send channel state is: ' + readyState);
  if (readyState === 'open') {
    $('#waitForConnection').modal('hide');
    $('#connectedScreen').modal('show');
    startSending();
  }
}

//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
function onReceiveChannelStateChange() {
  var readyState = receiveChannel.readyState;
  $('#waitForConnection').modal('hide');
  $('#connectedScreen').modal('show');
  console.log('Receive channel state is: ' + readyState);
}


//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
//p2.onDataChannel = 
function receiveChannelCallback(event) {
  console.log('Receive Channel Callback');
  console.log(event);
  /*p2.onopen= function(){
    console.log('data channel connect');
  }*/
  receiveChannel = event.channel;
  sendChannel = receiveChannel;
  receiveChannel.binaryType = 'arraybuffer';
  receiveChannel.onmessage = onReceiveMessageCallback;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;
}