(function() {
    if (window.ksRunnerInit) return;

    // This line gets patched up by the cloud
    var pxtConfig = {
    "relprefix": "/pxt-microbit-test/",
    "verprefix": "",
    "workerjs": "/pxt-microbit-test/worker.js",
    "monacoworkerjs": "/pxt-microbit-test/monacoworker.js",
    "gifworkerjs": "/pxt-microbit-test/gifjs/gif.worker.js",
    "pxtVersion": "5.28.23",
    "pxtRelId": "",
    "pxtCdnUrl": "/pxt-microbit-test/",
    "commitCdnUrl": "/pxt-microbit-test/",
    "blobCdnUrl": "/pxt-microbit-test/",
    "cdnUrl": "/pxt-microbit-test/",
    "targetVersion": "0.0.0",
    "targetRelId": "",
    "targetUrl": "",
    "targetId": "microbit",
    "simUrl": "/pxt-microbit-test/simulator.html",
    "partsUrl": "/pxt-microbit-test/siminstructions.html",
    "runUrl": "/pxt-microbit-test/run.html",
    "docsUrl": "/pxt-microbit-test/docs.html",
    "isStatic": true
};

    var scripts = [
        "/pxt-microbit-test/highlight.js/highlight.pack.js",
        "/pxt-microbit-test/bluebird.min.js",
        "/pxt-microbit-test/marked/marked.min.js",
    ]

    if (typeof jQuery == "undefined")
        scripts.unshift("/pxt-microbit-test/jquery.js")
    if (typeof jQuery == "undefined" || !jQuery.prototype.sidebar)
        scripts.push("/pxt-microbit-test/semantic.js")
    if (!window.pxtTargetBundle)
        scripts.push("/pxt-microbit-test/target.js");
    scripts.push("/pxt-microbit-test/pxtembed.js");

    var pxtCallbacks = []

    window.ksRunnerReady = function(f) {
        if (pxtCallbacks == null) f()
        else pxtCallbacks.push(f)
    }

    window.ksRunnerWhenLoaded = function() {
        pxt.docs.requireHighlightJs = function() { return hljs; }
        pxt.setupWebConfig(pxtConfig || window.pxtWebConfig)
        pxt.runner.initCallbacks = pxtCallbacks
        pxtCallbacks.push(function() {
            pxtCallbacks = null
        })
        pxt.runner.init();
    }

    scripts.forEach(function(src) {
        var script = document.createElement('script');
        script.src = src;
        script.async = false;
        document.head.appendChild(script);
    })

} ())
