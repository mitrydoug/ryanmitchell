// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var fskey = "jsonFile";
var cdkey = "currentDir";


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

//this function returns whether or not the passed in file name is valid or not
function validName(name) {
  if(name.indexOf("/") > -1) return false;
  return true;
}

function trimName(name) {
	if(name.length > 20){
		name = name.substr(0, 20) + "...";
	}
	return name;
}

function isEmpty(object) {
  return Object.keys(object).length === 0;
}

function httpGet(theUrl) {
    var xmlHttp = null;

    xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false );
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

function getSrcType(url){
	var x = new XMLHttpRequest();
	x.open('GET', url, false);
	console.log("before send");
	x.send(null);
	return x.getResponseHeader("content-type");
}

function queueItem(name, url) {
  console.log("yesyesyes");
  chrome.storage.sync.get(fskey, function(fileSystem) {
	  console.log(fileSystem);
	  fileSystem = fileSystem[fskey];
	  console.log(fileSystem);
	  fileSystem = JSON.parse(fileSystem);
	  var curDirCont = parseFilesystemContents(fileSystem, "/queue/");
	  var queryInfo = {
		active: true,
		currentWindow: true
	  };
	  chrome.tabs.query(queryInfo, function(tabs) {
		var tab = tabs[0];
		var favIconUrl = tab.favIconUrl;
		console.log("Before adding URL");
		console.log(fileSystem);
		if(!name) return;
		if(!validName(name)) {
			window.alert("Error: Please enter a valid name ('/' is not allowed and the character limit is 32).");
		} else {
			var newObj = {
				"type" : "url",
				"spec_type": getSrcType(url),
				"icon": favIconUrl,
				"url" : url,
				"time_stamp": String((new Date()).getTime() / 1000)
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
			 chrome.storage.sync.set(obj);
		}
	  });
	});
}

function addToQueue(info, tab){
	console.log("info: " + JSON.stringify(info));
	chrome.storage.sync.get(cdkey, function(cdobj){
		chrome.storage.sync.get(fskey, function(fsobj){
			var filesystem = JSON.parse(fsobj[fskey]);
			var curDirCont = parseFilesystemContents(filesystem, cdobj[cdkey]);
			var pageHtml = httpGet(info["pageUrl"]);
			var i = 0;
			while(pageHtml.indexOf(info["linkUrl"].substr(i)) == -1) i ++;
			i = pageHtml.indexOf(info["linkUrl"].substr(i));
			var name = pageHtml.substr(
				pageHtml.substr(i).indexOf(">") + i + 1,
				pageHtml.substr(i).indexOf("<") -
					pageHtml.substr(i).indexOf(">") - 1);
			console.log(pageHtml);
			console.log("looking for: " + info["linkUrl"].substr(info["linkUrl"].lastIndexOf("/") + 1));
			console.log("index: " + i);
			console.log("name: " + name);
			name = trimName(name);
			console.log(name);
			queueItem(name, info["linkUrl"]);
		});
	});
}

chrome.contextMenus.create({"title": "Put in Queue", "contexts":["link"], "onclick": addToQueue});