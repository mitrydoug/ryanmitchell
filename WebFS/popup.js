// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var fskey = "jsonFile";
var cdkey = "currentDir";
var lastClickTime = 2147000000;

/**
 * Get the current URL.
 *
 * @param {function(string)} callback - called when the URL of the current tab
 *   is found.
 **/
function getCurrentTabUrl(callback) {
	console.log("Getting cur tab URL");
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, function(tabs) {
	console.log("query");
    // chrome.tabs.query invokes the callback with a list of tabs that match the
    // query. When the popup is opened, there is certainly a window and at least
    // one tab, so we can safely assume that |tabs| is a non-empty array.
    // A window can only have one active tab at a time, so the array consists of
    // exactly one tab.
    var tab = tabs[0];

    // A tab is a plain object that provides information about the tab.
    // See https://developer.chrome.com/extensions/tabs#type-Tab
    var url = tab.url;

    // tab.url is only available if the "activeTab" permission is declared.
    // If you want to see the URL of other tabs (e.g. after removing active:true
    // from |queryInfo|), then the "tabs" permission is required to see their
    // "url" properties.
    console.assert(typeof url == 'string', 'tab.url should be a string');
	console.log("getting url was sucessful");
    callback(url);
  });

  // Most methods of the Chrome extension APIs are asynchronous. This means that
  // you CANNOT do something like this:
  //
  // var url;
  // chrome.tabs.query(queryInfo, function(tabs) {
  //   url = tabs[0].url;
  // });
  // alert(url); // Shows "undefined", because chrome.tabs.query is async.
}

function renderStatus(url) {
  document.getElementById('url').textContent = url;
}

document.addEventListener('DOMContentLoaded', function() {
	
  $('#saveButton').click(function(){
    $("#saveInput").blur(function() {
       $("#saveFalldown").css("display", "none");
    });
    $("#saveFalldown").css("display", "inline-block");
    $("#saveInput").focus();
  });

  $('#mkdirButton').click(function() {
    chrome.storage.sync.get(cdkey, function(cdobj) {
		if(cdobj[cdkey] === "/queue/") {
			window.alert("Can't create folders in the queue.");
		} else {
			$("#createInput").blur(function() {
			   $("#createFalldown").css("display", "none");
			});
			$("#createFalldown").css("display", "inline-block");
			$("#createInput").focus();
			/*chrome.storage.sync.get(cdkey, createFolder);*/
		}
	});
  });

  $('#openSelected').click(openSelected);
  $('#deleteSelected').click(deleteSelected); 
  $('#dequeueButton').click(dequeue);
  $('#queueButton').click(queueCurrentPage);
	
  $("#saveInput").keypress(function(e){
    if(e.which === 13){
      saveFormHandler($("#saveInput").val());
    }
  });

  $("#createInput").keypress(function(e){
    if(e.which === 13){
      createFormHandler($("#createInput").val());
    }
  });

  //chrome.storage.sync.clear();
  //renderCurrentDirectory("");
  chrome.storage.sync.get(cdkey, function(cdobj) {
    //this will create the initial file system
    console.log(cdobj);
    if(isEmpty(cdobj)) {
      var obj = {};
      obj[cdkey] = "/";
      var fs = {};
      fs[fskey] = JSON.stringify({
        "queue": {
          "type": "queue",
          "contents": {}
        }
      });
      chrome.storage.sync.set(fs, function() {
        chrome.storage.sync.set(obj, function() {
          renderCurrentDirectory(obj[cdkey]);
        })
      });
    } else {
      renderCurrentDirectory(cdobj[cdkey]);
    }
  });
});

