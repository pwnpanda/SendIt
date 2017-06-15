var nrOfFiles = 0;

//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
//Send the data
function sendData(file) {
  trace('File is ' + [file.name, file.size, file.type,
      file.lastModifiedDate
  ].join(' '));

  // Handle 0 size files.
  if (file.size === 0) {
  	//Todo - add notification to user
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

function displayProgress(){
	function fileAndChunk(file, chunk){
		document.querySelector('#transferDetails').innerHTML = 'File ' + file.name + '. Number ' + file.number + '/' + fileTotal + '. Slice ' + file.slice + '/' + totalSlices+ '.';
	}
}