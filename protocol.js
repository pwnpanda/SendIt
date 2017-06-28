var protocol = {
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
var files;
var nrOfFiles;
var fmArray;

//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
//Send the data
//Initiate, set up and start transfer
function startSending() {
  if(nrOfFiles == 0){
    console.error("Error! No files to send");
    throw new Error("No files to send!");
  }

  fmArray = new Array(nrOfFiles);
  for(var i=0, f;f=files[i];i++){
    console.log("Creates fms for sending!");
    //Use filemanager to stage all the local files and keep them organized
    if(f){
      console.info('File being staged ' + [f.name, f.size, f.type,
      f.lastModifiedDate].join(' '));
      //Need array of filemanagers, one for each file!
      fmArray[i] = new FileManager(maxChunkSize);
      registerFileEvents(fmArray[i]);

      var mbSize = Math.ceil(f.size / (1024 * 1024));
      //TODO - handle if one file is too big
      if (mbSize > MAX_FSIZE) {
        console.warn("Due to browser memory limitations, files greater than " + MAX_FSIZE + " MiB are unsupported. Your file is " + mbSize.toFixed(2) + " MiB.");
        //TODO - add error-message in browser
        var error = document.querySelector("#Error");
        error.innerHTML = "File " + f.name + " is to big for the browser! It cannot be sent!";
        throw new Error("File to big! Stop execution");
      }
    } else{
      console.error("File error! No file or no size!!!");
      closeDataChannels();
      throw new Error("File does not exist!");
    }
  }
  readFileInfo(0);
}
//Belongs to the above function - Heavily altered from original code
function readFileInfo(x){
  console.log("Cur " + x + " Tot " + nrOfFiles);
  if (x >= nrOfFiles) {
    offerShare();
    return;
  }
  var f = files[x];
  var reader = new FileReader();
    reader.onloadend = function (e) {
      if (reader.readyState == FileReader.DONE) {
        console.log(f.name);
        fmArray[x].stageLocalFile(f.name, f.type, reader.result);
        readFileInfo(x+1);
      }
    };   
    reader.readAsArrayBuffer(f);
}
//----------------------------------------------------------

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
}

//Show progress
function displayProgress(perc){
  document.querySelector('#transferDetails').innerHTML = 'Filename: ' + fmArray[curFileNum].fileName + '. Filenumber: ' + (curFileNum+1) + '/' + nrOfFiles + '. Percent: ' + (perc*100).toFixed(2) + '/100';

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
  if (msg.action === protocol.ANSWER) {
    console.log("THE OTHER PERSON IS READY");
  }
  else if (msg.action === protocol.OFFER) {
    // Someone is ready to send file data. Set up receiving structure
    console.info("Receiving file nr: " + (curFileNum+1) + " of " + msg.totFiles)
    if(curFileNum == 0){
      nrOfFiles = msg.totFiles;
      fmArray = new Array(msg.totFiles);
    }
    fmArray[curFileNum] = new FileManager(maxChunkSize);
    registerFileEvents(fmArray[curFileNum]);
    fmArray[curFileNum].stageRemoteFile(msg.fName, msg.fType, msg.nChunks);
    answerShare();
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