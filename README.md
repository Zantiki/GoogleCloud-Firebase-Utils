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

#
Written by Sebastian Ikin 16/05/2020
 