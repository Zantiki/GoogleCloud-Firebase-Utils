const express = require("express");
let cors = require("cors");
let bodyParser = require("body-parser");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const vmHandler = require("./vmhandler");

const app = express();
app.use(cors({origin: true}));
app.use(bodyParser.json());

if (!process.env.FIREBASE_CONFIG) {
    app.listen(8080);
} else {
    const main = express();
    main.use('/api/v1', app);
    main.use(cors({origin: true}));
    functions.region('europe-west1');
    /*main.use(bodyParser.json());
    main.use(bodyParser.urlencoded({extended: true}));*/
    exports.webApi = functions.https.onRequest(main);
}

if(!process.env.FIREBASE_CONFIG){
    console.log("local enviroment");

}else{
    console.log("Deploy enviroment");
}

app.get("/test", (req, res) =>{
    res.send("success");
});

app.post("/code", (req, res) => {
    console.log("method called");
    vmHandler.getVMIP("custom-server").then(ip => {
        console.log("Ip on server: " + ip);
        vmHandler.connectAndCompile(ip, 8080, req.body.code)
            .then(data => {
                console.log(data);
                res.send({data: data.toString()})
            })
            .catch(err => res.send({data: err.message}));
    })
        .catch(err => res.status({data: err.message}));
});