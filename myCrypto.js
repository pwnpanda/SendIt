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
//Behaviour for instancing a new keymanager and Cryptofile
function createCrypto(){
	//Create new manager
	KeyManager = new KeyManager(null);
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
			KeyManager = new KeyManager(fr.result);
		}
	};
	//May have to change to String or BinaryString!
	fr.readAsArrayBuffer(cryptoFile);
}
//Behaviour for writing keymanager to cryptoFile
function writeCrypto(){
	return;
}