function KeyManager(cmd, data) {
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
    	$('#progerror').html("Malformed command!");
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
			//console.log(dec.length);
			//console.log(dec);
			//Extract mail
			this.email = dec[0];
			//If the e-mail doesn't match, create a new keymanager for that email
			//Todo: needs to restart and look for a file for this email!
			if(this.email != myMail){
				console.log("Read email: " + this.email + " Given email: "+ myMail);
				return;
			}
			//Extract own key - stored as object
			this.key=new Object();
			this.key.privateKey = JSON.parse(dec[1]);
			this.key.publicKey = JSON.parse(dec[2]);
			//Store user and public key-pairs
			this.keys = {};
			//Extract keys - stored as JWK!
			Promise.all([(this.importKey(this.key.privateKey, this.key.privateKey.key_ops)),
			(this.importKey(this.key.publicKey, this.key.publicKey.key_ops))]).then(function (keys) {
				km.key.privateKey = keys[0];
				km.key.publicKey = keys[1];
			}).catch(function(err){
				//Error-handling just in case
    			$('#progerror').html(err);
				console.error(err);
			});
			//Handles any number of keys!
			for (var i = 3; i < dec.length-1; i++) {
				console.log(dec[i]);
				var tmp = dec[i].split(";");
				this.storeKey(tmp[0], JSON.parse(tmp[1]));
			}		
		//If no file found!
		} else{
    		$('#progerror').html("No data to read!");
			console.error("No data to read! Data: ", data);
		}
		//console.info("This keymanager: ", this);
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
		this.key=this.createKeyPair();
		/*
		.then(function(key){
			//returns a keypair object
			console.log("KeyPair created!");
			km.key = key;
			
			*//*TODO - Remove! SENSITIVE
			console.info(key.publicKey);
			console.info(key.privateKey);
			*//*
			
		})
		.catch(function(err){
			console.error(err);
		});*/
	},

	//Create key pair as keyPair object
	createKeyPair: function () {
		//Taken from: https://github.com/diafygi/webcrypto-examples#rsa-oaep
		return window.crypto.subtle.generateKey(
			{
				name: "RSA-OAEP",
				modulusLength: 2048, //can be 1024, 2048, or 4096
				publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
				hash: {name: "SHA-1"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
			},
			true, //whether the key is extractable (i.e. can be used in exportKey)
			["wrapKey", "unwrapKey"]
			//["encrypt", "decrypt"] //must be ["encrypt", "decrypt"] or ["wrapKey", "unwrapKey"]
		)
		.catch(function(err){
    		$('#progerror').html('createKeyPair error');
			console.error(err);
		});
	},

	createSymmKey: function(){
		return window.crypto.subtle.generateKey(
		{
			name: "AES-GCM",
			length: 256,	
		},
		true,
		["encrypt", "decrypt"]
		).then(function(key){
			//returns a keypair object
			console.log("Symmetric key created!", key);
			km.symmetric = key;
			return key;
		})
		.catch(function(err){
    		$('#progerror').html('Create Symmetric key error');
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
					hash: {name: "SHA-1"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
			},
			true, //whether the key is extractable (i.e. can be used in exportKey)
			use //"encrypt" or "wrapKey" for public key import or
									//"decrypt" or "unwrapKey" for private key imports
		);
	},

	//Encrypt symmetric key with receivers public key
	wrapKey: function(symkey, pubkey){
		return window.crypto.subtle.wrapKey(
		    "raw", //the export format, must be "raw" (only available sometimes)
		    symkey, //the key you want to wrap, must be able to fit in RSA-OAEP padding
		    pubkey, //the public key with "wrapKey" usage flag
		    {   //these are the wrapping key's algorithm options
		        name: "RSA-OAEP",
		        hash: {name: "SHA-1"},
		    }
		)
		.then(function(wrapped){
		    //returns an ArrayBuffer containing the encrypted data
		    console.log("WrappedKey", wrapped);
		    km.wrapped = new Uint8Array(wrapped);
		    return km.wrapped;
		})
		.catch(function(err){
    		$('#progerror').html('Key encryption error');
		    console.error(err);
		});
	},

	//Decrypt symmetric key with own private key
	unwrapKey: function(wrapkey, privkey){
		return window.crypto.subtle.unwrapKey(
		    "raw", //the import format, must be "raw" (only available sometimes)
		    wrapkey, //the key you want to unwrap
		    privkey, //the private key with "unwrapKey" usage flag
		    {   //these are the wrapping key's algorithm options
		        name: "RSA-OAEP",
		        modulusLength: 2048,
		        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
		        hash: {name: "SHA-1"},
		    },
		    {   //this what you want the wrapped key to become (same as when wrapping)
		        name: "AES-GCM",
		        length: 256
		    },
		    true, //whether the key is extractable (i.e. can be used in exportKey)
		    ["encrypt", "decrypt"] //the usages you want the unwrapped key to have
		)
		.then(function(key){
		    //returns a key object
		    //console.log(key);
		    km.symmetric=key;
		    return key;
		})
		.catch(function(err){
    		$('#progerror').html('Decrypt Key error');
		    console.error(err);
		});
	},

	//Store a public key as keydata
	storeKey: function(email, key){
		if(email in this.keys){
			console.assert(false, "Error! Email is already associated with a key! This is a security breach!", {action: protocol.ERR_REJECT});
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
	
	//Encrypt data by using symmetric key
	encryptData: function(key, data, iv){
		console.log("Encrypting: ", data, key);
		if(key == null){
    		$('#progerror').html('Encryption error');
			console.error("There is no key associated with this address!!!");
		}
		return window.crypto.subtle.encrypt(
			{
					name: "AES-GCM",
					iv: iv,
					//label: Uint8Array([...]) //optional
			},
			key, //from generateKey or importKey above
			data //ArrayBuffer of data you want to encrypt
		).catch(function (err){
			console.log(err);
			console.log(err.name);
			console.log(err.message);
			console.log(err.number);
    		$('#progerror').html('Encryption error');

		});
	},

	//Decrypt data by using symmetric key
	decryptData: function(data, iv){
		console.log("IV, Symmetrickey, data:", km.iv, km.symmetric, data);
		return window.crypto.subtle.decrypt(
			{
					name: "AES-GCM",
					iv: iv,
					//label: Uint8Array([...]) //optional
			},
			km.symmetric,
			//this.key.privateKey, //from generateKey or importKey above
			data //ArrayBuffer of the data
		);
	},
	
	//getObjectData
	getObjectData: function (arg=true){
		//Erase session data
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
				writeToFile(write, cfPath+cfName, arg);
				//console.warn("Here: \n" + write);
				//TODO - encrypt data before returning!
		}).catch(function(err){
			//Error-handling just in case
    		$('#progerror').html('Writing keydata error');
			console.error(err);
		});
	}
};