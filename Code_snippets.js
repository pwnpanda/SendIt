
https://github.com/tskimmett/rtc-pubnub-fileshare/blob/master/connection.js
-------------------------------------------------------------
 this.fileManager = new FileManager((IS_CHROME ? 800 : 50000));


var self = this;
      this.filePicked = function (e) {
        var file = self.fileInput.files[0];
        if (file) {
          var mbSize = file.size / (1024 * 1024);
          if (mbSize > MAX_FSIZE) {
            alert("Due to browser memory limitations, files greater than " + MAX_FSIZE + " MiB are unsupported. Your file is " + mbSize.toFixed(2) + " MiB.");
            var newInput = document.createElement("input");
            newInput.type = "file";
            newInput.className = "share";
            self.element.replaceChild(newInput, self.fileInput);
            self.fileInput = newInput;
            self.registerUIEvents();
            return;
          }
          var reader = new FileReader();
          reader.onloadend = function (e) {
            if (reader.readyState == FileReader.DONE) {
              self.fileManager.stageLocalFile(file.name, file.type, reader.result);
              self.offerShare();
            }
          };
          reader.readAsArrayBuffer(file);
        }
      };


      -----------------
      offerShare: function () {
      console.log("Offering share...");
      this.isInitiator = true;

      this.connected = true;
      var msg = {
        uuid: this.uuid,
        target: this.id,
        fName: this.fileManager.fileName,
        fType: this.fileManager.fileType,
        nChunks: this.fileManager.fileChunks.length,
        action: protocol.OFFER
      };

      this.pubnub.publish({
        channel: protocol.CHANNEL,
        message: msg
      });
    },

    answerShare: function () {
      console.log("Answering share...");
      // Tell other person to join the P2P channel
      this.pubnub.publish({
        channel: protocol.CHANNEL,
        message: {
          uuid: this.uuid,
          target: this.id,
          action: protocol.ANSWER
        }
      });
      this.p2pSetup();
      this.fileManager.requestChunks();
    },

    send: function (data) {
      this.pubnub.publish({
        user: this.id,
        message: data
      });
    },

    packageChunk: function (chunkId) {
      return JSON.stringify({
        action: protocol.DATA,
        id: chunkId,
        content: Base64Binary.encode(this.fileManager.fileChunks[chunkId])
      });
    },

    statusBlink: function (on) {
      var indicator = $(this.element.querySelector(".status"));
      if (!on) {
        clearInterval(this.blink);
        indicator.removeAttr("style");
        return;
      }
      var white = true;
      this.blink = setInterval(function () {
        indicator.css("background-color", (white ? "#EEEBE4" : "limegreen"));
        white = !white;
      }, 700);
    },

    handleSignal: function (msg) {
      if (msg.action === protocol.ANSWER) {
        console.log("THE OTHER PERSON IS READY");
        this.p2pSetup();
      }
      else if (msg.action === protocol.OFFER) {
        // Someone is ready to send file data. Let user opt-in to receive file data
        this.getButton.removeAttribute("disabled");
        this.cancelButton.removeAttribute("disabled");
        $(this.fileInput).addClass("hidden");

        this.fileManager.stageRemoteFile(msg.fName, msg.fType, msg.nChunks);

        this.getButton.innerHTML = "Get: " + msg.fName;
        this.statusBlink(true);
      }
      else if (msg.action === protocol.ERR_REJECT) {
        alert("Unable to communicate with " + this.id);
        this.reset();
      }
      else if (msg.action === protocol.CANCEL) {
        alert(this.id + " cancelled the share.");
        this.reset();
      }
    }