var path = require('path');
var fs = require('fs');

//Variable to handle the files we're staging
var files;
/*
Re-enable later for dropping files in stead of loading from folder
// Setup the dnd listeners.
var dropZone = document.getElementById('drop_zone');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);

function handleFileSelect(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	fileReady = true;
	isReady();

	files = evt.dataTransfer.files; // FileList object.

	var output = [];
	nrOfFiles = files.length;

	for(var i=0, f;f=files[i];i++){
		// files is a FileList of File objects. List some properties.
		output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
		Math.ceil((f.size / 1024)) + ' kbytes','</li>');
	}
	
	document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
}

function handleDragOver(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}
*/
function loadFiles(){
	var output = [];
	try{
		//Read files in folder
		var items = fs.readdirSync(ulPath)
		if(items.length == 0){
			alert("No files to send! Make sure there are files present in: " + ulPath)
			console.error("No files to send!");
			try{
				activedc.close();
				pc1.close();
				pc2.close();
				pc1 = null;
				pc2 = null;
				console.info('Closed peer connections');
			}catch(e){
				console.log(e);
			}
			reset();
			window.location.href = "";
		}
		files = items;
		nrOfFiles = items.length;
		fmArray = new Array(nrOfFiles);
		for (var i=0; i<items.length; i++) {
			//Full file path
	        var file = ulPath + path.sep + items[i];
	 		var name = items[i].split('.');
	 		var type = "."+name[1];
	 		name = name[0];
	 		console.log("File: " + file + " Name: " + name + " Type: " + type);
	        //Need array of filemanagers, one for each file!
			fmArray[i] = new FileManager(maxChunkSize);
			registerFileEvents(fmArray[i]);

	        console.log("Start: " + file);
	        var stats = fs.statSync(file);
	        console.log(stats["size"]);
			var mbSize = Math.ceil(stats["size"] / (1024 * 1024));
			//Todo - handle only one file exception
	        if (mbSize > MAX_FSIZE) {
				console.warn("Due to browser memory limitations, files greater than " + MAX_FSIZE + " MiB are unsupported. Your file is " + mbSize.toFixed(2) + " MiB.");
				var error = document.querySelector("#Error");
				error.innerHTML = "File " + items[i] + " is to big for the browser! It cannot be sent!";
				throw new Error("File to big! Stop execution");
			}

	        // files is a FileList of File objects. List some properties.
			output.push('<li><strong>', escape(items[i]), '</strong> ',
			Math.ceil((stats["size"] / 1024)) + ' kbytes','</li>');
	    }
		document.getElementById('list').innerHTML = '<ul style="list-style-type: none;">' + output.join('') + '</ul>';
    }catch(e){
    	throw new Error(e);
    }
}

function stageFiles(){
	for (var i=0; i<files.length; i++) {
	    var file = ulPath + path.sep + files[i];
	 	var name = files[i].split('.');
	 	var type = "."+name[1];
	 	name = name[0];
	 	console.log("File: " + file + " Name: " + name + " Type: " + type);
	    
	    console.log("Read file in!");
	   	try{
		    var buf = fs.readFileSync(file);
		    fmArray[i].stageLocalFile(name, type, buf);
		}catch(e){
			console.log('Error', e.stack);
		}   	
    };
	offerShare();
}
/* Old way of staging files - used in manual addition - Add again later!
//https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/filetransfer/js/main.js - INFO
//Initiate, stage files and call method to create a offer to share files
function stageFiles() {
	if(nrOfFiles == 0){
		console.error("Error! No files to send");
		throw new Error("No files to send!");
	}

	fmArray = new Array(nrOfFiles);
	for(var i=0, f;f=files[i];i++){
		console.log("Creates fms for sending!");
		//Use filemanager to stage all the local files and keep them organized
		if(f){
			console.info('File being staged ' + [f.name, f.size, f.type,
			f.lastModifiedDate].join(' '));
			//Need array of filemanagers, one for each file!
			fmArray[i] = new FileManager(maxChunkSize);
			registerFileEvents(fmArray[i]);

			var mbSize = Math.ceil(f.size / (1024 * 1024));
			//TODO - handle if one file is too big
			if (mbSize > MAX_FSIZE) {
				console.warn("Due to browser memory limitations, files greater than " + MAX_FSIZE + " MiB are unsupported. Your file is " + mbSize.toFixed(2) + " MiB.");
				var error = document.querySelector("#Error");
				error.innerHTML = "File " + f.name + " is to big for the browser! It cannot be sent!";
				throw new Error("File to big! Stop execution");
			}
		} else{
			console.error("File error! No file or no size!!!");
			closeDataChannels();
			throw new Error("File does not exist!");
		}
	}
	readFileInfo(0);
}
//Belongs to the above function - Heavily altered from original code
function readFileInfo(x){
	console.log("Cur " + x + " Tot " + nrOfFiles);
	if (x >= nrOfFiles) {
		offerShare();
		return;
	}
	var f = files[x];
	var reader = new FileReader();
		reader.onloadend = function (e) {
			if(reader.readyState == FileReader.DONE){
				console.log(f.name);
				fmArray[x].stageLocalFile(f.name, f.type, reader.result);
				readFileInfo(x+1);
			}
		};   
		reader.readAsArrayBuffer(f);
}
*/
//Write this data to file
//https://stackoverflow.com/a/32858416
function writeToFile(data, dir, show=true){
	console.log(dir);
  	ensureDirectoryExistence(dir);
  	fs.writeFile(dir, data, function(err) {
	    if(err) {
	        console.log(err);
	    } else {
	    	if(show){
	        	alert("The file was saved: \n" + path.parse(dir).base);
	        }
	    }
    })
}

//Makes sure directory exists
//https://stackoverflow.com/questions/13542667/create-directory-when-writing-to-file-in-node-js
function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}