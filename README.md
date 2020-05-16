# GoogleCloud-Firebase-Utils
Various JavaScripts for connecting Firebase Cloud Functions to different Google Cloud apis. Most of the code is written for own learning.

The main reason I created this repository is to bridge the gap between
Cloud Engine and the Firebase related Cloud Functions. Cloud Functions
has certain limitations like inability to make outbound http-requests and
access OS-related functions. 

To work around this we can create a VM over Cloud Engine, and connect
through a TCP socket in our Cloud Function. The code here creates a 
VM on an F1-micro shared core in Compute Engine, 
and installs docker and Node. The reason we create a F1-micro core is to stay
within Google Cloud's free-tier. 

Sadly, since the F1-micro core is shared, it is delegated a new external 
IP-address each time it is started. The VM-handler script has some functionality
to resolve whether the IP-address for a VM exists or not, and can be
leveraged to work around this issue. Because the VM doesn't have a fixed
ip, we cannot generate the necessary SSL-certificates to 
implement https (Causing a mixed content error if a in-browser client
with HTTPS content connects directly).
Therefore the VM-works best with a Cloud Functions server as a proxy.

The VM-server does however communicate over Websocket and can be accessed
from endpoints that don't check for mixed content. For this reason, it's important that
the TCP-socket at vmhandler sends the correct request on connect so that
the Websocket protocol is implemented correctly.

This repo tries to work around these issues and more.

# Setup
You need to generate a service account for each of the Google 
Cloud services you use. Put the generated JSON files under Firebase.
_ce_credential_ for Cloud Engine and _cs_crendential_ for Cloud Storage.

Once you have started a new VM on cloud engine, clone this repo
into the VM and run the _vminstall_ script under the GoogleCloud folder
(or just copy the commands). To start the server run 
```console
sudo npm install
sudo nohup node dockerodeWebsocketServer.js &
```
You can now close the ssh-terminal.
Take note of the external IP-address the machine. You will need this 
when implementing the _compileAndRun_ function in your Firebase server. 
The VM server also runs over port 8080, so you need to open this port
in the VMs network settings (just change the default http from 80 to 8080).

If you wish to implement the _vmstartupscript_ make sure that you
change to commands to match your file-structure. 
 

#
Written by Sebastian Ikin 16/05/2020
 