function parseFilesystemContents(fileSystemContents, path){
  console.log(path);
  // will have the storage get calls
  if(path[0] !== '/'){
    console.log("malformed path in parseFilesystemContents: doesnt start with '/'");
    return undefined;
  } else if(path === '/'){
    return fileSystemContents; 
  }

  var dirname = path.substr(1, path.substr(1).indexOf('/'));

  if(fileSystemContents[dirname]){
    var newCont = fileSystemContents[dirname];
    if(newCont["type"] === 'directory' || newCont["type"] === 'queue'){
      console.log("found directory: " + dirname + " and recursing on : " + path.substr(1 + dirname.length));
      return parseFilesystemContents(newCont["contents"], path.substr(1 + dirname.length));
    } else {
      console.log("malformed path in parseFilesystemContents: " + dirname + " is not a directory type");
      return undefined; 
    }
  } else {
    console.log("malformed path in parseFilesystemContents: directory " + dirname + " does not exist");
    return undefined;
  }
}

function openSelected() {
	chrome.storage.sync.get(cdkey, function(cdobj) {
		chrome.storage.sync.get(fskey, function(fsobj) {
			var fileSystem = JSON.parse(fsobj[fskey]);
			var path = cdobj[cdkey];
			var curDirCont = parseFilesystemContents(fileSystem, path);
			var keys = new Array();
			$("#contentsTable").find("tr").each(function() {
				//srcName is key
				console.log(this);
				if($(this).hasClass("selected")) keys.push($(this).attr("srcName"));
			});
			for(var i = 0; i < keys.length; i++) {
				if(curDirCont[keys[i]]["type"] === "url") {
					chrome.tabs.create({url : curDirCont[keys[i]]["url"]});
					if(path === "/queue/") delete curDirCont[keys[i]];
				}
			}
			if(path === "/queue/") {
				var newFS = {};
				newFS[fskey] = JSON.stringify(fileSystem);
				chrome.storage.sync.set(newFS);
			}
		});
	});
}

//function queueItem(path, name, url)
function dequeue() {
	chrome.storage.sync.get(fskey, function(fsobj) {
		var fileSystem = JSON.parse(fsobj[fskey]);
		var queueCont = parseFilesystemContents(fileSystem, "/queue/");
		//add stuff here
	});
}

function queueCurrentPage() {
	chrome.storage.sync.get(fskey, function(fsobj) {
		var fileSystem = JSON.parse(fsobj[fskey]);
		var queueCont = parseFilesystemContents(fileSystem, "/queue/");
		var queryInfo = {
			active: true,
			currentWindow: true
		  };

		chrome.tabs.query(queryInfo, function(tabs) {
			var tab = tabs[0];
			var url = tab.url;
			var title = tab.title;
			console.assert(typeof url == 'string', 'tab.url should be a string');
			var obj = {
				"type": "url",
				"url": url,
				"time_stamp": String((new Date()).getTime() / 1000)
			};
			queueCont[title] = obj;
			var newFS = {};
			newFS[fskey] = JSON.stringify(fileSystem);
			chrome.storage.sync.set(newFS, function() {
				chrome.storage.sync.get(cdkey, function(cdobj) {
					var path = cdobj[cdkey];
					if(path === "/queue/") renderCurrentDirectory(path);
				});
			});
		});
	});
}

function deleteSelected() {
	chrome.storage.sync.get(cdkey, function(cdobj) {
		chrome.storage.sync.get(fskey, function(fsobj) {
			var fileSystem = JSON.parse(fsobj[fskey]);
			var path = cdobj[cdkey];
			var curDirCont = parseFilesystemContents(fileSystem, path);			
			var keys = new Array();
			$("#contentsTable").find("tr").each(function() {
				//srcName is key
				console.log(this);
				if($(this).hasClass("selected")) keys.push($(this).attr("srcName"));
				if($(this).attr("srcName") === "queue") $(this).removeClass("selected"); //un-selects queue since you can't delete it
			});
			
			if(keys.length > 0) {
				var del = window.confirm("Are you sure you want to delete the selected items? (***Careful! This will delete all contents if any are a folder***)");
				if(del == false) {
				  return;
				}
			}
			for(var i = 0; i < keys.length; i++) {
				if(curDirCont[keys[i]]["type"] !== "queue") {
					delete curDirCont[keys[i]];
				}

			}
			var newFS = {};
			newFS[fskey] = JSON.stringify(fileSystem);
			chrome.storage.sync.set(newFS, function() {
				renderCurrentDirectory(path);
			});
		});
	});
}

