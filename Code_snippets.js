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

KeyManager is JS-code I have to create
-----------------------------------------
function KeyManager(data){
  //Reference to itself
  this.self = this;
  //local mail address
  this.email = null;
  //dictionary of keys and addresses
  this.keys = null;
  //Random string generated
  this.challenge = null;
  //Hash of generated string
  this.curHash = null;
  //Temporary public key storage
  this.publicKey = null;

  if(data != null){
    //Decode raw file
    //var dec = decodeMethod(data);
    //dec = JSON.parse(data);
    //Extract mail
    this.email = dec.email;
    //Extract keys
    this.keys = dec.keys;
  }
}

KeyManager.prototype = {
  //Create key pair
  createKeyPair: function (receiver) {
    //Taken from: https://github.com/diafygi/webcrypto-examples#rsa-oaep
    window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048, //can be 1024, 2048, or 4096
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
      },
      true, //whether the key is extractable (i.e. can be used in exportKey)
      ["encrypt", "decrypt"] //must be ["encrypt", "decrypt"] or ["wrapKey", "unwrapKey"]
    )
    .then(function(key){
        //returns a keypair object
        //keys.append(receiver, key.privateKey);
        this.publicKey = key.publicKey;
        /*
        console.log(key);
        console.log(key.publicKey);
        console.log(key.privateKey);
        */
    })
    .catch(function(err){
        console.error(err);
    });
  },
  //Export the public key
  exportKey: function(){
    var key = this.publicKey;
    this.publicKey = null;
    return key;
  },
  //Store a public key
  storeKey: function(email, key){
    //Add key + sender in dictionary
  },
  //Find key based on mail address
  findKey: function(email){
    //lookup: email
    //return: key
  }
  //Create hash
  createHash: function () {
    //this.curHash = hashfunction(this.challenge);
    this.challenge=null;
  },
  //Compare local with remote hash
  compareHash: function (remoteHash){
    return (remoteHash == this.curHash)
  },
  //Generate random challenge
  generateRandom: function (){
    //Generate challenge
    this.challenge=0;//randomgenerator
  },
  //Write to disk
  writeKeys: function (){
    //Erase session data
    this.challenge=null;
    this.hash=null;
    //Stringify object
    var write = JSON.stringify(this.self);
    write = 0;//encodeMethod(write)
    //Write to disk
  }
};
--------------------------------

Authenticate -> OfferShare