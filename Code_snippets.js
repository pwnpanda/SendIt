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
--------------------------------------------------------------

var dict = {}
dict["key1"] = "val1";
dict["key2"] = "val2";
//Prints all key-value pairs
console.log(dict);
//Prints val2
console.log(dict["key2"]);
//Loops through all entries
for(key in dict){
  var value = dict[key];
  /* use key/value for intended purpose */
}

!("key" in obj) // true if "key" doesn't exist in object


Promise.all(array); /*Make a promise that fulfills when every item in the array fulfills, 
and rejects if (and when) any item rejects. Each array item is passed to 
Promise.resolve, so the array can be a mixture of promise-like objects and other 
objects. The fulfillment value is an array (in order) of fulfillment values. The 
rejection value is the first rejection value.*/
Promise.race(array);  /*Make a Promise that fulfills as soon as any item fulfills,
 or rejects as soon as any item rejects, whichever happens first.*/


----------------------------------------------------------------------------------------
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