function renderCurrentDirectory(path){

  console.log("rendering: " + path);

  var pathTokens = path.split("/").slice(1, path.split("/").length - 1);
  console.log(pathTokens);
  $("#curDirRow td").remove();
  var backButton = $("<td id=\"backButton\" class=\"evenmarker\"><img id=\"backImg\" class=\"backButton\" src=\"backButton.png\"></img></td>");
  var rootFolder = $("<td id=\"diritem1\" class=\"oddmarker\" dirName=\"/\">/</td>");
  backButton.hover(function() {
	$("#backImg").attr("src", "backButtonHover.png");
  }, function() {
	$("#backImg").attr("src", "backButton.png");
  });
  backButton.click(listenDirItem);
  rootFolder.click(listenDirItem);
  $("#curDirRow").append(backButton);
  $("#curDirRow").append(rootFolder);
  var count = 2;
  for(index in pathTokens){
    var dirItem = $("<td id=\"diritem" + count + "\" class=\"" + (count % 2 == 0 ? "evenmarker" : "oddmarker") + " curDirToken\"" + 
                         "dirName=\"" + pathTokens[index] + "\">"
                                      + pathTokens[index] + "/</td>");
    dirItem.click(listenDirItem);
    $("#curDirRow td:last").after(dirItem)
    count++;
  }

  chrome.storage.sync.get(fskey, function(fileSystem) {
       console.log("fetched fs data");
       console.log(fileSystem);
       var curDirCont = parseFilesystemContents(JSON.parse(fileSystem[fskey]), path);
	   var dirArray = new Array();
	   var fileArray = new Array();
	   for(key in curDirCont) {
	     var next = {};
		 next[key] = curDirCont[key];
		 if(curDirCont[key]["type"] === "directory") dirArray.push(next);
		 else if(curDirCont[key]["type"] === "url") fileArray.push(next);
		 else if(curDirCont[key]["type"] !== "queue") console.log("Error in renderCurrentDirectory, " + curDirCont[key] + " type is invalid");
	   }
	   dirArray.sort(function(a, b){
			if(Object.keys(a)[0].toUpperCase() < Object.keys(b)[0].toUpperCase()) return -1; //keys[0] is the only key, which is the name
			if(Object.keys(a)[0].toUpperCase() > Object.keys(b)[0].toUpperCase()) return 1;
			return 0;
	   });
	   fileArray.sort(function(a, b){
			if(Object.keys(a)[0].toUpperCase() < Object.keys(b)[0].toUpperCase()) return -1;
			if(Object.keys(a)[0].toUpperCase() > Object.keys(b)[0].toUpperCase()) return 1;
			return 0;
	   });
       var count = 0;
       $("#contentsTable tr:not(#head_row)").remove();
	//display the queue first
	   if(path === "/") {
		  var key = "queue";
          var tableElem = $("<tr id=\"file" + count + "\"" 
                              + "class=\"" + (count % 2 == 0 ? "oddfile" : "evenfile") + "\""
                              + " srcName=\"" + key + "\">"
                              + "<td><img class=\"iconImg\" src=\"folderIcon.png\"></img>"
							  + "<p>" + key + "</p>" 
                              +   "<img class=\"rightFloat\" src=\"deleteIcon.png\"></img>"
                              + "</td>"
                              + "<td>" + curDirCont[key]["type"] + "</td></tr>");
          $("#contentsTable tr:last").after(tableElem);
          tableElem.dblclick(fireFsItem);
          tableElem.click(listenFsItem);
          count++;
	   }
       for(var i = 0; i < dirArray.length; i++){
	      var key = Object.keys(dirArray[i]);
          var tableElem = $("<tr id=\"file" + count + "\"" 
                              + "class=\"" + (count % 2 == 0 ? "oddfile" : "evenfile") + "\""
                              + " srcName=\"" + key + "\">"
                              + "<td><img class=\"iconImg\" src=\"folderIcon.png\"></img>"
							  + "<p>" + key + "</p>" 
                              +   "<img class=\"rightFloat\" src=\"deleteIcon.png\"></img>"
                              + "</td>"
                              + "<td>" + dirArray[i][key]["type"] + "</td></tr>");
          $("#contentsTable tr:last").after(tableElem);
          tableElem.dblclick(fireFsItem);
          tableElem.click(listenFsItem);
          count++;
       }
	   for(var i = 0; i < fileArray.length; i++){
	      var key = Object.keys(fileArray[i]);
          var tableElem = $("<tr id=\"file" + count + "\"" 
                              + "class=\"" + (count % 2 == 0 ? "oddfile" : "evenfile") + " fileImg\""
                              + " srcName=\"" + key + "\">"
                              + "<td><img class=\"iconImg\" src=\"pageIcon.png\"></img>"
							  + "<p>" + key + "</p>" 
                              +   "<img class=\"rightFloat\" src=\"deleteIcon.png\"></img>"
                              + "</td>"
                              + "<td>" + fileArray[i][key]["type"] + "</td></tr>");
          $("#contentsTable tr:last").after(tableElem);
          tableElem.dblclick(fireFsItem);
          tableElem.click(listenFsItem);
          count++;
       }
  });

  //do the rendering here

}

