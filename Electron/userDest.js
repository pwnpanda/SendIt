var electron = require('electron'); // http://electron.atom.io/docs/api
class userDest {
    constructor(){
	    this.userDataPath = (electron.app || electron.remote.app).getPath('userData');
    }
 	get(){
    	return this.userDataPath;
 	}
}

module.exports = userDest;