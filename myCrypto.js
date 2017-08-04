/*
File for calling correct order of keyManager methods.
Also for checking for crypto-file and managing other semi-related crypto-things
*/
var cryptoFile;

//Hits, but is supposed to be implemented - WHY!?!
if (!window.crypto || !window.crypto.subtle) {
    console.error("Your current browser does not support the Web Cryptography API! This page will not work.");
}
//Main crypto function
function existCrypto(){
	cryptoFile = $("#cryptoFile")[0].files[0];
	console.log(cryptoFile);
	if(!cryptoFile){
		$('#txtMyMail').show();
	}else{
		//Ask for users e-mail!
		$('#txtMyMail').hide();
	}
}
//Behaviour for reading an old cryptoFile in to a keymanager
function readCrypto(){
	//read data
	console.log("read");
	//read cryptoFile
	//https://stackoverflow.com/questions/3146483/html5-file-api-read-as-text-and-binary/3146509#3146509
	var fr = new FileReader ();
	//Declare callback function
	fr.onloadend = function (e){
		if(fr.readyState == FileReader.DONE){
			console.info("File read");
		 	console.log(fr.result);
			//create KeyManager
			km = new KeyManager("existing", fr.result);
		}
	};
	//May have to change to String or BinaryString!
	fr.readAsText(cryptoFile);
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
      console.log(reply.challenge);
      var binary = new Uint8Array.from(reply.challenge);
      console.log("First: ", binary);
      binary = binary.buffer;
      console.log("second", binary);
      km.decryptData(binary)
      .then(function(decrypted){
				//returns an ArrayBuffer containing the decrypted data
				var decrData = new Uint8Array(decrypted);
				console.log("Data decrypted: ", decrData);
				return decrData;
			}).then(function(decrypted){
				//Compare decrypted reply and temp hash
				//Calculate hash from challenge - stored as curHash in keymanager
	  		return km.createHash(decrypted);
			}).then(function(){
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
      console.log(reply.challenge);
      var binary = new Uint8Array.from(reply.challenge);
      console.log("First: ", binary);
      binary = binary.buffer;
      console.log("second", binary);
      km.decryptData(binary)
      .then(function(decrypted){
				//returns an ArrayBuffer containing the decrypted data
				var decrData = new Uint8Array(decrypted);
				console.log("Data decrypted: ", decrData);
				return decrData;
			}).then(function(decrypted){
				//Compare decrypted reply and temp hash
				if (km.compareHash(decrypted)){
					console.info("Authenticated!");
					stageFiles();
				}else{
					console.error("Authentication denied! Security issue!");
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