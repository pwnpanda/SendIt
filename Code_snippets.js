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

--------------------------------

Authenticate -> OfferShare





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