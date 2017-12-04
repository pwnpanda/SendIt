function KeyManager(cmd, data) {
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
			//var dec = JSON.parse(data);
			var dec = data.split(";\n");
			console.log(dec.length);
			console.log(dec);
			//Extract mail
			this.email = dec[0];
			//Extract own key - stored as object
			this.key=new Object();
			this.key.privateKey = JSON.parse(dec[1]);
			this.key.publicKey = JSON.parse(dec[2]);
			//Store user and public key-pairs
			this.keys = {};
			//Extract keys - stored as JWK! //TODO - Issue with key_ops! Figure it out
			Promise.all([(this.importKey(this.key.privateKey, this.key.privateKey.key_ops)),
			(this.importKey(this.key.publicKey, this.key.publicKey.key_ops))]).then(function (keys) {
				km.key.privateKey = keys[0];
				km.key.publicKey = keys[1];
			}).catch(function(err){
				//Error-handling just in case
				console.error(err);
			});
			//Handles any number of keys!
			for (var i = 3; i < dec.length-1; i++) {
				console.log(dec[i]);
				var tmp = dec[i].split(";");
				this.storeKey(tmp[0], JSON.parse(tmp[1]));
			}
		//Else
		} else{
			console.error("No data to read! Data: ", data);
		}
		console.info("This keymanager: ", this);
	},

	//Create new KeyManager
	newManager: function(myMail){
		console.log("Creating new KeyManager ", myMail);
		//Email of this node
		this.email = myMail;
		//Set mail for config.conf, if we create a new keymanager
		setMail(this.email);
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
	exportKey: function(eKey) {
		return window.crypto.subtle.exportKey(
			"jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
			eKey //can be a publicKey or privateKey, as long as extractable was true
		);
	},

	//Returns the public key-object converted from keydata
	importKey: function(key, use){
		//Taken from: https://github.com/diafygi/webcrypto-examples#rsa-oaep
		return window.crypto.subtle.importKey(
			"jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
			key,
			{   //these are the algorithm options
					name: "RSA-OAEP",
					hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
			},
			true, //whether the key is extractable (i.e. can be used in exportKey)
			use //"encrypt" or "wrapKey" for public key import or
									//"decrypt" or "unwrapKey" for private key imports
		);
	},

	//Store a public key as keydata
	storeKey: function(email, key){
		if(email in this.keys){
			console.assert(false, "Error! Email is already associated with a key! This is a security breach!");
		}
		//Add key=email and value=Public key in dictionary
		//Public key stored in JWK-format
		this.keys[email] = key;
		console.info("Key and email pair stored for: " + email + " - ", key);
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
		return window.crypto.subtle.digest(
			{
					name: "SHA-256",
			},
			data //The data you want to hash as an ArrayBuffer
		)
	},
	
	//Compare local with remote hash
	compareHash: function (remoteHash){
		//https://stackoverflow.com/a/21554107
		if (remoteHash.byteLength != (this.curHash).byteLength) return false;
    var dv1 = new Int8Array(remoteHash);
    var dv2 = new Int8Array(this.curHash);
    for (var i = 0 ; i != remoteHash.byteLength ; i++) {
        if (dv1[i] != dv2[i]) return false;
    }
    return true;
	},
	
	//Generate random challenge
	generateRandom: function (){
		//Generate challenge
		this.challenge = window.crypto.getRandomValues(new Uint8Array(16));
		//Generate hash
		this.createHash(this.challenge)
		.then(function(hash){
			//returns the hash as an ArrayBuffer
			var hashed = new Uint8Array(hash);
			console.log("Hash created: ", hashed);
			km.curHash = hashed;
		})
		.catch(function(err){
				console.error(err);
		});
		console.info("Hash and challenge generated!");
	},
	
	//Encrypt data by using receiver's public key-object
	encryptData: function(key, data){
		console.log("Encrypting: ", data);
		if(key == null){
			console.error("There is no key associated with this address!!!");
		}
		return window.crypto.subtle.encrypt(
			{
					name: "RSA-OAEP",
					//label: Uint8Array([...]) //optional
			},
			key, //from generateKey or importKey above
			data //ArrayBuffer of data you want to encrypt
		)
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
		);
	},
	
	//getObjectData
	getObjectData: function (){
		//Erase session data
		this.challenge=null;
		this.hash=null;
		this.otherEnd=null;
		var write;
		//Stores the own email, then own private key, then list of know hosts and public-key-pairs.
		Promise.all([(this.exportKey(this.key.privateKey)),
			(this.exportKey(this.key.publicKey))]).then(function (keys) {
				write = km.email + ";\n" + JSON.stringify(keys[0]) + ";\n" + JSON.stringify(keys[1]) + ";\n";
				for(email in km.keys){
					write = write + email +";"+JSON.stringify(km.keys[email])+";\n";
				}
				//Call some function that writes to file, sending write as an argument.
				writeToFile(write, cfPath+cfName);
				//console.warn("Here: \n" + write);
				//TODO - encrypt data before returning!
		}).catch(function(err){
			//Error-handling just in case
			console.error(err);
		});
	}
};