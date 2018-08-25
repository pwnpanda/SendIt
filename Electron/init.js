//handle setupevents as quickly as possible
 const setupEvents = require('./installers/setupEvents')
 if (setupEvents.handleSquirrelEvent()) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
 }

var electron = require('electron'); // http://electron.atom.io/docs/api
var path = require('path');         // https://nodejs.org/api/path.html
var url = require('url');        // https://nodejs.org/api/url.html
var {app, BrowserWindow, Menu, ipcMain} = electron;
var fs = require('fs');
var path = require('path');

var window = null

// Wait until the app is ready
app.once('ready', function () {
  // Create a new window
  window = new BrowserWindow({
    // Set the initial width to 800px
    width: 800,
    // Set the initial height to 600px
    height: 600,
    // Set the default background color of the window to match the CSS
    // background color of the page, this prevents any white flickering
    backgroundColor: "#75B19F",
    frame: "false",
    // Don't show the window until it ready, this prevents any white flickering
    show: false,
    title: "Send It",
    icon: path.join(__dirname, 'Icon.png'),
  });

  //Start the correct type by reading previous settings!
  var dataPath = (electron.app || electron.remote.app).getPath('userData');
  var splitter = path.sep;
  var startServ='send_it.html';
  try{
    var buf = fs.readFileSync(dataPath + splitter + "config.conf", "utf8");
    //console.log(buf);
    buf=JSON.parse(buf);
    if(buf.server==''){
      startServ='send_it.html';
    }else{
      startServ='send_it_serv.html';
    }
    //console.log(startServ);
  }catch(err){
    console.log("Config-file error!", err);
  }

  // Load a URL in the window to the local index.html path
  window.loadURL(url.format({
    pathname: path.join(__dirname + '/resources/', startServ),
    protocol: 'file:',
    slashes: true
  }));

var template = [{
    submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
        { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
        { type: "separator" },
        { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
    ]}
];


  // Show window when page is ready
  window.once('ready-to-show', function () {
    window.maximize();
    /* todo uncomment */
    if (process.platform === 'darwin') { 
      Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    }else{
      window.setMenu(null);
    }/**/
    window.show()
  })
})

app.on('window-all-closed', function() {
    if (process.platform != 'darwin') {
        app.quit();
    }
});
/*
// SSL/TSL: this is the self signed certificate support
//TODO remove in productioN!!!
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // On certificate error we disable default behaviour (stop loading the page)
  // and we then say "it is all fine - true" to the callback
  event.preventDefault();
  callback(true);
}); */

//If settings change, load the new html
ipcMain.on('server', function (event, arg) {
  console.log(arg);
  var filename;
  if(arg==true){
      filename = 'send_it_serv.html';
    }else{
      filename = 'send_it.html';
    }

  // Load a URL in the window to the local index.html path
  window.loadURL(url.format({
    pathname: path.join(__dirname + '/resources/', filename),    
    protocol: 'file:',
    slashes: true
  }));
});