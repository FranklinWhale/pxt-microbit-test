initWebappServiceWorker();
function initWebappServiceWorker() {
    // Empty string for released, otherwise contains the ref or version path
    var ref = "@relprefix@".replace("---", "").replace(/^\//, "");
    // We don't do offline for version paths, only named releases
    var isNamedEndpoint = ref.indexOf("/") === -1;
    // pxtRelId is replaced with the commit hash for this release
    var refCacheName = "makecode;" + ref + ";@pxtRelId@";
    var cdnUrl = "@cdnUrl@";
    var webappUrls = [
        // The current page
        "@targetUrl@/" + ref,
        "@simUrl@",
        // webapp files
        "/pxt-microbit-test/semantic.js",
        "/pxt-microbit-test/main.js",
        "/pxt-microbit-test/pxtapp.js",
        "/pxt-microbit-test/typescript.js",
        "/pxt-microbit-test/marked/marked.min.js",
        "/pxt-microbit-test/highlight.js/highlight.pack.js",
        "/pxt-microbit-test/jquery.js",
        "/pxt-microbit-test/pxtlib.js",
        "/pxt-microbit-test/pxtcompiler.js",
        "/pxt-microbit-test/pxtpy.js",
        "/pxt-microbit-test/pxtblockly.js",
        "/pxt-microbit-test/pxtwinrt.js",
        "/pxt-microbit-test/pxteditor.js",
        "/pxt-microbit-test/pxtsim.js",
        "/pxt-microbit-test/pxtembed.js",
        "/pxt-microbit-test/pxtworker.js",
        "/pxt-microbit-test/pxtweb.js",
        "/pxt-microbit-test/blockly.css",
        "/pxt-microbit-test/semantic.css",
        "/pxt-microbit-test/rtlsemantic.css",
        // blockly
        "/pxt-microbit-test/blockly/media/sprites.png",
        "/pxt-microbit-test/blockly/media/click.mp3",
        "/pxt-microbit-test/blockly/media/disconnect.wav",
        "/pxt-microbit-test/blockly/media/delete.mp3",
        // monaco; keep in sync with webapp/public/index.html
        "/pxt-microbit-test/vs/loader.js",
        "/pxt-microbit-test/vs/base/worker/workerMain.js",
        "/pxt-microbit-test/vs/basic-languages/bat/bat.js",
        "/pxt-microbit-test/vs/basic-languages/cpp/cpp.js",
        "/pxt-microbit-test/vs/basic-languages/python/python.js",
        "/pxt-microbit-test/vs/basic-languages/markdown/markdown.js",
        "/pxt-microbit-test/vs/editor/editor.main.css",
        "/pxt-microbit-test/vs/editor/editor.main.js",
        "/pxt-microbit-test/vs/editor/editor.main.nls.js",
        "/pxt-microbit-test/vs/language/json/jsonMode.js",
        "/pxt-microbit-test/vs/language/json/jsonWorker.js",
        // charts
        "/pxt-microbit-test/smoothie/smoothie_compressed.js",
        "/pxt-microbit-test/images/Bars_black.gif",
        // gifjs
        "/pxt-microbit-test/gifjs/gif.js",
        // ai
        "/pxt-microbit-test/ai.0.js",
        // target
        "/pxt-microbit-test/target.js",
        // These macros should be replaced by the backend
        "/pxt-microbit-test/fieldeditors.js",
        "/pxt-microbit-test/editor.js",
        "",
        "@targetUrl@/pxt-microbit-test/monacoworker.js",
        "@targetUrl@/pxt-microbit-test/worker.js"
    ];
    // Replaced by the backend by a list of encoded urls separated by semicolons
    var cachedHexFiles = decodeURLs("");
    var cachedTargetImages = decodeURLs("%2Fpxt-microbit-test%2Fdocs%2Fstatic%2Flogo.portrait.white.svg;%2Fpxt-microbit-test%2Fdocs%2Fstatic%2Flogo.square.white.svg;%2Fpxt-microbit-test%2Fdocs%2Fstatic%2Flogo.square.white.svg;%2Fpxt-microbit-test%2Fdocs%2Fstatic%2Flogo.portrait.black.svg;%2Fpxt-microbit-test%2Fdocs%2Fstatic%2Ficons%2Fapple-touch-icon.png;%2Fpxt-microbit-test%2Fdocs%2Fstatic%2Ficons%2Fapple-touch-icon.png;%2Fpxt-microbit-test%2Fdocs%2Fstatic%2FMicrosoft-logo_rgb_c-gray-square.png;%2Fpxt-microbit-test%2Fdocs%2Fstatic%2FMicrosoft-logo_rgb_c-white.png;%2Fpxt-microbit-test%2Fdocs%2Fstatic%2Fhero.png");
    // Duplicate entries in this list will cause an exception so call dedupe
    // just in case
    var allFiles = dedupe(webappUrls.concat(cachedTargetImages)
        .map(function (url) { return url.trim(); })
        .filter(function (url) { return !!url && url.indexOf("@") !== 0; }));
    var didInstall = false;
    self.addEventListener("install", function (ev) {
        if (!isNamedEndpoint) {
            console.log("Skipping service worker install for unnamed endpoint");
            return;
        }
        didInstall = true;
        console.log("Installing service worker...");
        ev.waitUntil(caches.open(refCacheName)
            .then(function (cache) {
            console.log("Opened cache");
            console.log("Caching:\n" + allFiles.join("\n"));
            return cache.addAll(allFiles).then(function () { return cache; });
        })
            .then(function (cache) {
            return cache.addAll(cachedHexFiles).catch(function (e) {
                // Hex files might return a 404 if they haven't hit the backend yet. We
                // need to catch the exception or the service worker will fail to install
                console.log("Failed to cache hexfiles");
            });
        })
            .then(function () { return self.skipWaiting(); }));
    });
    self.addEventListener("activate", function (ev) {
        if (!isNamedEndpoint) {
            console.log("Skipping service worker activate for unnamed endpoint");
            return;
        }
        console.log("Activating service worker...");
        ev.waitUntil(caches.keys()
            .then(function (cacheNames) {
            // Delete all caches that "belong" to this ref except for the current version
            var toDelete = cacheNames.filter(function (c) {
                var cacheRef = getRefFromCacheName(c);
                return cacheRef === null || (cacheRef === ref && c !== refCacheName);
            });
            return Promise.all(toDelete.map(function (name) { return caches.delete(name); }));
        })
            .then(function () {
            if (didInstall) {
                // Only notify clients for the first activation
                didInstall = false;
                return notifyAllClientsAsync();
            }
            return Promise.resolve();
        }));
    });
    self.addEventListener("fetch", function (ev) {
        ev.respondWith(caches.match(ev.request)
            .then(function (response) {
            return response || fetch(ev.request);
        }));
    });
    function dedupe(urls) {
        var res = [];
        for (var _i = 0, urls_1 = urls; _i < urls_1.length; _i++) {
            var url = urls_1[_i];
            if (res.indexOf(url) === -1)
                res.push(url);
        }
        return res;
    }
    function getRefFromCacheName(name) {
        var parts = name.split(";");
        if (parts.length !== 3)
            return null;
        return parts[1];
    }
    function decodeURLs(encodedURLs) {
        var cdnEscaped = "@" + "cdnUrl" + "@";
        return dedupe(encodedURLs.split(";")
            .map(function (encoded) { return decodeURIComponent(encoded).replace(cdnEscaped, cdnUrl).trim(); }));
    }
    function notifyAllClientsAsync() {
        var scope = self;
        return scope.clients.claim().then(function () { return scope.clients.matchAll(); }).then(function (clients) {
            clients.forEach(function (client) { return client.postMessage({
                type: "serviceworker",
                state: "activated",
                ref: ref
            }); });
        });
    }
}
