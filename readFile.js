var files= '';

// Setup the dnd listeners.
  var dropZone = document.getElementById('drop_zone');
  dropZone.addEventListener('dragover', handleDragOver, false);
  dropZone.addEventListener('drop', handleFileSelect, false);

function handleFileSelect(evt) {
  evt.stopPropagation();
  evt.preventDefault();

  files = evt.dataTransfer.files; // FileList object.

  var output = [];
  nrOfFiles = files.length;
  for(var i=0, f;f=files[i];i++){
    // files is a FileList of File objects. List some properties.
    output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
                  f.size + ' bytes','</li>');
   

   /* FOR ILLUSTRATION PURPOSES
    var reader = new FileReader();
    reader.onloadend = function(e) {
      console.log(this.result);
    };
     
    reader.readAsText(f);
    */
  }
  document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
}

function handleDragOver(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}