function createFolder(path, name) {
  console.log("in callback for sync get");
  chrome.storage.sync.get(fskey, function(fileSystem) {
    console.log("2 in callback for sync get");
      fileSystem = JSON.parse(fileSystem[fskey]);
       var curDirCont = parseFilesystemContents(fileSystem, path); 
	   console.log(curDirCont);
       if(!validName(name)) {
         window.alert("Error: Please enter a valid name ('/' is not allowed and the character limit is 32).");
       } else {
         var newObj = {
            "type" : "directory",
            "contents" : {}
         };
         if(curDirCont[name]) {
		     console.log("cur dir is " + JSON.stringify(curDirCont));
            //prompt to delete existing file
            var del = window.confirm("An item with that name already exists. Should we replace it? (***Careful! This will delete all contents if it is a folder***)");
            if(del == false) {
              return;
            }
         }
         curDirCont[name] = newObj;
         var obj = {};
         obj[fskey] = JSON.stringify(fileSystem);
         chrome.storage.sync.set(obj, function() {
          renderCurrentDirectory(path);
         });
         curDirCont = parseFilesystemContents(fileSystem, path); 
       }
    });
}

//this function returns whether or not the passed in file name is valid or not
function validName(name) {
  if(name.indexOf("/") > -1) return false;
  if(name.length > 32) return false;
  return true;
}

function isEmpty(object) {
  return Object.keys(object).length === 0;
}

//this will get called when the save button is clicked and it will save the current URL into the current directory
function saveURL(path, name) {
  console.log("yesyesyes");
  getCurrentTabUrl(function(url) {
	console.log("Not getting here");
    chrome.storage.sync.get(fskey, function(fileSystem) {
      console.log("in the get of getURL");
      fileSystem = fileSystem[fskey];
      console.log(fileSystem);
      fileSystem = JSON.parse(fileSystem);
      var curDirCont = parseFilesystemContents(fileSystem, path); 
      console.log("Before adding URL");
	    console.log(fileSystem);
	    if(!name) return;
        if(!validName(name)) {
          window.alert("Error: Please enter a valid name ('/' is not allowed and the character limit is 32).");
        } else {
          var newObj = {
            "type" : "url",
            "url" : url
         };
         if(curDirCont[name]) {
            //prompt to delete existing file
            var del = window.confirm("An item with that name already exists. Should we replace it? (***Careful! This will delete all contents if it is a folder***)");
            if(del == false) {
              return;
            }
         }
		 console.log("about to create new obj");
         curDirCont[name] = newObj;
         var obj = {};
         obj[fskey] = JSON.stringify(fileSystem)
         chrome.storage.sync.set(obj, function() {
			console.log("add successful");
            renderCurrentDirectory(path);
         });
         curDirCont = parseFilesystemContents(fileSystem, path); 
         console.log("After adding URL");
         console.log(fileSystem);
       }
    });
  });
}

