function KeyManager(cmd, data) {
  //Reference to itself
  this.self = this;
  //Random string generated
  this.challenge = null;
  //Hash of generated string
  this.curHash = null;
  //Other end of the connection
  this.otherEnd = null;
  //Own Email
  this.email = null;
  //Own key-pair
  this.key = null;
  //List of known addresses and keys
  this.keys = {};

  if(cmd == "existing"){
    this.loadData(data);
  }else if (cmd == "new"){
    this.newManager(data);
  }else {
    console.error("Malformed command! Command: " + cmd);
  }
};

KeyManager.prototype = { 
  //Initialize with file
  loadData: function(data){
    console.log("Loading data in to KeyManager ", data);
    //If file exists
    if(data != null){
      //Decode raw file
      //TODO - Decrypt file (and encrypt)
      //var dec = decodeMethod(data);
      var dec = JSON.parse(data);
      //Extract mail
      this.email = dec.email;
      //Extract own key - stored as objects
      this.key = dec.key;
      //Extract keys - stored as objects
      //Todo - handle 0-n keys!
      this.keys = dec.keys;
    //Else
    } else{
      console.error("No data to read! Data: ", data);
    }
    console.info("This keymanager: ", this.self);
  },

  //Create new KeyManager
  newManager: function(myMail){
    console.log("Creating new KeyManager ", myMail);
    //Email of this node
    this.email = myMail;
    //Dictionary of public keys and e-mails of other nodes
    //Key = email, value = Public key
    this.keys = {};
    //Public&Private key of this node
    this.createKeyPair();
  },

  //Create key pair as keyPair object
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
        console.log("KeyPair created!");
        km.key = key;
        
        /*TODO - Remove! SENSITIVE
        console.info(key.publicKey);
        console.info(key.privateKey);
        */
        
    })
    .catch(function(err){
        console.error(err);
    });
  },

  //Exports the keydata from a public key object
  //Taken from: https://github.com/diafygi/webcrypto-examples#rsa-oaep
  exportKey: function() {
    return window.crypto.subtle.exportKey(
	    "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
	    km.key.publicKey //can be a publicKey or privateKey, as long as extractable was true
  	);
  	/*.then(function(keydata){
  	    //returns the exported key data
  	    console.info("Exported key: ", keydata);
  	    km.keydat = keydata;
        testCrypto(keydata);
  	})
  	.catch(function(err){
  	   console.error(err);
  	 }
    );*/
  },

  //Returns the public key-object converted from keydata
  importKey: function(key){
  	//Taken from: https://github.com/diafygi/webcrypto-examples#rsa-oaep
  	return window.crypto.subtle.importKey(
	    "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
	    key,
	    {   //these are the algorithm options
	        name: "RSA-OAEP",
	        hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
	    },
	    true, //whether the key is extractable (i.e. can be used in exportKey)
	    ["encrypt"] //"encrypt" or "wrapKey" for public key import or
	                //"decrypt" or "unwrapKey" for private key imports
	  );
  },

  //Store a public key as keydata
  storeKey: function(email, key){
    if(email in this.keys){
    	console.error("Error! Email is already associated with a key! This is a security breach!");
    }
    //Add key=email and value=Public key in dictionary
    //Public key stored as object
    //Gets the promise for importKey
    this.importKey(key)
    .then(function(impKey){
      //Once the object-data has been extracted, store it in the keys-array
      //have to use km, since we're inside window.crypto. 
      km.keys[email] = impKey;
      console.info("Key and email pair stored for: " + email + " - ", impKey);
    })
    .catch(function(err){
      //Error-handling just in case!
      console.error(err);
    });
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
    //Taken from: https://github.com/diafygi/webcrypto-examples#sha-256---digest
    this.curHash = window.crypto.subtle.digest(
      {
          name: "SHA-256",
      },
      data //The data you want to hash as an ArrayBuffer
    )
    .then(function(hash){
      //returns the hash as an ArrayBuffer
      //TODO - REMOVE? Use this to test if hashed is needed
      console.log(hash);
      var hashed = new Uint8Array(hash);
      console.log("Hash created: ", hashed);
      return hashed;
    })
    .catch(function(err){
        console.error(err);
    });
  },
  
  //Compare local with remote hash
  compareHash: function (remoteHash){
    return (remoteHash == this.curHash);
  },
  
  //Generate random challenge
  generateRandom: function (){
    //Generate challenge
    this.challenge = window.crypto.getRandomValues(new Uint8Array(16));
    //Generate hash
    this.createHash(this.challenge);
    console.info("Hash and challenge generated!");
  },
  
  //Encrypt data by using receiver's public key-object
  encryptData: function(data){
  	console.info("Encrypting: ", data);
    var useKey = findKey(this.otherEnd);
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
      //TODO - REMOVE? Use this to test if encrData is needed
      console.log(encrypted);
	    var encrData = new Uint8Array(encrypted);
	    console.log("Data encrypted: ", encrData);
	    return encrData;
	})
	.catch(function(err){
	    console.error(err);
	});
  },

  //Decrypt data by using own private key-object
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
      //TODO - REMOVE? Use this to test if decrData is needed
      console.log(decrypted);
	    var decrData = new Uint8Array(decrypted);
	    console.log("Data decrypted: ", decrData);
	    return decrData;
	})
	.catch(function(err){
	    console.error(err);
	});
  },
  
  //getObjectData
  getObjectData: function (){
    //Erase session data
    this.challenge=null;
    this.hash=null;
    //Stringify object
    return JSON.stringify(this.self);
    //TODO - encrypt data before returning!
  }
};