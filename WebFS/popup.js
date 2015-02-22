// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var fskey = "jsonFile";
var cdkey = "currentDir";

/**
 * Get the current URL.
 *
 * @param {function(string)} callback - called when the URL of the current tab
 *   is found.
 **/
function getCurrentTabUrl(callback) {
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, function(tabs) {
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
	
  $('#saveButton').click(function() {
    chrome.storage.sync.get(cdkey, saveURL);
    /*chrome.storage.sync.get("url", function(obj) {
      console.log("The last URL was: " + obj["url"]);
    });
    getCurrentTabUrl(function(url) {
      chrome.storage.sync.set({"url" : url}, function() {
        console.log("Setting new URL");
      })
    });*/
  });

  $('#mkdirButton').click(function() {
    chrome.storage.sync.get(cdkey, createFolder);
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
      fs[fskey] = JSON.stringify({});
      chrome.storage.sync.set(fs, function() {
        chrome.storage.sync.set(obj, function() {
          renderCurrentDirectory(obj[cdkey]);
        })
      });
    } else {
      renderCurrentDirectory(cdobj[cdkey]);
    }
  });
  //
  /*var obj = {};
  obj[cdkey] = "/dir1/";
  chrome.storage.sync.set(obj, function() {
    renderCurrentDirectory(obj[cdkey]);
  });*/
  
  /*getCurrentTabUrl(function(url) {
    chrome.storage.sync.get('jsonFile', function(object) {
      if(Object.keys(object).length === 0) {
        console.log("Creating el root file");
        var initialFile = {};
        chrome.storage.sync.set({'jsonFile': url}, function() {
          console.log("Set the initial file");
        });
      }
      else {
        renderStatus("Last URL: " + object['jsonFile']);
        console.log("Need to update file since it exists");
        chrome.storage.sync.set({'jsonFile': url}, function() {
          console.log("Updated file");
          chrome.storage.sync.clear(function() {
            console.log("Clearing storage");
          });
        });
      }
    }); 
  });*/
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
    if(newCont["type"] === 'directory'){
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

function renderCurrentDirectory(path){

  /*var fs = {
    "dir1": {
      "type": "directory",
      "contents" : {
        "doop": {
          "type": "directory",
          "contents":{"wakaka": "bloop"}
        }
        "google" : {
          "type": "url",
          "url": "https://www.google.com/?gws_rd=ssl"
        }
      }
    }
  };*/

  //console.log(parseFilesystemContents(fs, pat));
  console.log("rendering: " + path);

  var pathTokens = path.split("/").slice(1, path.split("/").length - 1);
  console.log(pathTokens);
  $("#curDirRow td").remove();
  var backArrows = $("<td id=\"backArrow\" class=\"evenmarker\"> << </td>");
  var rootFolder = $("<td id=\"diritem1\" class=\"oddmarker\" dirName=\"/\">/</td>");
  backArrows.click(listenDirItem);
  rootFolder.click(listenDirItem);
  $("#curDirRow").append(backArrows);
  $("#curDirRow").append(rootFolder);
  var count = 2;
  for(index in pathTokens){
    var dirItem = $("<td id=\"diritem" + count + "\" class=\"" + (count % 2 == 0 ? "evenmarker" : "oddmarker") + "\"" + 
                         "dirName=\"" + pathTokens[index] + "\">"
                                      + pathTokens[index] + "</td>");
    dirItem.click(listenDirItem);
    $("#curDirRow td:last").after(dirItem)
    $("#curDirRow td:last").after("<td>/</td>");
    count++;
  }

  chrome.storage.sync.get(fskey, function(fileSystem) {
       console.log("fetched fs data");
       console.log(fileSystem);
       var curDirCont = parseFilesystemContents(JSON.parse(fileSystem[fskey]), path);
       var count = 0;
       $("#contentsTable tr:not(#head_row)").remove();
       for(key in curDirCont){
          var tableElem = $("<tr id=\"file" + count + "\"" 
                              + "class=\"" + (count % 2 == 0 ? "oddfile" : "evenfile") + "\""
                              + " srcName=\"" + key + "\">"
                              + "<td><p>" + key + "</p>" 
                              +   "<img class=\"rightFloat\" src=\"deleteIcon.png\"></img>"
                              + "</td>"
                              + "<td>" + curDirCont[key]["type"] + "</td></tr>");
          $("#contentsTable tr:last").after(tableElem);
          tableElem.dblclick(fireFsItem);
          tableElem.click(listenFsItem);
          count++;
       }
  });

  //do the rendering here

}

function createFolder(cdobj) {
  var path = cdobj[cdkey];
  chrome.storage.sync.get(fskey, function(fileSystem) {
      fileSystem = JSON.parse(fileSystem[fskey]);
       var curDirCont = parseFilesystemContents(fileSystem, path); 
       var name = window.prompt("Please enter a name for this folder.", "");
       if(!validName(name)) {
         window.alert("Error: Please enter a valid name ('/' is not allowed and the character limit is 32).");
       } else {
         var newObj = {
            "type" : "directory",
            "contents" : {}
         };
         if(curDirCont[name]) {
            //prompt to delete existing file
            var del = window.confirm("An item with that name already exists. Should we replace it? (***Careful! This will delete all contents if it is a folder***)");
            if(del == false) {
              return;
            }
         }
         curDirCont[name] = newObj;
         var obj = {};
         obj[fskey] = JSON.stringify(fileSystem)
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
function saveURL(cdobj) {
  var path = cdobj[cdkey];
  getCurrentTabUrl(function(url) {
    chrome.storage.sync.get(fskey, function(fileSystem) {
      console.log(fileSystem);
      fileSystem = fileSystem[fskey];
      console.log(fileSystem);
      /*try {
        fileSystem = JSON.parse(fileSystem[fskey]);
      }
      catch(e) {
        fileSystem = {};
      }
      if(isEmpty(fileSystem)) {  
        console.log("Creating default dir");
        fileSystem = {
          "dir1": {
            "type": "directory",
            "contents" : {
              "doop": {
                "type": "directory",
                "contents":{"wakaka": "bloop"}
              }
            }
          }
        };
      }*/
       if(fileSystem == undefined) {
        console.log("Creating default dir");
        fileSystem = {
          "dir1": {
            "type": "directory",
            "contents" : {
              "doop": {
                "type": "directory",
                "contents":{"wakaka": "bloop"}
              }
            }
          }
        };
       }
       else {
        fileSystem = JSON.parse(fileSystem);
       }
       var curDirCont = parseFilesystemContents(fileSystem, path); 
       console.log("Before adding URL");
	   console.log(fileSystem);
       var name = window.prompt("Please enter a name for this web page.", "");
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
         curDirCont[name] = newObj;
         var obj = {};
         obj[fskey] = JSON.stringify(fileSystem)
         chrome.storage.sync.set(obj, function() {
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
  if(event.target.id === "backArrow") {
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
      path += $("#diritem" + i).text() + (i === 1 ? "" : "/");
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

  if(elem.prop("tagName") === "P" && rowElem.hasClass("selected")){
    console.log("removing case");
    var name = elem.text();
    console.log("name: " + name);
    elem.remove();
    var textIn = $("<form><input id=\"renamingInput\"type=\"input\" value=\"" + name + "\"></input></form>");
    rowElem.children("td:first").append(textIn);
    textIn.children("input:first").select();
    textIn.submit(function(event){
      console.log("In pseudo handler");
      renameItem(event, name);
    });
    return;
  } else if(elem.prop("tagName") == "IMG"){
    if(elem.attr("src") === "deleteIcon.png"){
      elem.remove();
      rowElem.children("td:first").append("<img src=\"deleteButton.png\" class=\"rightFloat\"></img>");
    } else if(elem.attr("src") === "deleteButton.png"){
      deleteItem(rowElem.children("td:first").children("p:first").text());
    }
  }

  //toggle the selected class
  if(rowElem.hasClass("selected")){
    console.log("setting to un-selected");
    rowElem.removeClass("selected");
  } else {
    console.log("setting to selected");
    rowElem.addClass("selected");
  }
}

// Will get called when a fs item is clicked
function fireFsItem(event){
  var elem = $(event.target);
  if(elem.prop("tagName") === "TD"){
    console.log("getting the parent");
    elem = elem.parent("tr");
  }
  //console.log(elem.attr("srcName"));
  var name = elem.attr("srcName");
  chrome.storage.sync.get(cdkey, function(cdobj) {
    chrome.storage.sync.get(fskey, function(fsobj) {
      var curDirCont = parseFilesystemContents(JSON.parse(fsobj[fskey]), cdobj[cdkey]);
      console.log(name);
      console.log(curDirCont);
      console.log(curDirCont[name]);
      if(curDirCont[name]["type"] === "directory") {
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
      }
      else {
        console.log("Error in listenFsItem: " + curDirCont[name] + " is neither a directory nor url.");
      }
    });
  });
  //if this is a diretory, move to dir. and update the current directory in storage
  /*if(obj["type"] == "directory") {

  }
  //if url item, open page in new tab
  else if(obj["type"] == "url") {
    chrome.tabs.create({url : obj["url"]})  
  }
  else {
    console.log("Error in listenFsItem: " + obj + " is neither a directory nor url.");
  }*/
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

/**
 * @param {string} searchTerm - Search term for Google Image search.
 * @param {function(string,number,number)} callback - Called when an image has
 *   been found. The callback gets the URL, width and height of the image.
 * @param {function(string)} errorCallback - Called when the image is not found.
 *   The callback gets a string that describes the failure reason.
 */
/*function getImageUrl(searchTerm, callback, errorCallback) {
  // Google image search - 100 searches per day.
  // https://developers.google.com/image-search/
  var searchUrl = 'https://ajax.googleapis.com/ajax/services/search/images' +
    '?v=1.0&q=' + encodeURIComponent(searchTerm);
  var x = new XMLHttpRequest();
  x.open('GET', searchUrl);
  // The Google image search API responds with JSON, so let Chrome parse it.
  x.responseType = 'json';
  x.onload = function() {
    // Parse and process the response from Google Image Search.
    var response = x.response;
    if (!response || !response.responseData || !response.responseData.results ||
        response.responseData.results.length === 0) {
      errorCallback('No response from Google Image search!');
      return;
    }
    var firstResult = response.responseData.results[0];
    // Take the thumbnail instead of the full image to get an approximately
    // consistent image size.
    var imageUrl = firstResult.tbUrl;
    var width = parseInt(firstResult.tbWidth);
    var height = parseInt(firstResult.tbHeight);
    console.assert(
        typeof imageUrl == 'string' && !isNaN(width) && !isNaN(height),
        'Unexpected respose from the Google Image Search API!');
    callback(imageUrl, width, height);
  };
  x.onerror = function() {
    errorCallback('Network error.');
  };
  x.send();
}*/

//filesystem
/*{
  "dir1": {
    "type": "directory",
    "contents": {
        /* recursive  
    } 
  }
  "file1": {
    "type": "url",
    "url" : "google.com"
  }
}*/
