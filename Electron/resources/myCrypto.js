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
		return false;
	}
}
//Behaviour for reading an old cryptoFile in to a keymanager
function readCrypto(){
	//read data
	//console.log("read");

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
  	console.log("Creating challenge!")
    //create challenge and tempHash
    km.generateRandom();
    //Tell Protocol to send an authentication challenge!
    createAuthMsg(protocol.AUTH_CHALLENGE);
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
  	    
    //Received an authentication challenge
    case protocol.AUTH_CHALLENGE:
    	km.otherEnd = reply.sender;
  		console.assert((km.findKey(km.otherEnd) != null), "Sender is unknown! Can not exchange information!");
      //Decrypt challenge with private key
      var data = Object.values((reply.challenge));
      data = new Uint8Array(data);
      km.decryptData(data.buffer)
      .then(function(decrypted){
				//returns an ArrayBuffer containing the decrypted data
				var decrData = new Uint8Array(decrypted);
				console.log("Data decrypted: ", decrData);
				return decrData;
			})
			.then(function(decrypted){
				//Compare decrypted reply and temp hash
				//Calculate hash from challenge - stored as curHash in keymanager
	  		return km.createHash(decrypted)
			})
	  	.then(function(hash){
				//returns the hash as an ArrayBuffer
				var hashed = new Uint8Array(hash);
				console.log("Hash created: ", hashed);
				km.curHash = hashed;
			})
			.then(function(){
		  	//Send AUTH_RESPONSE
		  	createAuthMsg(protocol.AUTH_RESPONSE);
			})
			.catch(function(err){
				console.error(err);
			});
    	break;

    //Received an authentication response
    case protocol.AUTH_RESPONSE:
    	//Assert e-mail
    	console.assert((reply.sender === km.otherEnd), "Receivers e-mail is not correct! Security breach found! Terminating!");
	   	//Decrypt reply with private key
      var data = Object.values((reply.challenge));
      data = new Uint8Array(data);
      km.decryptData(data.buffer)
      .then(function(decrypted){
				//returns an ArrayBuffer containing the decrypted data
				var decrData = new Uint8Array(decrypted);
				console.info("Data decrypted: ", decrData);
				return decrData;
			}).then(function(decrypted){
				//Compare decrypted reply and temp hash
				if (km.compareHash(decrypted)){
					console.info("Authenticated!");
					stageFiles();
				}else{
					console.error("Authentication denied! Hashes are not identical!");
				}
			})
			.catch(function(err){
					console.error(err);
			});
    	break;
    
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