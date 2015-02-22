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

function saveURL(path, name, url) {
  console.log("yesyesyes");
  chrome.storage.sync.get(fskey, function(fileSystem) {
	  console.log(fileSystem);
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
}

var count = 0;

function addToQueue(info, tab){
	console.log("new here");
	chrome.storage.sync.get(cdkey, function(cdobj){
		chrome.storage.sync.get(fskey, function(fsobj){
			var filesystem = JSON.parse(fsobj[fskey]);
			var curDirCont = parseFilesystem(fileSystem, cdobj[cdkey]);
			saveUrl("/queue/", "link" + count, info["linkUrl"]);
		});
	});
}

chrome.contextMenus.create({"title": "Put in Queue", "contexts":["link"], "onclick": addToQueue});