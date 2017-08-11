/* 
  Taken from:
	https://github.com/cjb/serverless-webrtc
	Bugfixes and small alterations made!
  See also:
	http://www.html5rocks.com/en/tutorials/webrtc/basics/
	https://code.google.com/p/webrtc-samples/source/browse/trunk/apprtc/index.html
	https://webrtc-demos.appspot.com/html/pc1.html
*/

var cfg = {'iceServers': [{'url': 'stun:stun.gmx.net'}]},
  con = { 'optional': [{'DtlsSrtpKeyAgreement': true}] }

// Since the same JS file contains code for both sides of the connection,
// activedc tracks which of the two possible datachannel variables we're using.
var activedc
//Declares necessary information about the connection
var sdpConstraints = {
  optional: [],
  mandatory: {
	OfferToReceiveAudio: false,
	OfferToReceiveVideo: false
  }
}
//Comment out for production code! Removes error output
//console.log = console.debug = console.info = function(){};
// MY ADDITION---------------
var fileReady = false;
var iceReady = false;
var mailReady = false;
var km;
$('#offerSentBtn').prop('disabled', true);
$('#answerSentBtn').prop('disabled', true);
//-------------------------------

$('#showLocalOffer').modal('hide')
$('#getRemoteAnswer').modal('hide')
$('#waitForConnection').modal('hide')
$('#createOrJoin').modal('show')
//MY ADDITION-------------------------
$('#connectedScreen').modal('hide')
$('#endScreen').modal('hide')

//Makes sure the user inputs a receiver before proceeding
$("#recMail").keyup( function() {
 	if( $(this).val() != '') {
		mailReady=true;
 	}else{
		mailReady=false;
 	}
 	isReady();
});

//MY ADDITION END----------------------------

/* THIS IS ALICE, THE CALLER/SENDER */

var pc1 = new RTCPeerConnection(cfg, con),
  dc1 = null


$('#createBtn').click(function () {
  //Read in email and initiate new KeyManager if neccesary
  if($("#txtMyMail").is(":visible")){
	var myMail = $('#myMail').val();
	console.info("Mail address read: " + myMail);
	km = new KeyManager("new", myMail);
  }else{
	//Read file and create KeyManager-object
	readCrypto();
  }
  //--------------------------
  $('#showLocalOffer').modal('show')
  createLocalOffer()
})

$('#joinBtn').click(function () {
 	//Read in email and initiate new KeyManager if neccesary
 	if($("#txtMyMail").is(":visible")){
		var myMail = $('#myMail').val();
		console.info("Mail address read: " + myMail);
		km = new KeyManager("new", myMail);
	}else{
		//Read file and create KeyManager-object
		readCrypto();
	}
	//--------------------------
	$('#getRemoteOffer').modal('show')
})

$('#offerSentBtn').click(function () {
  //Read receiver's E-mail address & Store
  var otherMail = $("#recMail").val();
  console.info("Receiver's mail: " + otherMail);
  km.otherEnd = otherMail;
  $('#getRemoteAnswer').modal('show')
})

$('#offerRecdBtn').click(function () {
  var offer = $('#remoteOffer').val()
  var offerDesc = new RTCSessionDescription(JSON.parse(offer))
  console.info('Received remote offer', offerDesc)
  handleOfferFromPC1(offerDesc)
  $('#showLocalAnswer').modal('show')
})

$('#answerSentBtn').click(function () {
  $('#waitForConnection').modal('show')
})

$('#answerRecdBtn').click(function () {
  var answer = $('#remoteAnswer').val()
  var answerDesc = new RTCSessionDescription(JSON.parse(answer))
  handleAnswerFromPC2(answerDesc)
  $('#waitForConnection').modal('show')
})

function setupDC1 () {
  try {
	dc1 = pc1.createDataChannel('test', {reliable: true})
	activedc = dc1
	console.log('Created datachannel (pc1)')
	dc1.onopen = function (e) {
	  console.info('data channel connect')
	  $('#waitForConnection').modal('hide')
	  $('#waitForConnection').remove()
	  $('#connectedScreen').modal('show')
	}
	dc1.onmessage = function (e) {
	  console.log('Got message (pc1)');
	  onReceiveMessageCallback(e);
	}
  } catch (e) { console.warn('No data channel (pc1)', e); }
}

