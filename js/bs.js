$(document).ready(function () {

    // variables
    var _fileSystem;
    var filesToDisplay = [];

    // code

    console.log("entering bs.js");

    function onInitializeFileSystem(fileSystem) {
        _fileSystem = fileSystem;
        console.log('Opened file system: ' + _fileSystem.name);
        //debugger;
    };

    function fileSystemErrorHandler(e) {
        var msg = '';

        switch (e.code) {
            case FileError.QUOTA_EXCEEDED_ERR:
                msg = 'QUOTA_EXCEEDED_ERR';
                break;
            case FileError.NOT_FOUND_ERR:
                msg = 'NOT_FOUND_ERR';
                break;
            case FileError.SECURITY_ERR:
                msg = 'SECURITY_ERR';
                break;
            case FileError.INVALID_MODIFICATION_ERR:
                msg = 'INVALID_MODIFICATION_ERR';
                break;
            case FileError.INVALID_STATE_ERR:
                msg = 'INVALID_STATE_ERR';
                break;
            default:
                msg = 'Unknown Error';
                break;
        };

        console.log('Error: ' + msg);
        console.log('fileSystemErrorHandler invoked');
    }

    window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
    window.requestFileSystem(
        window.PERSISTENT, 10 * 1024 * 1024,
        onInitializeFileSystem,
        fileSystemErrorHandler
    );

    var startAppButton = document.querySelector('#startApp');
    //    startAppButton.innerHTML = "Press to start";
    $('#startApp')[0].innerHTML = "Press to begin";

    startAppButton.addEventListener('click', function (e) {
        console.log("startAppButton pressed");
        retrieveSyncSpec();
    });

    function retrieveSyncSpec() {

        console.log("retrieveSyncSpec invoked");

        $.ajax({
            url: "https://services.brightsignnetwork.com/bs/CheckForContent.ashx",
            type: 'GET',
            dataType: 'xml',
            headers: {
                "account":"ted",
                "password":"tedpwd",
                "group":"aws",
                "user":"teduser",
                "presentationName":"none",
                "DeviceID":"L4C49T000025",
                "DeviceModel":"XD1132",
                "DeviceFamily":"lynx",
                "DeviceFWVersion":"5.1.16",
                "DeviceSWVersion":"7.1.6",
                "CustomAutorunVersion":"7.1.0",
                "timezone":"PST",
                "localTime":"2014/12/09 15:35:37.936",
                "storage-size":"7631",
                "storage-fs":"fat32",
                "storage-current-used":"5"
            },
            error: function () { debugger; },
        })
        .success(function (data, textStatus, jqXHR) {
            console.log("get success");
            console.log(textStatus);
            parseSyncSpec($(data)[0])
        });
    }

    function parseSyncSpec(syncSpec) {

        var sync = syncSpec.childNodes[0]

        var meta = sync.children[0];
        var files = sync.children[1];

        var client = meta.children[0];
        var server = meta.children[1];

        var downloads = files.children;

        var downloadItems = [];

        $.each(downloads, function (index, download) {

            var downloadItem = {};

            $.each(download.children, function(index, downloadChild) {

                var value = downloadChild.innerHTML;

                switch (downloadChild.localName) {
                    case 'name':
                        downloadItem.name = value;
                        break;
                    case 'link':
                        downloadItem.link = value;
                        break;
                    case 'size':
                        downloadItem.size = value;
                        break;
                    case 'hash':
                        var method = downloadChild.attributes[0].name;
                        if (name == "method") {
                            if (nodeValue == "sha1") {
                                downloadItem.sha1 = value;
                            }
                        }
                        break;
                }                    
            });

            downloadItems.push(downloadItem);
        });

        downloadFiles(downloadItems);
    }

    function downloadFiles(downloadItems) {

        var filesToDownload = [];

        $.each(downloadItems, function (index, downloadItem) {
            // for now, only download image files (jpegs)
            if (downloadItem.name != undefined) {
                var fileName = downloadItem.name.toLowerCase();
                var n = fileName.lastIndexOf(".jpg");
                if (downloadItem.name.length == (n + 4)) {
                    console.log("found downloadItem " + downloadItem.name);
                    downloadItem.mimeType = "image/jpeg";
                    filesToDownload.push(downloadItem);
                }
                else {
                    n = fileName.lastIndexOf(".png");
                    var startIndex = fileName.lastIndexOf("applicationwebserver")
                    if (downloadItem.name.length == (n + 4) && (startIndex != 0)) {
                        console.log("found downloadItem " + downloadItem.name);
                        downloadItem.mimeType = "image/png";
                        filesToDownload.push(downloadItem);
                    }
                    else {
                        n = fileName.lastIndexOf(".mp4");
                        if (downloadItem.name.length == (n + 4)) {
                            console.log("found downloadItem " + downloadItem.name);
                            downloadItem.mimeType = "video/mp4";
                            filesToDownload.push(downloadItem);
                        }
                    }
                }
            }
        });

        fileToDisplay = filesToDownload[0];
        getFiles(filesToDownload);
    }

    function errorHandler() {
        debugger;
    }

    function getFiles(filesToRetrieve) {
        if (filesToRetrieve.length > 0) {
            var fileToRetrieve = filesToRetrieve.shift();
            readFile(fileToRetrieve, filesToRetrieve);
        }
        else {
            displayContent();
        }
    }

    function readFile(fileToRetrieve, filesToRetrieve) {

        // check to see if this file already exists in the file system
        _fileSystem.root.getFile(fileToRetrieve.name, {}, function (fileEntry) {

            // Get a File object representing the file,
            // then use FileReader to read its contents.
            fileEntry.file(function (file) {
                var reader = new FileReader();

                reader.onloadend = function (e) {   // this.result
                    var byteArray = new Uint8Array(this.result);
                    fileToRetrieve.blob = new Blob([byteArray], { type: fileToRetrieve.mimeType });
                    fileToRetrieve.blobURL = window.URL.createObjectURL(fileToRetrieve.blob);

                    filesToDisplay.push(fileToRetrieve);
                    getFiles(filesToRetrieve);
                };

                reader.readAsArrayBuffer(file);

            }, function (e) {
                fileSystemErrorHandler(e);
                downloadFile(fileToRetrieve, filesToRetrieve);
            });

        }, function (e) {
            fileSystemErrorHandler(e);
            downloadFile(fileToRetrieve, filesToRetrieve);
        });
    }

    function downloadFile(fileToDownload, filesToRetrieve) {

        // file does not exist; download it and write it once it is downloaded

        // see http://www.html5rocks.com/en/tutorials/file/xhr2/ for a way to avoid arraybuffer
        var oReq = new XMLHttpRequest();
        oReq.open("GET", fileToDownload.link, true);
        oReq.responseType = "arraybuffer";

        oReq.onload = function (oEvent) {
            var arrayBuffer = oReq.response; // Note: not oReq.responseText
            if (arrayBuffer) {

                var byteArray = new Uint8Array(arrayBuffer);
                fileToDownload.blob = new Blob([byteArray], { type: fileToDownload.mimeType });
                fileToDownload.blobURL = window.URL.createObjectURL(fileToDownload.blob);

                _fileSystem.root.getFile(fileToDownload.name, { create: true }, function (fileEntry) {
                    fileEntry.createWriter(function (fileWriter) {

                        fileWriter.onwriteend = function (e) {
                            console.log('Write completed: ' + fileToDownload.name);
                            filesToDisplay.push(fileToDownload);
                            getFiles(filesToRetrieve);
                        };

                        fileWriter.onerror = function (e) {
                            console.log('Write failed: ' + e.toString() + " on file " + fileToDownload.name);
                        };

                        fileWriter.write(fileToDownload.blob);

                    }, errorHandler);

                }, errorHandler);
            }
        };

        oReq.send(null);
    }

    function displayItem(index) {

        if (filesToDisplay[index].mimeType == "video/mp4") {
            $('#imageZone').hide();
            $('#videoZone').show();
            $("#videoZone").attr('src', filesToDisplay[index].blobURL);
            $('#videoZone')[0].load();
            $('#videoZone')[0].play();

            $("#videoZone").on("ended", function (e) {
                console.log("video ended");
                index = index + 1;
                if (index >= filesToDisplay.length) {
                    index = 0;
                }

                displayItem(index);
            });
        }
        else {
            $('#videoZone').hide();
            $('#imageZone').show();
            $("#imageZone").attr('src', filesToDisplay[index].blobURL);

            setTimeout(
                function () {
                    index = index + 1;
                    if (index >= filesToDisplay.length) {
                        index = 0;
                    }

                    displayItem(index);
                },
                2000);
        }
    }

    function displayContent() {
        var index = 0;

        //Returns format of: filesystem:chrome-extension://nlipipdnicabdffnohdhhliiajoonmgm/persistent/xxxxxxxxxxxx.png
        //<img src="filesystem:chrome-extension://nlipipdnicabdffnohdhhliiajoonmgm/persistent/xxxxxxxxxxxx.png">

        //var url = "filesystem:chrome-extension://colflmholehgbhkebgghaopnobppmcoe_0/persistent/" + filesToDisplay[index];
        //var url = "chrome-extension://colflmholehgbhkebgghaopnobppmcoe_0/persistent/" + filesToDisplay[index];
        //var url = "chrome-extension://colflmholehgbhkebgghaopnobppmcoe/persistent/" + filesToDisplay[index];
        //var url = "chrome-extension://colflmholehgbhkebgghaopnobppmcoe/" + filesToDisplay[index];
        //$("#imageInZone").attr('src', url);

        //$("#imageInZone").attr('src', poop);

        //$("#imageZone").attr('src', filesToDisplay[index].blobURL);

        //var index = 1;
        //if (index >= filesToDisplay.length) {
        //    index = 0;
        //}

        //var url = "./" + filesToDisplay[index].blobURL;

        displayItem(0);
    }
});
