
const Compute = require('@google-cloud/compute');
const uuidv4 = require('uuid/v4');
var ping = require('ping');

const path = require('path');
const serviceKey = path.join(__dirname, './ce_credential.json');


const compute = new Compute({
        keyFilename: serviceKey,
        projectId: 'portfolio-91287',
    }
);

const zone = compute.zone('us-central1-a');

async function pingVM(ip) {
    let host = ip;
    console.log("Pinging: "+ip);
    let msg = await ping.promise.probe(host);
    console.log("Connection: "+msg);
}

function connectAndCompile(ip, port, code){
    return new Promise(async (resolve, reject) => {
        console.log("Creating promise");
        let ws = net.createConnection({port: port, host: ip}, () =>{
            console.log("response from vm");
            ws.write("GET / HTTP/1.0\r\n\r\n");
        });

        ws.onopen = event => {

            console.log("Connected to docker");
        };

        ws.onclose = ()  => {
            //this.ws = new WebSocket('ws://localhost:3001');
            return reject();
            console.log("Disconnected");
        };

        ws.onerror = event => {
            console.log("Socket error");
            return reject();
        }

        ws.on('data', function (data) {
            console.log(data.toString());
            //this.output = data;
            if(data[0] != 72){
                resolve(data);
            }else{
                console.log(code);
                ws.write(code);
            }
        });
    });
}

async function createVM(code) {
    const vmName = "a"+uuidv4();
    const [vm, operation] = await zone.createVM(vmName, {
            os: 'ubuntu',
            http: true,
            machineType: 'f1-micro',
            metadata: {
                items: [
                    {
                        key: 'startup-script',
                        value: `#! /bin/bash
              # Installs apache and a custom homepage
              apt-get update
              apt-get install python
              python -c `+code
                    },
                ],
            },
        });
    console.log(vm);
    await operation.promise();

    console.log('Acquiring VM metadata...');
    const [metadata] = await vm.getMetadata();
    console.log(metadata);

    // External IP of the VM.
    const ip = metadata.networkInterfaces[0].accessConfigs[0].natIP;
    console.log(`Booting new VM with IP http://${ip}...`);

    // Ping the VM to determine when the HTTP server is ready.
    console.log('Operation complete. Waiting for IP');
    await pingVM(ip);
    console.log('Virtual machine established on '+ip);
    return vmName;
}

async function deleteVM(vm_name) {
    const vm = zone.vm(vm_name);
    const [operation] = await vm.delete();
    await operation.promise();
    console.log(`VM deleted!`);
}

async function test(){
    let name = await createVM("print('hello world!')");
   // await deleteVM(name);
}

module.exports = {createVM}