function renameItem(event, oldName) {
	//var elem = $(event.target).value();
  console.log(oldName);
  console.log("did it submit?");
	chrome.storage.sync.get(cdkey, function(cdobj) {
		chrome.storage.sync.get(fskey, function(fsobj) {
      var fileSystem = JSON.parse(fsobj[fskey]);
			var curDirCont = parseFilesystemContents(fileSystem, cdobj[cdkey]);
      console.log("123 " + JSON.stringify(curDirCont));
			if(!curDirCont[oldName]) {
				console.log("Error in renameItem: " + oldName + "does not exist in current directory");
				return;
			}
			var obj = curDirCont[oldName];
			delete curDirCont[oldName];
      console.log("456 " + JSON.stringify(curDirCont));
			var newName = $("#renamingInput").val();
      console.log("newName: " + newName + "\n obj: " + JSON.stringify(obj));
			curDirCont[newName] = obj;
      console.log("dfg " + JSON.stringify(fileSystem));
			var newFS = {};
			newFS[fskey] = JSON.stringify(fileSystem);
			chrome.storage.sync.set(newFS, function() {
				renderCurrentDirectory(cdobj[cdkey]);
			});
		});	
	});	
}

function deleteItem(name) {
	chrome.storage.sync.get(cdkey, function(cdobj) {
		chrome.storage.sync.get(fskey, function(fsobj) {
      var fileSystem = JSON.parse(fsobj[fskey]);
			var curDirCont = parseFilesystemContents(fileSystem, cdobj[cdkey]);
			if(!curDirCont[name]) {
				console.log("Error in renameItem: " + name + "does not exist in current directory");
				return;
			}
			delete curDirCont[name];
			var newFS = {};
			newFS[fskey] = JSON.stringify(fileSystem);
			chrome.storage.sync.set(newFS, function() {
				renderCurrentDirectory(cdobj[cdkey]);
			});
		});	
	});	
}

function listenDirItem(event){

  if(event.target.className === "backButton" || event.target.id === "backButton") {
    moveUpDir();
  }
  else {
    console.log($(event.target).attr("dirName"));
    var targetID = event.target.id;
    var dirNum = event.target.id;
    dirNum = dirNum.substr(dirNum.lastIndexOf("m") + 1); //since it is diritem#
    console.log(dirNum);
    var path = "";
    for(var i = 1; i <= dirNum; i++) {
      path += $("#diritem" + i).text();
      console.log(path);
    }
    var obj = {};
    obj[cdkey] = path;
    chrome.storage.sync.set(obj, function() {
      renderCurrentDirectory(path);
    });
  }
}

