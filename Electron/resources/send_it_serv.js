/* 
  Taken from:
	https://github.com/cjb/serverless-webrtc
	Bugfixes and small alterations made!
  See also:
	http://www.html5rocks.com/en/tutorials/webrtc/basics/
	https://code.google.com/p/webrtc-samples/source/browse/trunk/apprtc/index.html
	https://webrtc-demos.appspot.com/html/pc1.html
*/
const {shell} = require('electron');
const prompt = require('electron-prompt');


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
var dlPath;
var ulPath;
var cfPath;
var cfName;
var km;
var recMail;
var meReady=false;
var recReady=false;
var sc; //ServerConnection
var descr;
var off;
function reset (){
  //MY ADDITION-------------------------
  $('#home').addClass("Active");
  $('#createBtn').removeClass("Active");
  $('#config').removeClass("Active");
  //-----------------------------------
  $('#connectedScreen').modal('hide')
  $('#endScreen').modal('hide')
  $("#showConfig").modal('hide');
  $('#showSend').modal('hide')
  $('#showReceive').modal('hide')
  $('#waitForConnection').modal('hide')

  $('#createOrJoin').modal('show')
  $('#showHome').modal('show')

}
$( function(){
  reset();
  readConfig();
  getMail();
});

//Makes sure the user inputs a receiver before proceeding
$("#recMailInput").keyup( function() {
  if( $(this).val() != '') {
    recReady=true;
  }else{
    recReady=false;
  }
  isReady();
});

//Makes sure the user inputs his email before proceeding
$("#myMailInput").keyup( function() {
  if( $(this).val() != '') {
    meReady=true;
  }else{
    meReady=false;
  }
  isReady();
});

function isReady(){
  if (recReady && meReady) {
    $('#initSendBtn').prop('disabled', false);
  }else{
    $('#initSendBtn').prop('disabled', true);
  }
}

function getMail(){
   //Get email address and create KM
  prompt({
    title: 'E-mail',
    label: 'Please register your email address',
    value: myMail,
    inputAttrs: { // attrs to be set if using 'input'
        type: 'mail'
    },
    type: 'input'
  })
  .then((r)=>{
    if(r==null){
      window.location.href = "";
    } else{
      console.info("Mail address read: " + r);
      myMail=r;
      cfName=myMail+'.crp';
      $("#myMailInput").val(myMail);
      if($("#myMailInput").val() != ''){
        meReady = true;
      }
      //Read mail.
      if (! existCrypto()){
        km = new KeyManager("new", myMail);
      }
      
      //Connect to server
      wscon();
    }
  });
}
//MY ADDITION END----------------------------

/* THIS IS ALICE, THE CALLER/SENDER */

var pc1 = new RTCPeerConnection(cfg, con),
  dc1 = null

//Show correct items for the config-panel
$('#config').click(function () {
  reset();
  $('#home').removeClass("Active");
  $('#config').toggleClass("Active");
  settings();
  $('#showHome').modal('hide');
  $("#showConfig").modal('show');
});

$('#createBtn').click(function () {
  if(sc.readyState === WebSocket.OPEN) {
    reset();
    $('#showHome').modal('hide');
    $('#home').removeClass("Active");
    $('#createBtn').toggleClass("Active");
    $('#showSend').modal('show');
    //Read in email and initiate new KeyManager if neccesary
    isReady();
    loadFiles();
  //Socket closed = reload and try again!
  }else{
    window.location.href = "";
  }
})

//Initiate sending files
$('#initSendBtn').click(function () {
  //TODO
  //Read in own email and recipients email
  //Initiate km if not existing
  km.otherEnd=$("#recMailInput").val();
  stageFiles();
  wsInit();
  //TODO
  /*
  If OK, send connection-req to server. Await other end confirmation.
  */
  
})

//Accept a transfer
$('#accRecvBtn').click(function () {
  //TODO
  /*
  Handle accepting a transfer!
  Send acceptance-message to server
  Show connection-waiting screen
  */
})

//Decline a transfer
$('#declRecvBtn').click(function () {
  //TODO
  /*
  Handle declining an offer!
  Send declining-message to server
  Show base page
  */
  reset();
})

//Stop transfer!
$('#cancel').click(function () {
  closeDataChannels();
  reset();
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
    beginAuth();
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
  //TODO
  //ENCRYPT!!
}

//TODO CHANGE HANDLING TO EACH CANDIDATE (TRICKLING)
pc1.onicecandidate = function (e) {
  console.info('ICE candidate (pc1)', e)
  if (e.candidate == null) {
    descr = JSON.stringify(pc1.localDescription);
    km.encrypt = descr;
    //ENCRYPT!
    encrypt();
  }
}

function handleOnconnection () {
  console.log('Datachannel connected')
  $('#waitForConnection').modal('hide')
  // If we didn't call remove() here, there would be a race on pc2:
  //   - first onconnection() hides the dialog, then someone clicks
  //     on answerSentBtn which shows it, and it stays shown forever.
  $('#waitForConnection').remove()
  $('#showReceive').modal('hide')
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
  //TODO
  //ENCRYPT!
}

pc2.onicecandidate = function (e) {
  console.log('ICE candidate (pc2)', e)
  //CHANGE HANDLING TO EACH CANDIDATE! (Trickling) TODO
  if (e.candidate == null) {
    descr = JSON.stringify(pc2.localDescription);
    //Encrypt
    encryptReply();
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
$('#openInFolder').click(function () {
  try{
    shell.showItemInFolder(dlPath + splitter+'*');
  }catch(err){
      console.log(err);
    }
});

function showenc(data){
  //send offer/answer to server
}

function setDescr(data, off){
  var desc = new RTCSessionDescription(data);
  console.info('Received remote offer/answer', desc);
  //setLocalDescription(desc)?
  //Handle offer/answer and relay back
}
//---------------------------------------------
