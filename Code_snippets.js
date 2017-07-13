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

KeyManager is JS-code I have to create
-----------------------------------------
function KeyManager(data){
  if(data == null){
    //Create file with current e-mail addr
  }
  //Decode raw file
  //Extract mail
  //Extract keys

  this.email = 
  this.keys = 
  this.challenge = null;
  this.curHash = null;
}

KeyManager.prototype = {
  //Create key pair
  createKeyPair: function () {
    
  },
  //Export the public key
  exportKey: function(){

  },
  //Store a public key
  storeKey: function(){

  },
  //Find key based on mail address
  findKey: function(email){

  }
  //Create hash
  createHash: function () {

  },
  //Compare local with remote hash
  compareHash: function (remoteHash){

  },
  //Generate random challenge
  generateRandom: function (){

  },
  //Write to disk
  writeKeys: function (){
  
  }
};
--------------------------------

Authenticate -> OfferShare