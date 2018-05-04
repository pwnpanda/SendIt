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
var activedc;
var p;
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
      myMail=sanatize(r);
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
  //Read in own email and recipients email
  //Initiate km if not existing
  km.otherEnd=sanatize($("#recMailInput").val());

  stageFiles();
  wsInitFiles();
  reset();
  $('#showHome').modal('hide');
  $('#myStat').html('Waiting for Receiver to answer...');
  $('#waitForConnection').modal('show');
  /*
  If OK, send connection-req to server. Await other end confirmation.
  */
  
})

//Accept a transfer
$('#accRecvBtn').click(function () {
  /*
  Handle accepting a transfer!
  Send acceptance-message to server
  Show connection-waiting screen
  */
  reset();
  $('#showHome').modal('hide');
  $('#waitForConnection').modal('show');
  //Start webRTC
  createLocalOffer();
})

//Decline a transfer
$('#declRecvBtn').click(function () {
  /*
  Handle declining an offer!
  Send declining-message to server
  Show base page
  */
  send(wss_prot.REFUSE, null, km.otherEnd);
  reset();
})

//Stop transfer!
$('#cancel').click(function () {
  closeDataChannels({action: protocol.CANCEL});
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
	  console.info('created local offer', desc);
     //Update info!
    $('#myStat').html('Waiting for Sender...');
    var pubkey = km.findKey(km.otherEnd);
    //Encrypt!
    var d=encrypt(pubkey, desc);
    //Send Accept connection message
    send(wss_prot.ACCEPT, d, km.otherEnd);

  },
  function () { console.warn("Couldn't create offer") },
	sdpConstraints)
  p=pc1;
}

//CHANGE HANDLING TO EACH CANDIDATE (TRICKLING)
pc1.onicecandidate = function (e) {
  console.info('ICE candidate (pc1)', e)
  if(e.candidate){
    var pubkey = km.findKey(km.otherEnd);
    //ENCRYPT!
    var d = encrypt(pubkey, e.candidate);
    //Send ICE trickling
    //wat TODO
    send(wss_prot.ICE, d, km.otherEnd);
  }else{
    console.log('Finished gathering ICE candidates!');
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
  var ans = new RTCSessionDescription(answerDesc);
  console.log(ans);
  console.info('Received remote answer: ', ans)
  pc1.setRemoteDescription(ans)
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
  var off = new RTCSessionDescription(JSON.parse(offerDesc));
  pc2.setRemoteDescription(off)
  pc2.createAnswer(function (answerDesc) {
	  console.info('Created local answer: ', answerDesc)
	  pc2.setLocalDescription(answerDesc)
    //Update info!
    $('#myStat').html('Waiting for receiver to connect...');
    var pubkey = km.findKey(km.otherEnd);
    //Encrypt!
    var d=encrypt(pubkey, answerDesc);
    //Send Accept connection message
    send(wss_prot.ANSWER, JSON.parse(d), km.otherEnd);
  },
  function () { console.warn("Couldn't create offer") },
  sdpConstraints)
  p=pc2;
}

pc2.onicecandidate = function (e) {
  console.log('ICE candidate (pc2)', e)
  if(e.candidate){
    var pubkey = km.findKey(km.otherEnd);
    //ENCRYPT!
    var d = encrypt(pubkey, e.candidate);
    //Send ICE trickling
    //wat TODO parse??
    send(wss_prot.ICE, JSON.parse(d), km.otherEnd);
  }else{
    console.log('Finished gathering ICE candidates!');
  }
}

pc2.onsignalingstatechange = onsignalingstatechange
pc2.oniceconnectionstatechange = oniceconnectionstatechange
pc2.onicegatheringstatechange = onicegatheringstatechange

pc2.onconnection = handleOnconnection

function addIce(ice){
  p.addIceCandidate(new RTCIceCandidate(JSON.parse(ice)));
}
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
  return;
}

function setDescr(data, off){
  return;
}
function initTransfer(){
  //Request offerShare from other end!
  //Automatic or request based?
  console.log("Request file meta-data!");
  var msg = {
    action: protocol.REQUEST_META
  };
  doSend(msg);
}

function sanatize(str){
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));  
  console.log("Escaped: ", div.innerHTML);
  return div.innerHTML;
}
//---------------------------------------------