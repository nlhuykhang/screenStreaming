// ffmpeg.exe -y -rtbufsize 1000M -loglevel warning -f dshow -i video="screen-capture-recorder" -r 25 -s 640x400 -threads 2 -f ogg -crf 0 -preset ultrafast -maxrate 3000k -bufsize 6000k -g 50

(function() {
    var childProcess = require("child_process");
    oldSpawn = childProcess.spawn;

    function mySpawn() {
        console.log('spawn called');
        console.log(arguments);
        var result = oldSpawn.apply(this, arguments);
        return result;
    }
    childProcess.spawn = mySpawn;
})();

var child_process = require('child_process'),
    pass = require('stream').PassThrough,
    http = require('http'),
    url = require('url'),
    fs = require('fs'),
    static = require('node-static'),
    ffmpeg = null,
    holder = new pass,
    conNum = 0,
    con = [],
    files = new(static.Server)();


var livestream = function(req, resp) {

    if (req.url === '/') {
        fs.readFile('./video-js/liveStream.html', function(err, html) {
            if (!err) {
                resp.writeHead(200, {
                    "Content-Type": "text/html"
                });
                resp.write(html);
                resp.end();
            }
        });
    } else {
        if (req.url === '/live') {
            var s = new pass;

            resp.writeHead(200, {
                "Connection": "keep-alive",
                "Content-Type": "video/ogg",
                "Accept-Ranges": "bytes" // Helps Chrome
            });

            if (!ffmpeg) {
                ffmpeg = child_process.spawn('ffmpeg.exe', [
                    '-i', 'udp://localhost:6666/',
                    '-f', 'ogg',
                    '-'
                ], {
                    detached: false
                });

                ffmpeg.stdout.on("data", function(data) {
                    console.log("Data");
                });

                ffmpeg.stderr.on("data", function(data) {
                    console.log("Error -> " + data);
                });

                ffmpeg.on("exit", function(code) {
                    console.log("ffmpeg terminated with code " + code);
                });

                ffmpeg.on("error", function(e) {
                    console.log("ffmpeg system error: " + e);
                });
            }

            ffmpeg.stdout.pipe(s);

            s.pipe(resp);

            req.on("close", function() {
                shut("closed");
            })

            req.on("end", function() {
                shut("ended");
            });

            function shut(event) {
                //TODO: Stream is only shut when the browser has exited, so switching screens in the client app does not kill the session
                console.log("Live streaming connection to client has " + event)
                if (ffmpeg) {
                    // ffmpeg.kill();
                    // ffmpeg = null;
                }
            }

        } else {
            files.serve(req, resp);
        }
    }
    return true;
}

var http_server = http.createServer(livestream).listen(3000, function() {
    console.log("Server listening on port 3000");
});