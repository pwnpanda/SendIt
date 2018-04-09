/*
File for calling correct order of keyManager methods.
Also for checking for crypto-file and managing other semi-related crypto-things
*/
var fs = require('fs');

//Hits, but is supposed to be implemented - WHY!?!
if (!window.crypto || !window.crypto.subtle) {
    console.error("Your current browser does not support the Web Cryptography API! This page will not work.");
}
//Main crypto function
function existCrypto(){
  console.log("Cryptofile " +cfPath+cfName);
	if(fs.existsSync(cfPath+cfName)){
		readCrypto();
		return true;
	}else{
    ensureDirectoryExistence(cfPath+cfName);
		return false;
	}
}
//Behaviour for reading an old cryptoFile in to a keymanager
function readCrypto(){
	//read cryptoFile
	try{
		var buf = fs.readFileSync(cfPath+cfName, "utf8");
		//console.log(buf);
		km = new KeyManager("existing", buf);
	}catch(err){
		console.error("Error reading cryptofile: ", err);
	}
}
//Try to authenticate user
function beginAuth (){
  console.log("Starting authentication process!")
  var key = km.findKey(km.otherEnd);
  //if we have the receivers key in the list:
  if(key != null){
  	stageFiles();
  } else {
  //If setup:
  	console.log("starting setup!");
    //Tell Protocol to setup authentication for next time
    createAuthMsg(protocol.AUTH_SETUP);
  }
}
//Process the reply from receiver and authenticate/deny connection
function processAuth(reply){
  switch(reply.action){    
    //Received authentication setup information  
    case protocol.AUTH_SETUP:
    	km.otherEnd = reply.sender;
    	//Store e-mail and public key
    	km.storeKey(reply.sender, reply.key);
    	//Reply with own e-mail and public key in AUTH_S_REPLY
    	createAuthMsg(protocol.AUTH_S_REPLY);
    	break;
    
    //Received authentication setup reply
    case protocol.AUTH_S_REPLY:
    	//Assert e-mail
    	console.assert((reply.sender === km.otherEnd), "Receivers e-mail is not correct! Security breach found! Terminating!");
    	//Store e-mail and public key
    	km.storeKey(reply.sender, reply.key);
    	//Authentication setup complete - start transfer!
    	console.log("Authentication setup complete! Starting transfer!");
    	stageFiles();
    	break;
    
    //Error!
    default: 
    	console.error("Malformed message type: ", reply.action);
    	break;
  }
}

function encrypt(data){
  console.log('Data to encrypt/pass on: ', data);
  var key = km.findKey(km.otherEnd);
  //if we have the receivers key in the list:
  if(key != null){
    console.log('Other end has associated key!');
    //Encrypt with other ends public key
    km.encryptData(key, km.encrypt)
    .then(function(encrypted){
      //returns an ArrayBuffer containing the encrypted data
      var encryData = new Uint8Array(encrypted);
      console.info("Data encrypted: ", encryData);
      return encryData;
    })
    .then(function(encrypted){
      showenc(JSON.stringify(encrypted));
    })
    .catch(function(err){
      console.error(err);
    });

  } else {
    console.log('Other end has NO associated key!');
    showenc(data);
  }
}

function decrypt(data){
  var key = km.findKey(km.otherEnd);
  //if we have the receivers key in the list:
  console.log('Data to decrypt/pass on: ', data);
  if(key != null){
    console.log('Other end has associated key!');

    km.decryptData(data)
    .then(function(decrypted){
      //returns an ArrayBuffer containing the decrypted data
      console.warn("Data decrypted raw: ", new Uint8Array(decrypted));
      var decryData = new Uint8Array(decrypted);
      decryData = convertArrayBufferViewtoString(decryData);
      console.log("Data decrypted: ", decryData);
      decryData = JSON.parse(decryData);
      return decryData;
    })
    .catch(function(err){
      console.error(err);
    });
  }else{
    console.log('Other end has NO associated key!');
    return JSON.parse(data);
  }
}

function convertStringToArrayBufferView(str){
    var bytes = new Uint8Array(str.length);
    for (var iii = 0; iii < str.length; iii++) 
    {
        bytes[iii] = str.charCodeAt(iii);
    }

    return bytes;
}   

function convertArrayBufferViewtoString(buffer){
    var str = "";
    for (var iii = 0; iii < buffer.byteLength; iii++) 
    {
        str += String.fromCharCode(buffer[iii]);
    }

    return str;
}