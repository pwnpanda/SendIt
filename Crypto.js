function KeyManager(data){
  //Reference to itself
  this.self = this;
  //Email of this node
  this.email = myMail;
  //Public&Private key of this node
  this.key = createKeyPair()
  //Dictionary of public keys and e-mails of other nodes
  //Key = email, value = Public key
  this.keys = {};
  //Random string generated
  this.challenge = generateRandom();
  //Hash of generated string
  this.curHash = null;
  
  if(data != null){
    //Decode raw file
    //var dec = decodeMethod(data);
    //dec = JSON.parse(data);
    //Extract mail
    this.email = dec.email;
    //Extract own key
    this.key = dec.key;
    //Extract keys
    this.keys = dec.keys;
  }
}

KeyManager.prototype = {
  //Create key pair
  createKeyPair: function () {
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
        return key;
        /*
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
    return this.key.publicKey;
  },
  //Store a public key
  storeKey: function(email, key){
    if(email in keys){
    	console.error("Error! Email is already associated with a key!");
    }
    //Add key=email and value=Public key in dictionary
    keys[email] = key;
  },
  //Find key based on mail address
  findKey: function(email){
    if(email in keys){
    	return keys[email];
    }
    return null;
  }
  //Create hash
  createHash: function (data) {
    //HashFunction TODO
    this.curHash = hashfunction(data);

  },
  //Compare local with remote hash
  compareHash: function (remoteHash){
    return (remoteHash == this.curHash)
  },
  //Generate random challenge
  generateRandom: function (){
    //Generate challenge
    //TODO
    this.challenge = 0;//randomgenerator
    this.curHash = 0//hashFunction(challenge);
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

/*
function readCrypto(){
	cryptofile = $("#cryptoFile");
	console.log(cryptofile);
}


//If file doesn't exist, require text-field input to continue.
//If it exists, hide text-field!
console.log(cfExists);
if(!cfExists){
  $('#txtMyMail').show();
  $('#createBtn').prop('disabled', true);
  $('#joinBtn').prop('disabled', true);
  $("#myMail").show();
  $("#myMail").keyup( function() {
    if( $(this).val() != '') {
      $('#createBtn').prop('disabled', false);
      $('#joinBtn').prop('disabled', false);
    }else{
      $('#createBtn').prop('disabled', true);
      $('#joinBtn').prop('disabled', true);
    }
  });
}else{
	$('#txtRecMail').hide();
}
*/