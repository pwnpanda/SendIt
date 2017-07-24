if(CRYPTOFILE){
  //Reads a file and sends it to a constructor
  var crypto;
  var rd = new FileReader();
  rd.onloadend = function(e){
    if(rd.readyState == FileReader.done){
      console.log('Crypto loaded');
      crypto = new KeyManager(rd.result);
    }
  };
  rd.readAsArrayBuffer(CRYPTOFILE);


} else{
  //Ask for local email address
  crypto = new KeyManager(null);
}
--------------------------------------------------------------

var dict = {}
dict["key1"] = "val1";
dict["key2"] = "val2";
//Prints all key-value pairs
console.log(dict);
//Prints val2
console.log(dict["key2"]);
//Loops through all entries
for(key in dict){
  var value = dict[key];
  /* use key/value for intended purpose */
}

!("key" in obj) // true if "key" doesn't exist in object


Promise.all(array); /*Make a promise that fulfills when every item in the array fulfills, 
and rejects if (and when) any item rejects. Each array item is passed to 
Promise.resolve, so the array can be a mixture of promise-like objects and other 
objects. The fulfillment value is an array (in order) of fulfillment values. The 
rejection value is the first rejection value.*/
Promise.race(array);  /*Make a Promise that fulfills as soon as any item fulfills,
 or rejects as soon as any item rejects, whichever happens first.*/


----------------------------------------------------------------------------------------
OLD CODE!

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
  } else if(msg.action == protocol.AUTH_CHALLENGE || protocol.AUTH_RESPONSE || protocol.AUTH_SETUP || protocol.AUTH_S_REPLY){
    console.info("Received authentication signal: ", data.action);
    processAuth(data);
  }else{
    console.error("Unrecognized signal received! Signal: " + msg.action);
  }