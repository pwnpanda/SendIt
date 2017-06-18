var protocol = {
  OFFER: "offer",
  REQUEST: "req-chunk",
  DATA: "data",
  DONE: "done",
  ERR_REJECT: "err-reject",
  CANCEL: "cancel"
};

//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
//Send the data
//Initiate, set up and start transfer
//Use chunknr to identify progress! TODO
function startSending() {
  if(nrOfFiles == 0){
    console.log("Error! No files to send")
    return;
  }

  //Chunksize
  //Set to 1200 bytes, according to:
  //https://cs.chromium.org/chromium/src/third_party/libjingle/source/talk/media/sctp/sctpdataengine.cc?l=52
  //https://bloggeek.me/send-file-webrtc-data-api/
  var chunkSize = 1200;

  var fileArray = new Array(nrOfFiles);
  //For now only 1 file - TODO
 // for(var i=0, f;f=files[i];i++){
  var f = files[0];
  //Use filemanager to stage all the local files and keep them organized TODO
  if(f){
    console.log('File being sent ' + [f.name, f.size, f.type,
    file.lastModifiedDate].join(' '));
    //Need array of filemanagers, one for each file!
    fileArray[i] = new FileManager(chunkSize);

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
        offerShare(fileArray[i]);
      }
    };
   
    reader.readAsArrayBuffer(file);
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
function onReceiveMessageCallback(event) {
  trace('Received Message ' + event.data.byteLength);
  receiveBuffer.push(event.data);
  receivedSize += event.data.byteLength;

  receiveProgress.value = receivedSize;

  // we are assuming that our signaling protocol told
  // about the expected file size (and name, hash, etc).
  //NEED TO IMPLEMENT THIS - TODO
  if (receivedSize === file.size) {
  //Logic above this needs to handle several files and slices
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

function displayProgress(){
	function fileAndChunk(file, chunk){
		document.querySelector('#transferDetails').innerHTML = 'File ' + file.name + '. Number ' + file.number + '/' + fileTotal + '. Slice ' + file.slice + '/' + totalSlices+ '.';
	}
}

function offerShare(fm){
  console.log("Offering share...");
  var msg = {
    fName: fm.fileName,
    fType: fm.fileType,
    nChunks: fm.fileChunks.length,
    action: protocol.OFFER
  }
  doSend(msg);
}

function answerShare(fm){
  console.log("Answering share...");
  var msg = {action: protocol.ANSWER}
  doSend(msg);

  fm.requestChunks();
}

function doSend(msg){
  console.log("Sending data...");
  sendChannel.send(msg);
}

function packageChunk(chunkId, fm){
  return JSON.stringify({
    action: protocol.DATA,
    id: chunkId,
    content: Base64Binary.encode(fm.fileChunks[chunkId])
  });
}