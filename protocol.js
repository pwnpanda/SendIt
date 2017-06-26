var protocol = {
  OFFER: "offer",
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
var curFileName = '';

//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
//Send the data
//Initiate, set up and start transfer
//Use chunknr to identify progress! TODO
function startSending() {
  if(nrOfFiles == 0){
    console.log("Error! No files to send");
    return;
  }

  fileArray = new Array(nrOfFiles);
  //For now only 1 file - TODO
 // for(var i=0, f;f=files[i];i++){
  var f = files[0];
  //Use filemanager to stage all the local files and keep them organized TODO
  if(f){
    console.log('File being sent ' + [f.name, f.size, f.type,
    f.lastModifiedDate].join(' '));
    //Need array of filemanagers, one for each file!
    //ONly handles 1 file UPDATE
    fileArray[0] = new FileManager(maxChunkSize);

    var mbSize = f.size / (1024 * 1024);
    if (mbSize > MAX_FSIZE) {
      console.log("Due to browser memory limitations, files greater than " + MAX_FSIZE + " MiB are unsupported. Your file is " + mbSize.toFixed(2) + " MiB.");
      //TODO - add error-message in browser
      return;
      //continue;
    }

    var reader = new FileReader();
    reader.onloadend = function (e) {
      if (reader.readyState == FileReader.DONE) {
        //ONly handles 1 file UPDATE
        fileArray[0].stageLocalFile(f.name, f.type, reader.result);
        offerShare();
      }
    };
   
    reader.readAsArrayBuffer(f);
  } else{
    console.log("File error! No file or no size!!!");
    closeDataChannels();
    return; 
  }
  //}
}

//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
//Receive the data
//Handle different types of messages here!
function onReceiveMessageCallback(event) {
  console.log(event);
  var data = event.data;
  console.log("Recieved data: ", data);
  if(data.action == protocol.DATA){
    recvFM.receiveChunk(data);
  }
  else if(data.action == protocol.REQUEST){
    //Only handling one file for now - TODO
    nChunksSent += data.ids.length;
    displayProgress(data.nReceived / fileArray[0].fileChunks.length);
    data.ids.forEach(function (id) {
      doSend(packageChunk(id));
    });
  }
  else if(data.action == protocol.DONE){
    //File recieved by partner
    console.log("File recieved by partner!");
    closeDataChannels();
  } else{
    handleSignal(data);
  }
}


//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
//Close channels and cleanup
function closeDataChannels() {
  $('#connectedScreen').modal('hide');
  $('#endScreen').modal('show');


  console.log('Closing data channels');
  sendChannel.close();
  console.log('Closed data channel: send');

  p1.close();
  p2.close();
  p1 = null;
  p2 = null;
  console.log('Closed peer connections');
  //TODO remove files!
}

//Show progress
function displayProgress(perc){
  document.querySelector('#transferDetails').innerHTML = 'File ' + curFileName /* tmp removed TODO+ '. Number ' + file.number + '/' + fileTotal */+ '. Percent: ' + perc + '/100';
}
//Everything below taken from
//https://github.com/tskimmett/rtc-pubnub-fileshare/blob/master/connection.js
//Create offer to share file and send
//TODO - Gets here, then stops because receiving node does not connect!!! WHY?!
function offerShare(){
  console.log("Offering share...");
  //ONLY SUPPORTS ONE FILE - UPDATE
  var fm = fileArray[0];
  var msg = JSON.stringify({
    fName: fm.fileName,
    fType: fm.fileType,
    nChunks: fm.fileChunks.length,
    action: protocol.OFFER
  });

  doSend(test);
}
//Create answer to accept sharing offer
function answerShare(){
  console.log("Answering share...");
  var msg ={action: protocol.ANSWER};
  doSend(msg);

  recvFM.requestChunks();
}
//Send data
function doSend(msg){
  console.log("Sending data...");
  activedc.send(msg);
}
//Package data-chunks
function packageChunk(chunkId){
  return JSON.stringify({
    action: protocol.DATA,
    id: chunkId,
    //ONLY SUPPORTS ONE FILE - UPDATE
    content: Base64Binary.encode(fileArray[0].fileChunks[chunkId])
  });
}
//Handles received signal
function handleSignal(msg) {
  console.log(msg);
  if (msg.action === protocol.ANSWER) {
    console.log("THE OTHER PERSON IS READY");
  }
  else if (msg.action === protocol.OFFER) {
    $('#waitForConnection').modal('hide');
    $('#connectedScreen').modal('show');
    // Someone is ready to send file data. Set up receiving structure
    recvFM = new FileManager(maxChunkSize);
    recvFM.stageRemoteFile(msg.fName, msg.fType, msg.nChunks);
    recvFM.answerShare();
  }
  else if (msg.action === protocol.ERR_REJECT) {
    alert("Unable to communicate! Stopping transfer!");
    closeDataChannels();
  }
  else if (msg.action === protocol.CANCEL) {
    alert("Partner cancelled the share. Stopping transfer!");
    closeDataChannels();
  }
}
//Called when receiving chunks!
//ERROR HERE - TODO
function chunkRequestReady(){return function (chunks, fm) {
    console.trace('Error from somewhere!')
    console.log("Chunks ready: ", chunks.length);
    var req = JSON.stringify({
      action: protocol.REQUEST,
      ids: chunks,
      nReceived: fm.nChunksReceived
    });
    console.log('Resend: ', req);
    doSend(req);
  };
}
//Called when receiving last chunk
function transferComplete(){return function () {
    console.log("Last chunk received.");
    doSend({ action: protocol.DONE });
    recvFM.downloadFile();
    closeDataChannels();
  };
}
//Registers the different events
function registerFileEvents(fm) {
      fm.onrequestready = chunkRequestReady;
      fm.onprogress = displayProgress;
      fm.ontransfercomplete = transferComplete;
}