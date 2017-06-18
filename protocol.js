var protocol = {
  OFFER: "offer",
  REQUEST: "req-chunk",
  DATA: "data",
  DONE: "done",
  ERR_REJECT: "err-reject",
  CANCEL: "cancel"
};

nChunksSent = 0;

//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
//Send the data
//Initiate, set up and start transfer
//Use chunknr to identify progress! TODO
function startSending() {
  if(nrOfFiles == 0){
    console.log("Error! No files to send")
    return;
  }

  fileArray = new Array(nrOfFiles);
  //For now only 1 file - TODO
 // for(var i=0, f;f=files[i];i++){
  var f = files[0];
  //Use filemanager to stage all the local files and keep them organized TODO
  if(f){
    console.log('File being sent ' + [f.name, f.size, f.type,
    file.lastModifiedDate].join(' '));
    //Need array of filemanagers, one for each file!
    fileArray[i] = new FileManager(maxChunkSize);

    var mbSize = f.size / (1024 * 1024);
    if (mbSize > MAX_FSIZE) {
      console.log("Due to browser memory limitations, files greater than " + MAX_FSIZE + " MiB are unsupported. Your file is " + mbSize.toFixed(2) + " MiB.");
      //TODO - add error-message in browser
      continue;
    }

    var reader = new FileReader();
    reader.onloadend = function (e) {
      if (reader.readyState == FileReader.DONE) {
        fileArray[i].stageLocalFile(f.name, f.type, reader.result);
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
//Handle different types of messages here! TODO
function onReceiveMessageCallback(data) {
  console.log("Recieved data: ", data);
  if(data.action == protocol.DATA){
    recvFM.receiveChunk(data);
    displayProgress(recvFM);
  }
  else if(data.action == protocol.REQUEST){
    //Only handling one file for now - TODO
    nChunksSent += data.ids.length;
    updateProgress(data.nReceived / fileArray[0].fileChunks.length);
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
  console.log('Closing data channels');
  sendChannel.close();
  console.log('Closed data channel: send');
  if (receiveChannel) {
    receiveChannel.close();
    console.log('Closed data channel: receive');
  }
  localConnection.close();
  remoteConnection.close();
  localConnection = null;
  remoteConnection = null;
  console.log('Closed peer connections');
  //TODO remove files!
}

function displayProgress(file){
  document.querySelector('#transferDetails').innerHTML = 'File ' + file.name + '. Number ' + file.number + '/' + fileTotal + '. Slice ' + file.slice + '/' + totalSlices+ '.';
}

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
  doSend(msg);
}

function answerShare(){
  console.log("Answering share...");
  var msg =JSON.stringify({action: protocol.ANSWER});
  doSend(msg);

  recvFM.requestChunks();
}

function doSend(msg){
  console.log("Sending data...");
  sendChannel.send(msg);
}

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
  if (msg.action === protocol.ANSWER) {
    console.log("THE OTHER PERSON IS READY");
  }
  else if (msg.action === protocol.OFFER) {
    // Someone is ready to send file data. Let user opt-in to receive file data
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
function chunkRequestReady = function (chunks) {
  console.log("Chunks ready: ", chunks.length);
  var req = JSON.stringify({
    action: protocol.REQUEST,
    ids: chunks,
    nReceived: recvFM.nChunksReceived
  });
  doSend(req);
}
//Called when receiving last chunk
function transferComplete = function () {
    console.log("Last chunk received.");
    doSend(JSON.stringify({ action: protocol.DONE }));
    recvFM.downloadFile();
    closeDataChannels();
  };
}
//Registers the different events
function registerFileEvents(fm) {
      fm.onrequestready = chunkRequestReady;
      fm.onprogress = updateProgress;
      fm.ontransfercomplete = transferComplete;
}