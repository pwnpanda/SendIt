/*
File for calling correct order of keyManager methods.
Also for checking for crypto-file and managing other semi-related crypto-things

TODO - Fix later!
*/


var fs = require('fs');

//Hits, but is supposed to be implemented - WHY!?!
if (!window.crypto || !window.crypto.subtle) {
    console.error("Your current browser does not support the Web Cryptography API! This page will not work.");
}

function encrypt(key, data){
  var pubkey = key;
  var encryData;
  //if we have the receivers key in the list:
  if(pubkey != null){
    console.log('Other end has associated key!', pubkey);
    data = convertStringToArrayBufferView(JSON.stringify(data));
    console.log(data);
    var iv = window.crypto.getRandomValues(new Uint8Array(12));
    //Create symmetric key  
    createSymmKey(iv)
    .then(function(key){
      //Encrypt with symmetric key
      return encryptData(key, data)
    })
    //returns an ArrayBuffer containing the encrypted data
    .then(function(encrypted){
      encryData = new Uint8Array(encrypted);
      console.info("Data encrypted: ", encryData);
      //Import other ends public key
      return importKey(pubkey, pubkey.key_ops)
    })
    .then(function(key){
      console.log("Received in next promise: ", key, encryData);
      pubkey=key;
      //encrypt (wrap) symmetric key with public key
      return wrapKey(key, pubkey);
    })
    .then(function(wrapKey){
      //Create object for sharing: iv, wrapped symmetric key amnd cipher
      var msg = {iv: iv, wrap: wrapKey, ciph: encryData};
      console.log("Object", msg);
      msg = JSON.stringify(msg);
      console.log("String", msg);
      return msg;
    })
    .catch(function(err){
      console.error(err);
    });

  } else {
    console.log('Other end has NO associated key!');
    km.encrypt = JSON.stringify(pc1.localDescription);
    showenc(km.encrypt);
  }
}

function decrypt(data){
  var pubkey = km.findKey(km.otherEnd);
  var decryData;
  //if we have the receivers key in the list:
  console.log('Data to decrypt/pass on: ', data);
  if(pubkey != null){
    //console.log('Other end has associated key!');
    data=JSON.parse(data);
    console.log("Parsed", data);
    var temp = Object.values(data.iv);
    km.iv = new Uint8Array(temp);
    temp = Object.values(data.wrap);
    decryData = new Uint8Array(temp);
    temp = Object.values(data.ciph);
    console.log(decryData);
    km.unwrapKey(decryData.buffer, (km.key).privateKey)
    .then(function(symKey){
      km.symmetric=symKey;
      console.log(symKey);
      return km.decryptData(new Uint8Array(temp));
    })
    .then(function(decrypted){
      //returns an ArrayBuffer containing the decrypted data
      console.warn("Data decrypted raw: ", new Uint8Array(decrypted));
      decryData = new Uint8Array(decrypted);
      decryData = convertArrayBufferViewtoString(decryData);
      console.log("Data decrypted: ", decryData);
      decryData = JSON.parse(decryData);
      setDescr(decryData, true);
    })
    .catch(function(err){
      console.error(err);
    });
  }else{
    console.log('Other end has NO associated key!');
    return JSON.parse(data);
  }
}


function decryptReply(data){
  var pubkey = km.findKey(km.otherEnd);
  var decryData;
  data = JSON.parse(data);
  console.log('Data to decrypt/pass on: ', data);

  if (pubkey != null){
    decryData = Object.values(data);
    console.log("1",decryData);
    decryData = new Uint8Array(decryData);
    console.log("2",decryData);
    km.decryptData(decryData)
    .then(function(decrypted){
      //returns an ArrayBuffer containing the decrypted data
      console.warn("Data decrypted raw: ", new Uint8Array(decrypted));
      decryData = new Uint8Array(decrypted);
      decryData = convertArrayBufferViewtoString(decryData);
      console.log("Data decrypted: ", decryData);
      decryData = JSON.parse(decryData);
      setDescr(decryData, false);
    })
    .catch(function(err){
      console.error(err);
    });
  }else{
      setDescr(data, false);
  }
}

