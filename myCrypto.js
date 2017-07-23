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
			KeyManager = new KeyManager("existing", fr.result);
		}
	};
	//May have to change to String or BinaryString!
	fr.readAsArrayBuffer(cryptoFile);
}
//Try to authenticate user
function beginAuth (){
  var key = KeyManager.findKey(KeyManager.otherEnd);
  //if we have the receivers key in the list:
  if(key != null){
    //create challenge and tempHash
    KeyManager.generateRandom();
    //Tell Protocol to send an authentication challenge!
    createAuthMsg(protocol.AUTH_CHALLENGE);
  } else {
  //If setup:
    //Tell Protocol to setup authentication for next time
    createAuthMsg(protocol.AUTH_SETUP);
  }
}
//Process the reply from receiver and authenticate/deny connection
function processAuth(reply){
  //If challenge:
  	//Decrypt challenge with private key
  	//Calculate hash
  	//Encrypt with sender's key
  //If challenge-reply:
    //Decrypt reply with private key
    //Compare decrypted reply and temp hash
    //Call stageFiles(); or throw error!
  //If setup
    //Store e-mail and public key
    //Reply with own e-mail and public key
  //If setup-reply
    //Call stageFiles();
    //Assert e-mail
    return;
}
//Behaviour for writing keymanager to cryptoFile
function writeCrypto(){
	return;
}