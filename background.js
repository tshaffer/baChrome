chrome.app.runtime.onLaunched.addListener(function () {
    console.log("about to create chrome window");
    debugger;
    chrome.app.window.create('index.html', {
        'bounds': {
            'left': 64,
            'top': 64,
            'width': 1024,
            'height': 900
        }
    });
    console.log("window successfully created");
});
