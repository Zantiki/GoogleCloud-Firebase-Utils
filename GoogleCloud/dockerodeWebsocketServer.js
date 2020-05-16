const express = require("express");
let cors = require("cors");
let fs = require("fs");
let bodyParser = require("body-parser");
const net = require("net");
const crypto = require("crypto");
let docker = require('dockerode');
let readable = require('stream').Readable;
var newStream = require('stream');

//TODO: Fix stop and remove

/*const app = express();
app.use(cors({origin: true}));
app.use(bodyParser.json());
var server = https.createServer(options, app);*/

let clients = [];
let pyDocker = new docker();

function generateAcceptValue(acceptKey) {
      return crypto
            .createHash("sha1")
            .update(acceptKey + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
            .digest("base64");
    }

//app.listen(8080);

server = net.createServer(conn => {
            console.log("Client connected");
            
            conn.on("data", data => { 
                if (data.toString()[0] != "G") { 
                        compile(data, conn);
                }else{
                            let key = data.toString().substring(data.toString().indexOf("-Key: ") + 6,data.toString().indexOf("==") + 2);
                    let acceptValue = generateAcceptValue(key);

                    const responseHeaders = [
                        "HTTP/1.1 101 Web Socket Protocol Handshake",
                        "Upgrade: websocket",
                        "Connection: Upgrade",
                        "Sec-WebSocket-Accept:" + acceptValue
                    ];

                    conn.write(responseHeaders.join("\r\n") + "\r\n\r\n");
                    clients.push(conn);
                }
            });
            conn.on("end", () => {
                          console.log("Client disconnected");
                          const index = this.clients.indexOf(conn);
                          if (index > -1) {
                              this.clients.splice(index, 1);
                          }
                      });
});

server.on("error", error => {
            console.error("Error: ", error);
});


server.listen(8080, () => {
  console.log("WebSocket server listening on port "+ 8080 );
});



function decode (data){
        let message = "";
        let length = data[1] & 127;
        let maskStart = 2;
        let dataStart = maskStart + 4;

        for (let i = dataStart; i < dataStart + length; i++) {
            let byte = data[i] ^ data[maskStart + ((i - dataStart) % 4)];
            message += String.fromCharCode(byte);
        }
        console.log("Message reads: "+message);
        return message;
    }

function encode(message){
        let msg = JSON.stringify(message);
        let buffer = Buffer.concat([
            new Buffer.from([
                0x81,
                "0x" +
                (msg.length + 0x10000)
                    .toString(16)
                    .substr(-2)
                    .toUpperCase()
            ]),
            Buffer.from(msg)
        ]);
        return buffer;
    }

async function execute(command, container) {
    console.log("Setting EXEC");
    const exec = await container.exec({
        Cmd: command,
        //Cmd: command,
        AttachStdout: true,
        AttachStderr: true
    });
    return new Promise(async (resolve, reject) => {
        console.log("Creating promise");
        await exec.start(async (err, stream) => {
            if (err) return reject();
            let message = '';
            console.log("listening for data");
            stream.on('data', chunk => {
                //message = chunk.toString();
                console.log(Object.keys(chunk));
                let buf = clean(chunk);
                message = buf.toString();
                stream.close = true;
                stream.destroy();
                resolve(message);

            });
           // stream.on('end', () => resolve(message));
        });
    });
}

function clean(buffer){
    let jBuffer = buffer.toJSON();
    let data = jBuffer.data.slice(8);
    return new Buffer(data);
}

function compile(code, conn){
    // pyDocker.
    console.log(code.toString());
    let cmd = code.toString();
    pyDocker.createContainer({
        Image: 'python',
        Tty: true,
        Cmd: ['/bin/bash']
    }).then(function(container) {
        return container.start(function(err, data){
            return execute(["python", "-c", cmd], container)
                .then(message => {
                    console.log(message);
                    try{
                        conn.write(message);
                    }catch{
                        console.log("Connection lost");
                    }

            });
        });
    }).then(container => {
        container.stop();
    })
    .then(container => {
        container.remove(function (err, data) {
            console.log(data);
        });
    });

}
