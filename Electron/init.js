//handle setupevents as quickly as possible
 const setupEvents = require('./installers/setupEvents')
 if (setupEvents.handleSquirrelEvent()) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
 }

var electron = require('electron'); // http://electron.atom.io/docs/api
var path = require('path');         // https://nodejs.org/api/path.html
var url = require('url');        // https://nodejs.org/api/url.html
var {app, BrowserWindow, Menu} = electron;

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

  // Load a URL in the window to the local index.html path
  window.loadURL(url.format({
    pathname: path.join(__dirname + '/resources/', 'send_it.html'),
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
    if (process.platform === 'darwin') { 
      Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    }else{
      window.setMenu(null);
    }
    window.show()
  })
})

app.on('window-all-closed', function() {
    if (process.platform != 'darwin') {
        app.quit();
    }
})