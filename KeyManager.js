function KeyManager(data){
  //If file exists
  if(data != null){
    //Decode raw file
    //var dec = decodeMethod(data);
    //dec = JSON.parse(data);
    //Extract mail
    this.email = dec.email;
    //Extract own key - stored as objects
    this.key = dec.key;
    //Extract keys - stored as objects
    //Todo - handle 0-n keys!
    this.keys = dec.keys;
  //Else
  } else{
	//Email of this node
	this.email = myMail;
	//Public&Private key of this node
	this.key = this.createKeyPair();
	//Dictionary of public keys and e-mails of other nodes
	//Key = email, value = Public key
	this.keys = {};
  }
  //Reference to itself
  this.self = this;
  //Random string generated
  this.challenge = null;
  //Hash of generated string
  this.curHash = null;
}

KeyManager.prototype = {
  //Create key pair as keyPair object
  createKeyPair: function () {
    //Taken from: https://github.com/diafygi/webcrypto-examples#rsa-oaep
    return window.crypto.subtle.generateKey(
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

  //Exports the public key-object as keydata
  //Taken from: https://github.com/diafygi/webcrypto-examples#rsa-oaep
  exportKey: function(){
    return window.crypto.subtle.exportKey(
    	//todo change to SPKI
	    "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
	    this.key.publicKey; //can be a publicKey or privateKey, as long as extractable was true
	)
	.then(function(keydata){
	    //returns the exported key data
	    console.log(keydata);
	    return keydata;
	})
	.catch(function(err){
	    console.error(err);
	});
  },

  //Returns the public key-object converted from keydata
  importKey: function(key){
  	//Taken from: https://github.com/diafygi/webcrypto-examples#rsa-oaep
  	return window.crypto.subtle.importKey(
  		//TODO change to SPKI
	    "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
	    key,
	    {   //these are the algorithm options
	        name: "RSA-OAEP",
	        hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
	    },
	    true, //whether the key is extractable (i.e. can be used in exportKey)
	    ["encrypt"] //"encrypt" or "wrapKey" for public key import or
	                //"decrypt" or "unwrapKey" for private key imports
	)
	.then(function(publicKey){
	    //returns a publicKey (or privateKey if you are importing a private key)
	    console.log(publicKey);
	    return publicKey;
	})
	.catch(function(err){
	    console.error(err);
	});
  },

  //Store a public key as keydata
  storeKey: function(email, key){
    if(email in keys){
    	console.error("Error! Email is already associated with a key!");
    }
    //Add key=email and value=Public key in dictionary
    //Public key stored as object
    keys[email] = key;
  },

  //Find keydata based on mail address
  findKey: function(email){
    if(email in this.keys){
    	return this.keys[email];
    }
    return null;
  },
  
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
    this.curHash = 0//hashFunction(this.challenge);
  },
  
  //Encrypt data by using key-object
  encryptData: function(data, email){
  	var useKey = findKey(email);
  	if(useKey == null){
  		console.error("There is no key associated with this address!!!");
  	}
  	return window.crypto.subtle.encrypt(
	    {
	        name: "RSA-OAEP",
	        //label: Uint8Array([...]) //optional
	    },
	    useKey, //from generateKey or importKey above
	    data //ArrayBuffer of data you want to encrypt
	)
	.then(function(encrypted){
	    //returns an ArrayBuffer containing the encrypted data
	    var encrData = new Uint8Array(encrypted);
	    console.log(encrData);
	    return encrData;
	})
	.catch(function(err){
	    console.error(err);
	});
  },

  //Decrypt data by using key-object
  decryptData: function(data){
  	return window.crypto.subtle.decrypt(
	    {
	        name: "RSA-OAEP",
	        //label: Uint8Array([...]) //optional
	    },
	    this.key.privateKey, //from generateKey or importKey above
	    data //ArrayBuffer of the data
	)
	.then(function(decrypted){
	    //returns an ArrayBuffer containing the decrypted data
	    var decrData = new Uint8Array(decrypted);
	    console.log(decrData);
	    return decrData;
	})
	.catch(function(err){
	    console.error(err);
	});
  },
  
  //Write to disk
  writeToDisk: function (){
    //Erase session data
    this.challenge=null;
    this.hash=null;
    //Stringify object
    var write = JSON.stringify(this.self);
    write = 0;//encodeMethod(write)
    //Write to disk
  }
};