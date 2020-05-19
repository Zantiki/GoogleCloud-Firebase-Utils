
const Compute = require('@google-cloud/compute');
const uuidv4 = require('uuid');
var ping = require('ping');
const path = require('net');
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

function getVMIP(vmName) {
    let vms = [];
    return new Promise(async (resolve, reject) => {
        compute.getVMs().then(data => {
            vms = data[0];
            console.log("got vms");
            //console.log(vms);

            if (vms.length > 0) {
                vms.map(vm => {
                    console.log(vm);
                    if ((vm.metadata.name === vmName) && vm.metadata.status === "RUNNING") {
                        console.log(vm.metadata.networkInterfaces[0].accessConfigs[0].natIP);
                        resolve(vm.metadata.networkInterfaces[0].accessConfigs[0].natIP);
                    }
                })
            }
            reject();

        }).catch(err => {
            console.log(err);
            reject();
        });

    });

}

function connectAndCompile(ip, port, code){
    return new Promise(async (resolve, reject) => {
        console.log("Creating promise");

        setTimeout(function () {
            reject(new Error("VM connection timed out..."))
        }, 60000);

        let ws = net.createConnection({port: port, host: ip}, () =>{
            console.log("response from vm");
            ws.write("GET / HTTP/1.0\r\n\r\n");
        });

        ws.on('error', function (err) {
            console.log(err);
            reject(new Error("A VM-Error Occured..."));
        });
        /*ws.onerror = event => {
            console.log("Socket error");
            reject();
        }*/


        ws.onopen = event => {

            console.log("Connected to docker");
        };

        ws.onclose = ()  => {
            //this.ws = new WebSocket('ws://localhost:3001');
            return reject();
            console.log("Disconnected");
        };


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
    //let name = await createVM("print('hello world!')");
   // await deleteVM(name);
    console.log("running test");
    getVMIP("custom-server");
}

test();

module.exports = {createVM, getVMIP, connectAndCompile};