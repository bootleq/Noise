(function(){

  const Cc = Components.classes;
  const Ci = Components.interfaces;

  var
    treeData = [],
    treeView,
    isNoiseEnabled,
    stringBundle,
    basePath,
    isInstantApply = false,
    notApplyIcon;

  var NoisePrefs = {

    init: function()
    {
      this.mappingsTree = document.getElementById("mappingsTree");
      this.findbar = treeFindbar;

      isNoiseEnabled = document.getElementById("check-prefs-enabled");
      stringBundle = document.getElementById("noise-string-bundle");

      treeData = Noise.mappings;
      treeView =  new CustomTreeView();
      this.mappingsTree.view = treeView;
      this.dragDropObserver = treeDragDropObserver;

      basePath = Noise.base;
      isInstantApply = document.documentElement.instantApply;
      notApplyIcon = document.getElementById("icon-not-apply");
    },

    accept: function()
    {
      this.saveToRdf();

      var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
      var enumerator = wm.getEnumerator("navigator:browser");
      while(enumerator.hasMoreElements()) {
        var win = enumerator.getNext();
        win.Noise.setBase(basePath);
        win.Noise.reset();
      }
    },

    exportSetting: function()
    {
      var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
      var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
      if( !prompts.confirm(null, stringBundle.getString("settings_title"), stringBundle.getString("settings_export_confirm")) ) return;
      fp.init(window, null, fp.modeSave);
      fp.defaultString='noise-mappings';
      fp.defaultExtension='rdf';
      fp.appendFilter(".rdf","*.rdf");
      var rv = fp.show();
      if (rv == fp.returnOK || rv == fp.returnReplace) {
        if (fp.file.exists()) {fp.file.remove(true);}
        var oldfile = Noise.getRdfFile();
        try {
          oldfile.copyTo( fp.file.parent, fp.file.leafName );
          prompts.alert(null, stringBundle.getString("settings_title"), stringBundle.getString("settings_export_done"));
        }
        catch(e) {
          prompts.alert(null, stringBundle.getString("settings_title"), stringBundle.getString("settings_export_failed"));
          dump('Noise export: ' + e);
        }
      }
    },

    importSetting: function()
    {
      var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
      var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
      fp.init(window, null, fp.modeOpen);
      fp.defaultString='noise-mappings';
      fp.defaultExtension='rdf';
      fp.appendFilter(".rdf","*.rdf");
      var rv = fp.show();
      if (rv == fp.returnOK || rv == fp.returnReplace) {
        try {
          this.mappingsTree.view = null;
          treeView = null;
          treeData = Noise.loadRdf( fp.file );
          treeView =  new CustomTreeView();
          this.mappingsTree.view = treeView;
          prompts.alert(null, stringBundle.getString("settings_title"), stringBundle.getString("settings_import_done"));
          if(isInstantApply) notApplyIcon.hidden = false;
        }
        catch(e) {
          prompts.alert(null, stringBundle.getString("settings_title"), stringBundle.getString("settings_import_failed"));
          dump('Noise import: ' + e);
        }
      }
    },

    defaultSetting: function()
    {
      var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
      if( !prompts.confirm(null, stringBundle.getString("settings_title"), stringBundle.getString("settings_default_confirm")) ) return;
      try {
        this.mappingsTree.view = null;
        treeView = null;
        treeData = Noise.loadRdf( Noise.getRdfFile('default') );
        treeView =  new CustomTreeView();
        this.mappingsTree.view = treeView;
        prompts.alert(null, stringBundle.getString("settings_title"), stringBundle.getString("settings_default_done"));
        if(isInstantApply) notApplyIcon.hidden = false;
      }
      catch(e) {
        prompts.alert(null, stringBundle.getString("settings_title"), stringBundle.getString("settings_default_failed"));
        dump('Noise import: ' + e);
      }
    },

    doCommand: function(aCommand)
    {
      switch (aCommand) {
        case "cmd_add_sound":
          var idx = this.mappingsTree.currentIndex;
          if(idx<0) idx=treeData.length;
          var ret = {type:1, name:stringBundle.getString("item_unnamed"), cmd:'', se:'beep', accepted:false, base:basePath};
          document.documentElement.openSubDialog("edit.xul", "resizable=yes", ret);
          if( ret.accepted ) {
            var newItem = {name:ret.name, cmd:ret.cmd, type:ret.type, se:ret.se};
            treeView.insertItemAt(newItem, idx);
            treeData[idx]['urn'] = "";
            treeData[idx]['enable'] = true;
            treeView.update();
            basePath = ret.base;
          }
        break;

        case "cmd_add_separator":
          var idx = this.mappingsTree.currentIndex;
          if(idx<0) idx=treeData.length;
          var ret = {type:'0', name:'', accepted:false, base:basePath};
          document.documentElement.openSubDialog("edit.xul", "resizable=yes", ret);
          if( ret.accepted ) {
            var newItem = {urn:'', type:ret.type, name:ret.name};
            treeView.insertItemAt(newItem, idx);
            treeView.update();
            basePath = ret.base;
          }
        break;

        case "cmd_duplicate_sound":
          var idx = this.mappingsTree.currentIndex;
          if(idx<0) idx=treeData.length;
          var newItem = {type:treeData[idx]['type'], name:treeData[idx]['name'], cmd:treeData[idx]['cmd'], se:treeData[idx]['se'], enable:treeData[idx]['enable'], urn:''};
          treeView.insertItemAt(newItem, idx);
          treeView.update();
        break;

        case "cmd_edit_sound":
          var idx = this.mappingsTree.currentIndex;
          if(idx<0)return;
          var ret = {
            type: treeData[idx]['type'],
            name: treeData[idx]['name'],
            cmd: treeData[idx]['cmd'],
            se: treeData[idx]['se'],
            accepted: false,
            base:basePath
          };
          document.documentElement.openSubDialog("edit.xul", "resizable=yes", ret);
          treeData[idx]['name'] = ret.name;
          treeData[idx]['cmd'] = ret.cmd;
          treeData[idx]['type'] = ret.type;
          treeData[idx]['se'] = ret.se;
          treeView.update();
          basePath = ret.base;
        break;

        case "cmd_play_sound":
          var idx = this.mappingsTree.currentIndex;
          if(idx<0)return;
          var file = this.mappingsTree.view.getCellText(idx, this.mappingsTree.columns[2]);
          try {
            if( isNoiseEnabled.checked ) {
              if(file=='beep') Noise.player.beep();
              else Noise.player.play( Noise.getSound(file, basePath) );
            }
            document.getElementById('cmd_play_sound').setAttribute('disabled',false);
          } catch(e) {
            document.getElementById('cmd_play_sound').setAttribute('disabled',true);
          }
        break;

        case "cmd_toggle_enabled":
          var idx = this.mappingsTree.currentIndex;
          if(idx<0)return;
          treeData[idx]['enable'] == false
            ? treeData[idx]['enable'] = true
            : treeData[idx]['enable'] = false;
          document.getElementById('cmd_toggle_enabled').setAttribute(
            'label', treeData[idx]['enable']==true ? stringBundle.getString("item_disabled") : stringBundle.getString("item_enabled")
          );
          treeView.update();
        break;

        case "cmd_remove_sound":
          var idx = this.mappingsTree.currentIndex;
          if (idx<0) {
            return;
          }
          treeView.removeItemAt(idx);
        break;

        default: return;
      }
    },

    handleTreeEvent: function(event)
    {
      if (event.type == "dblclick") {
        if (event.target.localName == "treechildren") {
          this.doCommand("cmd_edit_sound");
        }
      } else if (event.type == "keypress") {
        switch (event.which) {
          case event.DOM_VK_RETURN:
            this.doCommand("cmd_edit_sound");
            break;

          case event.DOM_VK_SPACE:
            this.doCommand("cmd_toggle_enabled");
            break;

          default: return;
        }
        event.preventDefault();
      } else if (event.type == "select") {
        var idx = this.mappingsTree.currentIndex;
        if (idx<0) {
          return;
        }
        document.getElementById('cmd_toggle_enabled').setAttribute(
          'label', treeData[idx]['enable']==true ? stringBundle.getString("item_disabled") : stringBundle.getString("item_enabled")
        );
        var isSeparator = (treeData[idx]['type'] == 0);
        document.getElementById('cmd_play_sound').setAttribute('disabled',isSeparator);
        document.getElementById('cmd_toggle_enabled').setAttribute('disabled',isSeparator);
        document.getElementById('cmd_edit_sound').setAttribute('disabled',isSeparator);
        document.getElementById('cmd_remove_sound').setAttribute('disabled',false);
      }
    },

    saveToRdf: function()
    {
      var [ RDFC, RDFCUtils, RDF, dsource ] = Noise.initRdf();

      // 清空 Seq
      var elems = RDFC.GetElements();
      while(elems.hasMoreElements()) {
        var elem = elems.getNext();
        var arcs = dsource.ArcLabelsOut(elem);
        while(arcs.hasMoreElements()) {
          var arc = arcs.getNext();
          var targets = dsource.GetTargets(elem, arc, true);
          while (targets.hasMoreElements()) {
            var target = targets.getNext();
            dsource.Unassert(elem, arc, target, true);
          }
        }
        RDFC.RemoveElement(elem,false);
      }
      // 寫入 rdf
      treeData.forEach(function(row){
        if(row['urn']=="") { row['urn'] = RDF.GetAnonymousResource().Value; }
        var newnode = RDF.GetResource(row['urn']);
        ["urn","type","name","cmd","se","enable"].forEach(function(prop){
          var labelprop = RDF.GetResource("NOISE:"+prop);
          try {
            var newvalue = RDF.GetLiteral(row[prop]);
            dsource.Assert(newnode,labelprop,newvalue,true);
          } catch(e) { dump('Noise: '+e); }
        },this);
        if( RDFC.IndexOf(newnode)<0 ) RDFC.AppendElement(newnode);
      },this);
      dsource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();
      dsource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Refresh(true);
      RDF.UnregisterDataSource(dsource);
    },

    eventsGuide: function() {
      var ret = {
        pickedTree: {}
      };
      document.documentElement.openSubDialog("eventsGuide.xul", "resizable=yes", ret);
      if(ret.pickedTree.length > 0) {
        ret.pickedTree.forEach(function(row){
          var idx = treeData.length;
          row['enable']=false;
          treeView.insertItemAt(row, idx);
          treeData[idx]['urn'] = "";
          treeView.update();
        },this);
      }
    }

  };

  function CustomTreeView() {};
  CustomTreeView.prototype = {
    update: function()
    {
      this._treeBoxObject.invalidate();
      if(isInstantApply) notApplyIcon.hidden = false;
    },
    insertItemAt: function(aItem, aIndex)
    {
      if(aIndex<0) aIndex=treeData.length;
      treeData.splice(aIndex, 0, aItem);
      this._treeBoxObject.rowCountChanged(aIndex, 1);
      this.selection.select(aIndex);
      this._treeBoxObject.ensureRowIsVisible(aIndex);
      this._treeBoxObject.treeBody.focus();
      return aIndex;
    },
    removeItemAt: function(aIndex)
    {
      treeData.splice(aIndex, 1);
      this._treeBoxObject.rowCountChanged(aIndex, -1);
      var nextIdx = (aIndex >= treeData.length) ? treeData.length-1 : aIndex;
      this.selection.select(nextIdx);
      this._treeBoxObject.ensureRowIsVisible(nextIdx);
      this._treeBoxObject.treeBody.focus();
      this.update();
    },
    moveItem: function(aSourceIndex, aTargetIndex)
    {
      var removedItem = treeData.splice(aSourceIndex, 1);
      treeData.splice(aTargetIndex, 0, removedItem[0]);
    },
    canDrop: function(targetIndex, orientation)
    {
      var sourceIndex = this.selection.currentIndex;
      return (
              sourceIndex != -1 &&
              sourceIndex != targetIndex &&
              sourceIndex != (targetIndex + orientation)
             );
    },
    drop: function(targetIndex, orientation)
    {
      var sourceIndex = this.selection.currentIndex;
      if (sourceIndex < targetIndex) {
        if (orientation == Ci.nsITreeView.DROP_BEFORE) targetIndex--;
      }
      else {
        if (orientation == Ci.nsITreeView.DROP_AFTER) targetIndex++;
      }
      this.moveItem(sourceIndex, targetIndex);
      this.update();
      this.selection.select(targetIndex);
    },
    get ATOM()
    {
      if (!this._atom)
        this._atom = Cc["@mozilla.org/atom-service;1"].getService(Ci.nsIAtomService);
      return this._atom;
    },
    _atom: null,
    _treeBoxObject: null,
    get rowCount() { return treeData.length; },
    isContainer: function(row){ return false; },
    isSeparator: function(row){ return treeData[row]['type'] == 0 ? true : false; },
    isSorted: function(){ return false; },
    isEditable: function(row, col) { return (col.index == 3 && !this.isSeparator(row)); },
    getCellText: function(row, col) {
      switch (col.index) {
        case 0: return treeData[row]['name']; break;
        case 1: return treeData[row]['cmd']; break;
        case 2: return treeData[row]['se']; break;
      }
    },
    getCellValue: function(row,col) {
                    switch (col.index) {
                      case 3: return treeData[row]['enable']; break;
                    }
                  },
    getLevel: function(row){ return 0; },
    getImageSrc: function(row,col){ return null; },
    getParentIndex: function(row) { return -1; },
    hasNextSibling: function(row, afterIndex) { return false; },
    getRowProperties: function(row,props){},
    getCellProperties: function(row, col, properties) {
      if (col.index==0 && this.isSeparator(row)) properties.AppendElement(this.ATOM.getAtom("separator"));
      if (col.index==3) properties.AppendElement(this.ATOM.getAtom("checkbox-hover"));
    },
    getColumnProperties: function(colid,col,props){},
    setCellText: function(row,col,value)
    {
      switch (col.index) {
        case 0: treeData[row]['name'] = value; break;
        case 1: treeData[row]['cmd'] = value; break;
        case 2: treeData[row]['se'] = value; break;
      }
    },
    setCellValue: function(row, col, value) {
                    treeData[row]['enable'] == false
                      ? treeData[row]['enable'] = true
                      : treeData[row]['enable'] = false;
                    document.getElementById('cmd_toggle_enabled').setAttribute(
                      'label', treeData[row]['enable']==true ? stringBundle.getString("item_disabled") : stringBundle.getString("item_enabled")
                    );
                    treeView.update();
                  },
    setTree: function(treebox) { this._treeBoxObject = treebox; },
    cycleHeader: function(col) {},
    cycleCell: function(row, col) {},
    performAction: function(action) {},
    performActionOnRow: function(action, row) {},
    performActionOnCell: function(action, row, col) {}
  };

  var treeDragDropObserver = {
    _flavourSet: null,
    onDragStart: function (event, transferData, action) {
      var idx = treeView.selection.currentIndex;
          transferData.data = new TransferData();
          transferData.data.addDataForFlavour("text/x-moz-tree-index", idx);
          transferData.action = Ci.nsIDragService.DRAGDROP_ACTION_MOVE;
    },
    getSupportedFlavours: function() {
      if (!this._flavourSet) {
        this._flavourSet = new FlavourSet();
      }
      return this._flavourSet;
    },
    onDrop: function (event, transferData, session) {},
    onDragExit: function (event, session) {},
    onDragOver: function (event, flavour, session) {}
  };

  var treeFindbar = {
    _lastFoundIdx: -1,
    findbar: document.getElementById("noise-prefs-findbar"),
    textbox: document.getElementById('noise-prefs-findbar-textbox'),
    findStatusIcon: document.getElementById("noise-prefs-findbar-status-icon"),
    stringsBundle: Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService).createBundle("chrome://global/locale/findbar.properties"),
    _obsSvc: Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService),
    _playNotFoundSound: function() {
      if(Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch).getBoolPref("accessibility.typeaheadfind.enablesound")) {
        var nsISupportsString = Ci.nsISupportsString;
        var soundURL = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch).getComplexValue("accessibility.typeaheadfind.soundURL",nsISupportsString).data;
        if(soundURL=='beep') Noise.player.beep();
        else Noise.player.play( Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService).newURI(soundURL,null,null) );
      }
    },
    _ensureTextNotEmpty: function(){
      this._updateStatusUI();
      var isEmpty = (this.textbox.value == '');
      document.getElementById('noise-prefs-findbar-next').setAttribute('disabled',isEmpty);
      document.getElementById('noise-prefs-findbar-previous').setAttribute('disabled',isEmpty);
      document.getElementById('key_find_next').setAttribute('disabled',isEmpty);
      document.getElementById('key_find_previous').setAttribute('disabled',isEmpty);
      return ! isEmpty;
    },
    _updateStatusUI: function(aStatus, aFindPrevious) {
      switch (aStatus) {
        case "notfound":
          this.findStatusIcon.setAttribute("tooltiptext", this.stringsBundle.GetStringFromName("NotFound"));
          this.textbox.setAttribute("status", aStatus);
          this.findStatusIcon.setAttribute("status", aStatus);
          this._playNotFoundSound();
          break;

        case "wrapped":
          if(!aFindPrevious) { this.findStatusIcon.setAttribute("tooltiptext", this.stringsBundle.GetStringFromName("WrappedToTop")); }
          else { this.findStatusIcon.setAttribute("tooltiptext", this.stringsBundle.GetStringFromName("WrappedToBottom")); }
          this._obsSvc.notifyObservers(null, "noise-TypeAheadFind.FIND_WRAPPED", aFindPrevious);
          this.textbox.setAttribute("status", aStatus);
          this.findStatusIcon.setAttribute("status", aStatus);
          break;

        default:
          this.textbox.removeAttribute("status");
          this.findStatusIcon.removeAttribute("status");
          this.findStatusIcon.removeAttribute("tooltiptext");
      }
    },
    _findInRange: function(aValue, startIdx, endIdx) {
      startIdx = startIdx >= 0 ? startIdx : 0;
      endIdx = endIdx < treeData.length ? endIdx : treeData.length;
      var foundIdx = -1;
      for(startIdx; startIdx < endIdx ; startIdx++) {
        ["name","cmd","se"].forEach(function(prop){
          if( treeData[startIdx][prop] && treeData[startIdx][prop].search(aValue,'i') > -1 )
            foundIdx = startIdx;
        },this);
        if( foundIdx > -1 )
          return foundIdx;
      }
      return -1;
    },
    _findPreviousInRange: function(aValue, startIdx, endIdx) {
      startIdx = startIdx < treeData.length ? startIdx : (treeData.length-1);
      endIdx = endIdx >= 0 ? endIdx : 0;
      var foundIdx = -1;
      for(startIdx; startIdx >= endIdx ; startIdx--) {
        ["name","cmd","se"].forEach(function(prop){
          if( treeData[startIdx][prop] && treeData[startIdx][prop].search(aValue,'i') > -1 )
            foundIdx = startIdx;
        },this);
        if( foundIdx > -1 )
          return foundIdx;
      }
      return -1;
    },
    find: function(aValue) {  // find first match
      this._lastFoundIdx = -1;
      var foundIdx = this._findInRange(aValue, 0);
      if( foundIdx > -1 ) {
        this._lastFoundIdx = foundIdx;
        treeView.selection.select(foundIdx);
        treeView._treeBoxObject.ensureRowIsVisible(foundIdx);
      }
      else {
        this._updateStatusUI("notfound");
      }
    },
    findAgain: function(aValue, aFindPrevious) {
      var foundIdx = -1;
      this.textbox.removeAttribute("status");
      if(!aFindPrevious) {  // find next
        var startIndex = treeView.selection.currentIndex || this._lastFoundIdx || 0;
        foundIdx = this._findInRange(aValue, startIndex + 1);
        if(foundIdx < 0 && startIndex > 0) {
          foundIdx = this._findInRange(aValue, 0, startIndex + 1);
          if( foundIdx > -1 ) {
            this._updateStatusUI("wrapped", aFindPrevious);
          }
        }
      }
      else {  // find previous
        var startIndex = treeView.selection.currentIndex || this._lastFoundIdx || (treeData.length-1);
        foundIdx = this._findPreviousInRange(aValue, startIndex - 1);
        if(foundIdx < 0 && treeView.selection.currentIndex < (treeData.length-1)) {
          foundIdx = this._findPreviousInRange(aValue, (treeData.length-1), treeView.selection.currentIndex);
          if( foundIdx > -1 ) {
            this._updateStatusUI("wrapped", aFindPrevious);
          }
        }
      }
      if(foundIdx > -1) {
        this._lastFoundIdx = foundIdx;
        treeView.selection.select(foundIdx);
        treeView._treeBoxObject.ensureRowIsVisible(foundIdx);
      }
      else {
        this._updateStatusUI("notfound");
      }
    },
    doCommand: function(aCommand)
    {
      switch (aCommand) {
        case "cmd_findbar":
          if( this.findbar.hidden ) {
            this.findbar.hidden = false;
            this.textbox.select();
            this.textbox.focus();
          }
          else {
            this.findbar.hidden = true;
          }
        break;

        case "cmd_find_input":
          if(this._ensureTextNotEmpty()) this.find(this.textbox.value);
        break;

        case "cmd_find_next":
          if(this._ensureTextNotEmpty()) this.findAgain(this.textbox.value);
        break;

        case "cmd_find_previous":
          if(this._ensureTextNotEmpty()) this.findAgain(this.textbox.value, true);
        break;
      }
    },
    handleKeyEvent: function(event) {
      if (event.type == "keypress") {
        switch (event.keyCode) {
          case event.DOM_VK_RETURN:
            this.doCommand("cmd_find_next");
            break;

          case event.DOM_VK_ESCAPE:
            this.doCommand("cmd_findbar");
            break;

          default: return;
        }
        event.preventDefault();
      }
    }
  };

  Noise.NoisePrefs = NoisePrefs;
  window.addEventListener("load", function(){ Noise.NoisePrefs.init(); }, false);

})();