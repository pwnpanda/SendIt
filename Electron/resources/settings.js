var path = require('path');
var fs = require('fs');
const get = require('../userDest.js');

var myMail;
var defPath = new get();
defPath = defPath.get();
var splitter = path.sep;
cfPath=defPath+splitter+'Crypto'+splitter;
cfName='crypto.crp';
dlPath=defPath+splitter+"Received"+splitter;
ulPath=defPath+splitter+"Send"+splitter;

function curSet(){
	var cfPrnt = cfPath+cfName;
	var string = "<ul><h4> Cryptography file:</h4>" + cfPrnt +" </ul> <ul><h4> Download path:</h4>" + dlPath + " </ul> <ul><h4> Upload path:</h4>" + ulPath + " </ul>";
	$('#curSet').html(string);
}

function readConfig(){
	try{
		var buf = fs.readFileSync(defPath + splitter + "config.conf", "utf8");
		//console.log(buf);
		buf=JSON.parse(buf);
		//console.log(buf);
		cfName = buf.cfName;
		cfPath = buf.cfPath;
		dlPath = buf.dlPath;
		ulPath = buf.ulPath;
		myMail = buf.myMail;

		$("#myMail").val(myMail);

	}catch(err){
		console.log("No config-file found!", err);
		saveConf(true);
	}
}

function keyManagement(){
	//Key management in settings
	$('#cryptoOpt').html('');
	var reset = $('<button/>', {
				text: "Remove crypto-file!",
				id: "removeCryptoBtn",
				click: removeCrypto
			});
	$('#cryptoOpt').append(reset);
	$('#cryptoOpt').append("<br>");
	var html;	
	if( existCrypto() ){
		//No foreign keys
		if($.isEmptyObject(km.keys)){
			$('#cryptoOpt').append('<h4 style="color: red;">No Cryptography information to display!</h4>');
		}else{
			//Foreign keys exist
			var txt = "<h4>Remove keys for:</h4>"
			$('#cryptoOpt').append(txt);
			for(email in km.keys){
				var btn;
				btn=$('<button/>', {
					text: email,
					id: email,
					click: removeEntry
				});
				$('#cryptoOpt').append(btn);
				$('#cryptoOpt').append("<br>");
			}
		}
	//No cryptofile
	} else {
		$('#cryptoOpt').append('<h4 style="color: red;">No Cryptography information to display!</h4>');
	}
}

function settings(){
	readConfig();
	curSet();
	keyManagement();

	$('#formInput input').on('change', function() {
		if( ($('input[name=in]:checked', '#formInput').val()) == "Manual"){
			$('#opt').show();
		} else {
			$('#opt').hide();
			cfPath=defPath+splitter+'Crypto'+splitter;
			cfName='crypto.crp';
			dlPath=defPath+splitter+"Received"+splitter;
			ulPath=defPath+splitter+"Send"+splitter;
		}
	});

	$('#formCrypt input').on('change', function() {
		if( ($('input[name=in]:checked', '#formCrypt').val()) == "Manual"){
			$('#txtCryptoFile').show();
		} else{
			$('#txtCryptoFile').hide();	
			cfPath=defPath+splitter+'Crypto'+splitter;
			cfName='crypto.crp';
		}
	});

	$('#formDl input').on('change', function() {
		if( ($('input[name=in]:checked', '#formDl').val()) == "Manual"){
			$('#setDlLoc').show();
		} else{
			$('#setDlLoc').hide();
			dlPath=defPath+splitter+"Received"+splitter;
		}
	});

	$('#formUl input').on('change', function() {
		if( ($('input[name=in]:checked', '#formUl').val()) == "Manual"){
			$('#setUlLoc').show();
		} else{
			$('#setUlLoc').hide();
			ulPath=defPath+splitter+"Send"+splitter;

		}
	});

	$('#resetConfig').click(function () {
		cfPath=defPath+splitter+'Crypto'+splitter;
		cfName='crypto.crp';
		dlPath=defPath+splitter+"Received"+splitter;
		ulPath=defPath+splitter+"Send"+splitter;
		myMail='';
		$("#myMail").val(myMail);

		saveConf();
	});

	$('#storeConfBtn').click(function () {
		//Save config.conf
		if($("#myMail").val() == ''){
			alert("Please fill in an email address!");
			//TODO bug!
		}else{
			saveConf();
			$("#showConfig").modal('hide');
		  	$('#createOrJoin').modal('show');
		}
		//return;
	});
}

function saveConf(init=false){
	myMail = $("#myMail").val();
	if(init && cfName == 'crypto.crp'){
		cfName = myMail+'.crp';
		console.log('Creating cfName for ' + myMail);
	}
	var data = {
			"cfName": cfName,
			"cfPath": cfPath,
			"dlPath": dlPath,
			"ulPath": ulPath,
			"myMail": myMail
	}
	console.log(data);
	writeToFile(JSON.stringify(data), defPath+splitter+'config.conf', !init);
	ensureDirectoryExistence(ulPath+"/.");
	if(!init){
		window.location.href = "";
	}else{
		alert("Please move or copy the files you want to send to: \n" + ulPath);
	}
}

function setCrypto(){
	cfPath = $("#cryptoFile")[0].files[0].path;
	console.log(cfPath);
	var info = path.parse(cfPath);
	cfPath = info.dir+splitter;
	cfName = info.base;
	console.log(cfPath + " " + cfName);
	readCrypto();
}
function setDownload(){
	dlPath = $("#downloadFolder")[0].files[0].path;
	console.log(dlPath);
}
function setUpload(){
	ulPath = $("#uploadFolder")[0].files[0].path;
	console.log(ulPath);
}
function setMail(mail){
	myMail = mail;
	console.log("Mail: "+mail);
}

function removeEntry(){
	let id=this.id;
	delete km.keys[id];
	alert("Removed key: " + id);
	km.getObjectData();
	window.location.href = "";

}
function removeCrypto(){
	//ADD CONFIRMATION WINDOW
	if( window.confirm("Are you sure you want to remove your cryptography file?") ){
		try{
			fs.unlinkSync(cfPath+cfName);
			alert("Cryptography file removed!");
		}catch(e){
			console.log(e);
		}
	}
}