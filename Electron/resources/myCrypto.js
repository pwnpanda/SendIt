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
    //!!!!!!!!!!!!!!!!!!!!!!!!!
    //TODO Wrong side in server-solution
    //stageFiles();
    //offerShare();
    //Replaced! Needs testing!
    initTransfer();
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

      console.assert((reply.sender === km.otherEnd), "Receivers e-mail is not correct! Security breach found! Terminating!", {action: protocol.ERR_REJECT});

    	//Store e-mail and public key
    	km.storeKey(reply.sender, reply.key);
    	//Authentication setup complete - start transfer!
    	console.log("Authentication setup complete! Starting transfer!");
      //!!!!!!!!!!!!!!!!!!!!!!!!!
      //TODO Wrong side in server-solution
      //stageFiles();
      //offerShare();
      //Replaced! Needs testing!
      initTransfer();
    	break;
    
    //Error!
    default: 
    	console.error("Malformed message type: ", reply.action);
    	break;
  }
}

function encrypt(pubkey, data){
  console.log("Key in: ", pubkey);
  console.log("Data in : ",data)
  var encryData;
  //if we have the receivers key in the list:
  if(pubkey != null){
    console.log('Other end has associated key!', pubkey);
    km.encrypt = convertStringToArrayBufferView(JSON.stringify(data));
    console.log(km.encrypt);
    km.iv = window.crypto.getRandomValues(new Uint8Array(12));
    //Create symmetric key  
    km.createSymmKey()
    .then(function(key){
      //Encrypt with symmetric key
      return km.encryptData(key, km.encrypt, km.iv)
    })
    //returns an ArrayBuffer containing the encrypted data
    .then(function(encrypted){
      encryData = new Uint8Array(encrypted);
      console.info("Data encrypted: ", encryData);
      //Import other ends public key
      return km.importKey(pubkey, pubkey.key_ops)
    })
    .then(function(key){
      console.log("Received in next promise: ", key, encryData);
      pubkey=key;
      //encrypt (wrap) symmetric key with public key
      return km.wrapKey(km.symmetric, pubkey);
    })
    .then(function(wrapKey){
      //Create object for sharing: iv, wrapped symmetric key amnd cipher
      var msg = {iv: km.iv, wrap: wrapKey, ciph: encryData};
      console.log("Object", msg);
      msg = JSON.stringify(msg);
      console.log("String", msg);
      //Show in window
      showenc(msg);
      return msg;
    })
    .catch(function(err){
      console.error(err);
    });

  } else {
    console.log('Other end has NO associated key!');
    km.encrypt = JSON.stringify(data);
    showenc(km.encrypt);
    return km.encrypt;
  }
}

function decrypt(pubkey, data){
  var decryData;
  //if we have the receivers key in the list:
  console.log('Data to decrypt/pass on: ', data);
  if(pubkey != null){
    //console.log('Other end has associated key!');
    data=JSON.parse(data);
    console.log("Parsed", data);
    var temp = Object.values(data.iv);
    km.iv = new Uint8Array(temp);
    temp = Object.values(data.wrap);
    decryData = new Uint8Array(temp);
    temp = Object.values(data.ciph);
    console.log(decryData);
    km.unwrapKey(decryData.buffer, (km.key).privateKey)
    .then(function(symKey){
      km.symmetric=symKey;
      console.log(symKey);
      return km.decryptData(new Uint8Array(temp), km.iv);
    })
    .then(function(decrypted){
      //returns an ArrayBuffer containing the decrypted data
      console.log("Data decrypted raw: ", new Uint8Array(decrypted));
      decryData = new Uint8Array(decrypted);
      decryData = convertArrayBufferViewtoString(decryData);
      console.log("Data decrypted: ", decryData);
      decryData = JSON.parse(decryData);
      setDescr(decryData, true);
      return decryData;
    })
    .catch(function(err){
      console.error(err);
    });
  }else{
    console.log('Other end has NO associated key!');
    decryData=JSON.parse(data);
    console.log(decryData);
    setDescr(decryData, true);
    return decryData;
  }
}

function encryptReply(pubkey, data){
  var encryData;
  km.encrypt = convertStringToArrayBufferView(JSON.stringify(data));
  console.log('Data to encrypt/pass on: ', km.encrypt);
  if(pubkey != null){
    km.encryptData(km.symmetric, km.encrypt, km.iv)
    //returns an ArrayBuffer containing the encrypted data
    .then(function(encrypted){
      encryData = new Uint8Array(encrypted);
      console.info("Data encrypted: ", encryData);
      return encryData;
    })
    .then(function(data){
      showenc(JSON.stringify(data));
      return JSON.stringify(data);
    })
    .catch(function(err){
      console.error(err);
    });
  }else{
    console.log('Other end has NO associated key!');
    km.encrypt = JSON.stringify(pc2.localDescription);
    showenc(km.encrypt);
  }

}

function decryptReply(data){
  var pubkey = km.findKey(km.otherEnd);
  var decryData;
  data = JSON.parse(data);
  console.log('Data to decrypt/pass on: ', data);

  if (pubkey != null){
    decryData = Object.values(data);
    //console.log("1",decryData);
    decryData = new Uint8Array(decryData);
    //console.log("2",decryData);
    km.decryptData(decryData, km.iv)
    .then(function(decrypted){
      //returns an ArrayBuffer containing the decrypted data
      console.log("Data decrypted raw: ", new Uint8Array(decrypted));
      decryData = new Uint8Array(decrypted);
      decryData = convertArrayBufferViewtoString(decryData);
      console.log("Data decrypted: ", decryData);
      decryData = JSON.parse(decryData);
      setDescr(JSON.parse(decryData), false);
      return decryData;
    })
    .catch(function(err){
      console.error(err);
    });
  }else{
      setDescr(data, false);
      return data;
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