function listenFsItem(event){
  var elem = $(event.target);

  var rowElem  = elem;

  if(rowElem.prop("tagName") != "TR"){
    rowElem = rowElem.closest("tr");
  }

  console.log(rowElem.prop("tagName"));
  console.log(elem.prop("tagName"));

  //need to clense things which are not
  var d = new Date();
  var n = d.getTime();
  var timeSinceLastClick = n - lastClickTime;
  console.log(timeSinceLastClick);
  if(elem.prop("tagName") === "P" && rowElem.hasClass("selected") && timeSinceLastClick > 500){
    console.log("removing case");
    var name = elem.text();
    console.log("name: " + name);
    elem.css("display","none");
    var textInput = $("<input id=\"renamingInput\"type=\"input\" value=\"" + name + "\"></input>"); 
    var textForm = $("<form></form>").append(textInput);
    rowElem.children("td:first").append(textForm);
    textInput.select();
    textInput.blur(function(e){
      textForm.remove();
      elem.css("display", "inline");
      //td.prepend("<input id=\"renamingInput\"type=\"input\" value=\"" + name + "\"></input>");
    });
    textInput.submit(function(event){
      console.log("In pseudo handler");
      renameItem(event, name);
    });
  } else if(elem.prop("tagName") == "IMG"){
    if(elem.attr("src") === "deleteIcon.png"){
      elem.remove();
      rowElem.children("td:first").append("<img src=\"deleteButton.png\" class=\"rightFloat\"></img>");
      return;
    } else if(elem.attr("src") === "deleteButton.png"){
      deleteItem(rowElem.children("td:first").children("p:first").text());
      return;
    }
  }

  $("#contentsTable").find("[src='deleteButton.png']").attr("src", "deleteIcon.png");

  //toggle the selected class
  if(rowElem.hasClass("selected")){
    console.log("setting to un-selected");
    rowElem.removeClass("selected");
  } else {
    console.log("setting to selected");
    rowElem.addClass("selected");
  }
  lastClickTime = n;
}

// Will get called when a fs item is clicked
function fireFsItem(event){
  var elem = $(event.target);
  if(elem.prop("tagName") !== "TR"){
    console.log("getting the parent");
    elem = elem.closest("tr");
  }
  //console.log(elem.attr("srcName"));
  var name = elem.attr("srcName");
  chrome.storage.sync.get(cdkey, function(cdobj) {
    chrome.storage.sync.get(fskey, function(fsobj) {
	  var fileSystem = JSON.parse(fsobj[fskey]);
      var curDirCont = parseFilesystemContents(fileSystem, cdobj[cdkey]);
      console.log(name);
      console.log(curDirCont);
      console.log(curDirCont[name]);
      if(curDirCont[name]["type"] === "directory" || curDirCont[name]["type"] === "queue") {
        var obj = {};
        obj[cdkey] = cdobj[cdkey] + name + "/";
        chrome.storage.sync.set(obj, function() {
          console.log("We have set the new current directory value");
          renderCurrentDirectory(obj[cdkey]);
        });
      }
      //if url item, open page in new tab
      else if(curDirCont[name]["type"] === "url") {
        chrome.tabs.create({url : curDirCont[name]["url"]});
		if(path === "/queue/") delete curDirCont[name];
		var newFS = {};
		newFS[fskey] = JSON.stringify(fileSystem);
		chrome.storage.sync.set(newFS);
      }
      else {
        console.log("Error in listenFsItem: " + curDirCont[name] + " is neither a directory nor url.");
      }
    });
  });
}

function moveUpDir() {
	chrome.storage.sync.get(cdkey, function(cdobj) {
		var path = cdobj[cdkey];
		//if the current directory is root, then don't do anything
		if(path === "/") return;
		if(path[path.length - 1] !== "/") {
			console.log("Error in moveUpDir: " + path + " does not end with a '/'");
			return;
		}
		//chop off the last '/'
		path = path.substr(0, path.length - 1);
		var index = path.lastIndexOf("/");
		path = path.substr(0, index + 1);
		var obj = {};
		obj[cdkey] = path;
		chrome.storage.sync.set(obj, function() {
			renderCurrentDirectory(path);
		});
	});
}

function saveFormHandler(name) {
  $("#saveFalldown").css("display", "none");
  $("#saveInput").val("");
  chrome.storage.sync.get(cdkey, function(cdobj){
    console.log("here");
    saveURL(cdobj[cdkey], name);
  });
}

function createFormHandler(name) {
  $("#createFalldown").css("display", "none");
  $("#createInput").val("");
  chrome.storage.sync.get(cdkey, function(cdobj){
    console.log("new here: " + name);
    createFolder(cdobj[cdkey], name);
  });
}