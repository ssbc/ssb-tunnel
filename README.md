## ssb-tunnel

Indirectly connect to a peer by tunneling through another
connection. If A is connected to B, and C is connected to B,
this allows C to connect to A by using B as a proxy or "portal".

With this module, a peer `A` with an unstable IP address can
make a long term connection to a portal `B`, another peer `C` can then connect
to that portal, and tunnel back up the client connection `C->B`,
giving us a connect _through_ `B`, `C-(B)->A`.

```
,---,      ,---,     ,---,
|   |----->|   |<----|   |
| A |<=====|-B-|<====| C |
|   |----->|   |<----|   |
`---`      `---`     `---`
```
A connects to B, and waits to receive tunnel connections.
C connects to B, and then requests a tunnel through that
connection (B-C) to A. B calls A, creating an incomming tunnel,
and attaches one end to C's request, C then uses the standard
handshake to authenticate A.

Notice that for the tunnel, A is the server and C is the client
(client calls, server answers) but B is just the portal.
The tunnel is _inside_ the outer connections,
which means it is encrypted twice. This means A and C can mutually
authenticate each other, and B cannot see the content of their connection.

The arrows represent the _direction_ of the connection - from the client,
pointing to the server. Notice the `B<=C` tunnel is the same direction as the `B<-C` container,
but the `A<=B` tunnel is the opposite direction as the `A->B` container.

# address

tunnel addresses are multiserver style:

`tunnel:<portal_id>:<target_id>:<port>?` for example:
`tunnel:@7MG1hyfz8SsxlIgansud4LKM57IHIw2Okw/hvOdeJWw=.ed25519:@1b9KP8znF7A4i8wnSevBSK2ZabI/Re4bYF/Vh3hXasQ=~shs:7MG1hyfz8SsxlIgansud4LKM57IHIw2Okw/hvOdeJWw=.ed25519`
(port is optional)

It is assumed that a peer who wishes to be a client to
`target` already has a means to connect to `portal`.
The address of the portal is left out, so that the client
can use anything, and also, to better preserve the privacy
of the portal.

For the protocol portion of the multiserver address,
`tunnel:portal:target:port`
this will include the `shs` portion for the portal.
`port` is just an integer that tells the server which
`ssb-tunnel` instance the client wants to connect to.
(port is used so that there can be multiple instances
running with different transform protocols)

`target` is a ssb feed id, which represents the peer.
This tells the portal that C wants a connection to A.
`portal` tells A how to connect to B. 

## privacy proposal

Instead of using `tunnel:<portal>:<target>`
use `tunnel:<hmac(portal, target)>` then, you have to already
know the portal to make sense of the target. knowing the address
of the target does not automatically leak the address of the portal.

## how it works

for 3 peers, A, B, and C. A being the client-side server, which
will receive the tunnel connection, B being the portal, and C
being the client who connects to A via B.

First A connects to B normally, then calls `B.tunnel.announce()`
This informs B that A would like to receive connections tunneled
though B. (B puts A into a table of endpoints it can provide tunnels
to)

Then C connects to B, and then calls `B.tunnel.connect({id: A.id})`
B then checks if it can provide a connection to A, which it can,
and calls `endpoints[A.id].tunnel.connect({id: A})` returning this stream
to B (B is now connected to A via C).

B then initiates a [`secret-handshake`](https://github.com/auditdrivencrypto/secret-handshake) through the tunnel, hiding subsequent content from B.


## License

MIT