function createLocalOffer () {
  setupDC1()
  pc1.createOffer(function (desc) {
	pc1.setLocalDescription(desc, function () {}, function () {})
	console.info('created local offer', desc)
  },
  function () { console.warn("Couldn't create offer") },
	sdpConstraints)
}

pc1.onicecandidate = function (e) {
  console.info('ICE candidate (pc1)', e)
  if (e.candidate == null) {
	iceReady = true;
	isReady();
	$('#localOffer').html(JSON.stringify(pc1.localDescription))
  }
}

function handleOnconnection () {
  console.log('Datachannel connected')
  $('#waitForConnection').modal('hide')
  // If we didn't call remove() here, there would be a race on pc2:
  //   - first onconnection() hides the dialog, then someone clicks
  //     on answerSentBtn which shows it, and it stays shown forever.
  $('#waitForConnection').remove()
  $('#showLocalAnswer').modal('hide')
  $('#connectedScreen').modal('show')

}

pc1.onconnection = handleOnconnection

function onsignalingstatechange (state) {
  console.info('signaling state change:', state)
}

function oniceconnectionstatechange (state) {
  console.info('ice connection state change:', state)
}

function onicegatheringstatechange (state) {
  console.info('ice gathering state change:', state)
}

pc1.onsignalingstatechange = onsignalingstatechange
pc1.oniceconnectionstatechange = oniceconnectionstatechange
pc1.onicegatheringstatechange = onicegatheringstatechange

function handleAnswerFromPC2 (answerDesc) {
  console.info('Received remote answer: ', answerDesc)
  pc1.setRemoteDescription(answerDesc)
}

/* THIS IS BOB, THE ANSWERER/RECEIVER */

var pc2 = new RTCPeerConnection(cfg, con),
  dc2 = null

pc2.ondatachannel = function (e) {
  var datachannel = e.channel || e; // Chrome sends event, FF sends raw channel
  console.info('Received datachannel (pc2)', arguments)
  $('#waitForConnection').modal('hide')
  $('#waitForConnection').remove()
  $('#connectedScreen').modal('show')
  $('#init').attr("hidden", true);
  dc2 = datachannel
  activedc = dc2
  dc2.onopen = function (e) {
	console.info('data channel connect')
  }
  dc2.onmessage = function (e) {
	console.log('Got message (pc2)');
	onReceiveMessageCallback(e);
  }
}

function handleOfferFromPC1 (offerDesc) {
  pc2.setRemoteDescription(offerDesc)
  pc2.createAnswer(function (answerDesc) {
	console.info('Created local answer: ', answerDesc)
	pc2.setLocalDescription(answerDesc)
  },
  function () { console.warn("Couldn't create offer") },
  sdpConstraints)
}

pc2.onicecandidate = function (e) {
  console.log('ICE candidate (pc2)', e)
  if (e.candidate == null) {
	$('#answerSentBtn').prop('disabled', false);
	$('#localAnswer').html(JSON.stringify(pc2.localDescription))
  }
}

pc2.onsignalingstatechange = onsignalingstatechange
pc2.oniceconnectionstatechange = oniceconnectionstatechange
pc2.onicegatheringstatechange = onicegatheringstatechange

pc2.onconnection = handleOnconnection

//Source: https://gist.github.com/jeromeetienne/2651899
/**
 * A console.assert which actually stop the exectution.
 * default console.assert() is a plain display, such as console.log() or console.error();
 * It doesnt stop the execution like assert() is meant to do. This is a little code to 
 * "workaround this limitation" :) thanks @jensarp
 *
 * Usage:
 * console.assert(foo === bar); // Will throw if not equal
 * console.assert(foo === bar, 'Dude, foo does not equal bar'); // Will throw with custom error message
 *
 * To trigger js debugger on failed assert, do 
 * console.assert.useDebugger = true;
*/
console.assert  = function(cond, text){
  if( cond )  return;
  if( console.assert.useDebugger )  debugger;
  //My addition
  closeDataChannels();
  //--------------
  throw new Error(text || "Assertion failed!");
};

//My own!------------------------------------
function isReady(){
  if (fileReady && iceReady && mailReady) {
	$('#offerSentBtn').prop('disabled', false);
  }else{
	$('#offerSentBtn').prop('disabled', true);
  }
}

function initiateSnd(){
  console.log('Initiating!');
  var button = $("#init").hide();
  beginAuth();
}
//---------------------------------------------