function convertStringToArrayBufferView(str){
    var bytes = new Uint8Array(str.length);
    for (var iii = 0; iii < str.length; iii++) 
    {
        bytes[iii] = str.charCodeAt(iii);
    }

    return bytes;
}   

function convertArrayBufferViewtoString(buffer){
    var str = "";
    for (var iii = 0; iii < buffer.byteLength; iii++) 
    {
        str += String.fromCharCode(buffer[iii]);
    }

    return str;
}

function createSymmKey(){
    return window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,  
    },
    true,
    ["encrypt", "decrypt"]
    ).then(function(key){
      //returns a keypair object
      console.log("Key created!", key);
      km.symmetric = key;
      return key;
    })
    .catch(function(err){
        console.error(err);
    });
  };


  //Exports the keydata from a public key object
  //Taken from: https://github.com/diafygi/webcrypto-examples#rsa-oaep
  function exportKey(eKey) {
    return window.crypto.subtle.exportKey(
      "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
      eKey //can be a publicKey or privateKey, as long as extractable was true
    );
  };

  //Returns the public key-object converted from keydata
  function importKey(key, use){
    //Taken from: https://github.com/diafygi/webcrypto-examples#rsa-oaep
    return window.crypto.subtle.importKey(
      "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
      key,
      {   //these are the algorithm options
          name: "RSA-OAEP",
          hash: {name: "SHA-512"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
      },
      true, //whether the key is extractable (i.e. can be used in exportKey)
      use //"encrypt" or "wrapKey" for public key import or
                  //"decrypt" or "unwrapKey" for private key imports
    );
  };

  //Encrypt symmetric key with receivers public key
  function wrapKey(symkey, pubkey){
    return window.crypto.subtle.wrapKey(
        "raw", //the export format, must be "raw" (only available sometimes)
        symkey, //the key you want to wrap, must be able to fit in RSA-OAEP padding
        pubkey, //the public key with "wrapKey" usage flag
        {   //these are the wrapping key's algorithm options
            name: "RSA-OAEP",
            hash: {name: "SHA-512"},
        }
    )
    .then(function(wrapped){
        //returns an ArrayBuffer containing the encrypted data
        console.log("WrappedKey", wrapped);
        km.wrapped = new Uint8Array(wrapped);
        return km.wrapped;
    })
    .catch(function(err){
        console.error(err);
    });
  };

  //Decrypt symmetric key with own private key
  function unwrapKey(wrapkey, privkey){
    return window.crypto.subtle.unwrapKey(
        "raw", //the import format, must be "raw" (only available sometimes)
        wrapkey, //the key you want to unwrap
        privkey, //the private key with "unwrapKey" usage flag
        {   //these are the wrapping key's algorithm options
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: {name: "SHA-512"},
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
        console.log(key);
        km.symmetric=key;
        return key;
    })
    .catch(function(err){
        console.error(err);
    });
  };

  
  //Encrypt data by using symmetric key
  function encryptData(key, data){
    console.log("Encrypting: ", data, key);
    if(key == null){
      console.error("There is no key associated with this address!!!");
    }
    return window.crypto.subtle.encrypt(
      {
          name: "AES-GCM",
          iv: km.iv,
          //label: Uint8Array([...]) //optional
      },
      key, //from generateKey or importKey above
      data //ArrayBuffer of data you want to encrypt
    ).catch(function (err){console.log(err);console.log(err.name);console.log(err.message);console.log(err.number);});
  },

  //Decrypt data by using symmetric key
  function decryptData(data){
    console.warn(km.iv, km.symmetric, data);
    return window.crypto.subtle.decrypt(
      {
          name: "AES-GCM",
          iv: km.iv,
          //label: Uint8Array([...]) //optional
      },
      km.symmetric,
      //this.key.privateKey, //from generateKey or importKey above
      data //ArrayBuffer of the data
    );
  };

module.exports={
  encrypt: encrypt,
  decrypt: decrypt
};