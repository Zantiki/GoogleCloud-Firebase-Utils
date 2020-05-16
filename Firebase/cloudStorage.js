
const fs = require("fs");
const uuidv4 = require('uuid/v4');
const Cloud = require('@google-cloud/storage');
const path = require('path');
const util = require('util');

// Todo: Create private and public Cloud Storage Buckets
// Todo: Set the names of your storage buckets and Google Cloud project
let projectName = "myProject";
let privateBucket = "myPrivate";
let publicBucket = "myBucket";
const serviceKey = "ce_credential.json";

const { Storage } = Cloud;
const storage = new Storage({
    keyFilename: serviceKey,
    projectId: projectName,
});

let bucket = storage.bucket(publicBucket);

/*
* exported functions in this document
*
* uploadToCloud(base64String, fileName, isPublic, overwrite)
*
* upload(buffer, name, isPublic, type, overwrite)
*
* downloadFromCloud(filename), only works for private files
*
* getNameFromUrl(url, isPublic)
*
* deleteFromCloud(filename, isPublic)
*
 */


/**
 * Takes in a base64String, then seperates the data from the content-type,
 * before creating a buffer object to be utilized by the upload function.
 * The is public and overwrite attributes set whether you will
 * upload to the public GCS-bucket or the private one.
 * returns the file-url on resolved promise.
 *
 * @param: {string} base64String
 * @param: {string} filename
 * @param: {boolean} isPublic
 * @param: {boolean} overwrite
 *
 * @return Promise (url: string)
 */

const uploadToCloud = (base64String, filename, isPublic, overwrite) => {
    let data = base64String.split(",", 2 );
    let type = data[0].split(";")[0];
    let buf = new Buffer.from(data[1], "base64");
    return upload(buf, filename, isPublic, type, overwrite).then(res => {
        return res;
    })
        .catch(err => console.error(err));
};

/**
 * Takes in a buffer and generates a unique name,
 * then resolves the bucket url once finished.
 * Mainly used as a helper method for uploadToCloud
 *
 * @param: {Buffer} buffer
 * @param: {string} filename
 * @param: {boolean} isPublic - specifies the bucket to upload to
 * @param: {string} type - the content-type of the data in the buffer
 * @param: {boolean} overwrite
 *
 * @return Promise (url: string)
 */

const upload = (buffer, name, isPublic, type, overwrite) => new Promise((resolve, reject) => {
    let blob = null;
    let data = name.split(".", 2);
    let newFileName = uuidv4() + "." + data[1];
    if (overwrite) {
        newFileName = name;
    }
    let bucketname = "";
    if (isPublic) {
        bucket = storage.bucket(publicBucket);
        blob = bucket.file(newFileName);
        bucketname = bucket.name;
    } else if (!isPublic) {
        bucket = storage.bucket(privateBucket);
        blob = bucket.file(newFileName);
        bucketname = bucket.name;
    }
    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: type
        },
        resumable: false
    });
    blobStream.on('finish', () => {
        const publicUrl = util.format(
            `https://storage.googleapis.com/${bucketname}/${blob.name}`
        );
        resolve({url: publicUrl, name: blob.name});
    })
        .on('error',  function(err) {
            console.error(err);
            reject(`Unable to upload image, something went wrong`)
        })
        .end(buffer)
})


/**
 * Downloads the file specifed by the name paramater
 * from the private bucket, and returns a promise that resolves to the
 * complete base64 string (content-type + representation specifier + data)
 *
 * @param: {Buffer} buffer
 * @param: {string} filename
 * @param: {boolean} isPublic - specifies the bucket to upload to
 * @param: {string} type - the content-type of the data in the buffer
 * @param: {boolean} overwrite
 *
 * @return Promise (url: string)
 */

function downloadFromCloud(name) {
    let bucket = storage.bucket(privateBucket);
    let file = bucket.file(name);
    return file.download()
        .then(result => {
            let base64String = result[0].toString("base64");
            return file.metadata.contentType + ";base64," + base64String;
        })
        .catch(err => {
            console.error(err);
        });

}

function getNameFromUrl(url, pub) {
    let cloudString = "";
    if (pub) {
        cloudString = "https://storage.googleapis.com/"+publicBucket+"/";
    } else {
        cloudString = "https://storage.googleapis.com/"+privateBucket+"/"
    }
    let contents = url.split(cloudString, 2);
    return contents[1]

}

/**
 * Attempts to delete the file specified by the name parameter.
 *
 * @param: {string} filename
 * @param: {isPublic} boolean
 *
 * @return undefined
 */

function deleteFromCloud(filename, isPublic) {
    if (!filename) {
        return;
    }
    let blob = null;
    if (isPublic) {
        bucket = storage.bucket(publicBucket);
        blob = bucket.file(filename);
    } else if (!isPublic) {
        bucket = storage.bucket(privateBucket);
        blob = bucket.file(filename);
    }
    blob.delete().catch(err => console.error(err));
    return;
}


module.exports = {uploadToCloud, downloadFromCloud, deleteFromCloud, getNameFromUrl};


