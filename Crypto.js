/*
File for calling correct order of keyManager methods.
Also for checking for crypto-file and managing other semi-related crypto-things

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