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
  });

  renderCurrentDirectory("");
  //chrome.storage.sync.get("currentDir", renderCurrentDirectory); 

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

  var fs = {
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

  var pat = "/dir1/doop/";

  console.log(parseFilesystemContents(fs, pat));

  /*chrome.storage.sync.get("jsonFile", function(fileSystem) {
       var curDirCont = parseFileSystemContents(JSON.parse(fileSystem), path);
  });*/
}

//this function returns whether or not the passed in file name is valid or not
function validName(name) {
  if(!name) return false;
  if(name.indexOf("/") > -1) return false;
  if(name.length > 32) return false;
  return true;
}

//this will get called when the save button is clicked and it will save the current URL into the current directory
function saveURL(path) {
  path = "/dir1/"; // remove this later. for testing purposes
  getCurrentTabUrl(function(url) {
    chrome.storage.sync.get(fskey, function(fileSystem) {
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
       var curDirCont = parseFilesystemContents(fileSystem, path); //will be JSON.parse(fileSystem)
       console.log("Before adding URL");
       console.log(fileSystem);
       var name = window.prompt("Please enter a name for this web page.", "");
       if(!validName(name)) {
         window.alert("Error: Please enter a valid name ('/' is not allowed and the character limit is 32).");
       } else {
         var newObj = {
            "type" : "url",
            "url" : url
         };
         if(curDirCont[name]) {
            //prompt to delete existing file
            var del = window.confirm("A file with that name already exists. Should we replace it?");
            if(del == false) {
              return;
            }
         } else {
             curDirCont[name] = newObj;
             //chrome.storage.sync.set()
         }
         curDirCont = parseFilesystemContents(fileSystem, path); 
         console.log("After adding URL");
         console.log(fileSystem);
       }
    });
  });
}

// Will get called when a fs item is clicked
function listenFsItem(){
  //if this is a diretory, move to dir. and update the current directory in storage

  //if url item, open page in new tab

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
