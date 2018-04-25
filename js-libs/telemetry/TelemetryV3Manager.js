TelemetryV3Manager = Class.extend({
    _end: new Array(),
    _start: new Array(),
    _config: {},
     init: function() {
        console.info("TelemetryService Version 3 initialized..");
    },
    exitWithError: function(error) {
        var message = '';
        if (error) message += ' Error: ' + JSON.stringify(error);
        TelemetryServiceV3.exitApp();
    },
    getConfig: function(){
      var configData = TelemetryService._otherData || {};

      //Adding Details values
      configData['cdata'] = TelemetryService._correlationData;
      configData['env'] = configData.mode || "ContentPlayer";
      configData['uid'] = TelemetryService._user.uid || 'anonymous';
      configData['channel'] = configData.channel || 'in.ekstep';
      configData['object'] = { id: TelemetryService.getGameId(), type: 'Content', ver: TelemetryService.getGameVer()};
      configData["dispatcher"] = ("undefined" == typeof cordova) ? org.ekstep.contentrenderer.webDispatcher : org.ekstep.contentrenderer.deviceDispatcher;
      
      this._config = configData;
      return this._config;
    },
    start: function(id, ver, data) {
        if(id == undefined || ver == undefined || data == undefined) {
            console.error('Invalid start data');
            return;
        }
        // var deviceId = detectClient();

        this._end.push("END", {});
        this._start.push({id: id , ver : ver});
        var config = this.getConfig();
        var edata = {
          "type":  data.type || "content",
          "mode": data.mode || config.mode,
          "pageid": data.pageid || data.stageid
        }
        if(data.dspec){ 
          edata["dspec"] = data.dspec;
        }
        if(data.uaspec){ 
          edata["uaspec"] = data.uaspec;
        }
        if(data.loc){
          edata["loc"] = data.loc;
        }

        EkTelemetry.start(config, TelemetryService._gameData.id, ver, edata);
    },
    end: function(data) {
        if (this.telemetryStartActive()) {
            this._start.pop();
            var edata = {
              "type" : data.type || "content",
              "mode" : this._config['env'],
              "pageid" : data.pageid || data.stageid,
              "summary" : data.summary || [{"progress": data.progress || 50}]
            }            
            this._end.pop();
            EkTelemetry.end(edata);
        } else {
            console.warn("Telemetry service end is already logged Please log start telemetry again");
        }
    },
    interact: function(type, id, extype, eks, eid) {
        if(type == undefined || id == undefined) {
            console.error('Invalid interact data');
            return;
        }
        if (eks.optionTag)
            this.itemResponse(eks);
        var eksData = {
            "type": type,
            "subtype": eks.subtype ? eks.subtype : "",
            "id": id,
            "pageid": eks.stageId ? eks.stageId.toString() : "",
        }
        if(eks.extra){
          var extraObj ={
            "pos": (eks.extra && eks.pos) ? eks.pos : [],
            "values": (eks.extra && eks.values) ? data.values : []
          }
          eksData["extra"] = extraObj;
        }
        if(eks.target){
            eksData["target"] = eks.target;
        }
        if(eks.plugin) {
            eksData["plugin"] = eks.plugin;
        }
        EkTelemetry.interact(eksData);
    },
    assess: function(qid, subj, qlevel, data) {
        var maxscore;
        subj = subj ? subj : "";
        if (data) {
            maxscore = data.maxscore || 1;
        }
        qlevel = qlevel ? qlevel : "MEDIUM";
        if (qid) {
            var eks = {
                qid: qid,
                maxscore: maxscore ,
                params: []
            };
            //return new TelemetryEvent("OE_ASSESS", "2.1", eks, TelemetryService._user, TelemetryService._gameData, TelemetryService._correlationData, TelemetryService._otherData);
        } else {
            console.error("qid is required to create assess event.", qid);
            // TelemetryService.logError("OE_ASSESS", "qid is required to create assess event.")
            return new InActiveEvent();
        }
    },
    assessEnd: function(eventObj, data) {
        if (eventObj) {
            var v3questionItem = {
                id: eventObj.event.edata.eks.qid,
                maxscore: eventObj.event.edata.eks.maxscore,
                exlength: 0,
                params: data.params || eventObj.event.edata.eks.params || [],
                uri: data.uri || "",
                title: data.qtitle || data.title,
                mmc: data.mmc || "",
                mc: data.mc || ""
            }
            if(data.qdesc || data.desc){
                v3questionItem.desc =  data.qdesc.substr(0,140) || data.desc.substr(0,140);
            }else{
                v3questionItem.desc = "";
            }
            var v3questionData = {
                item: v3questionItem,
                index: data.qindex || data.index || 0,
                pass: data.pass ? 'Yes' : 'No',
                score: data.score || (data.pass == 'Yes' ? 1 : 0),
                resvalues: data.res || data.resvalues || [],
                duration: Math.round((getCurrentTime() - eventObj.startTime ) / 1000)
            }
            EkTelemetry.assess(v3questionData);
        } else {
            console.error("question id is required to create assess event.");
            // TelemetryService.logError("OE_ASSESS", "qid is required to create assess event.")
            return new InActiveEvent();
        }

    },
    error: function(data) {
        var errorData = {
            err: data.err,
            errtype: data.type || data.errtype,
            stacktrace: data.stacktrace || "",
            pageid: data.stageId || ""
        }
        if(data.object) {
            errorData["object"] = data.object;
        }
        if(data.plugin) {
            errorData["plugin"] = data.plugin;
        }
        EkTelemetry.error(errorData);
    },
    interrupt: function(type, id, eid) {
        var interruptData = {
            "type": type,
            "pageid": id || '',
        };
        EkTelemetry.interrupt(interruptData);
    },
    exitApp: function() {
        setTimeout(function() {
            navigator.app.exitApp();
        }, 5000);
    },
    navigate: function(stageid, stageto, data) {
        var eksData = {
          "type": (data && data.type) ? data.type : "workflow" ,
          "pageid": stageto,
          "uri": (data && data.uri) ? data.uri : ""
        }
        if (stageid != undefined) {
            EkTelemetry.impression(eksData);
        } else {
            console.error('Invalid impression data');
            return;
        }
    },
    itemResponse: function(data) {
        var target = (data.target) ? data.target : { 
            "id": data.itemId || "unknown_id",
            "ver": "1.0",
            "type": "Plugin"
        };
        var optionTag;
        switch (data.optionTag) {
            case 'MCQ':
                optionTag = "CHOOSE"
                break;
            case 'FTB':
                optionTag = "INPUT"
                break;
            case 'MTF':
                optionTag = "MATCH"
                break;
        }
        var responseData = {
            target: target,
            type: optionTag,
            values: _.isEmpty(data.res) ? [] : data.res
        }
        EkTelemetry.response(responseData);
    },
    sendFeedback: function(data) {
        EkTelemetry.feedback(data);
    },
    telemetryStartActive: function() {
        return (!_.isEmpty(this._start));
    },
    xapi: function(data) {
        var xdata = {
            type: data.type || "",
            data: data
        }
        EkTelemetry.exdata(data);
    },
    hasRequiredData: function(data, mandatoryFields) {
        var isValid = true;
        mandatoryFields.forEach(function(key) {
            if (!data.hasOwnProperty(key)) isValid = false;
        });
        return isValid;
    }
})