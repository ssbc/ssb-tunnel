
/*
  to run this script:

  first choose a endpoint to receive the tunnel (your laptop),
  and a portal (your pub)

  on the pub, install this ssb-tunnel plugin and activate it.
  you do not need to configure anything else.

  on the endpoint, add the following configuration.

  "connections": {
    "incoming": {
      "tunnel": [{"scope": "public", "portal": "@DTNmX+4SjsgZ7xyDh5xxmNtFqa6pWi5Qtw7cE8aR9TQ=.ed25519", "transform": "shs"}],
      "net": [{"scope": "private", "transform": "shs", "port": 8008}]
    }
  }

  then you need to get your addresses for your target and portal,
  use the command `sbot getAddress public` for both.
  the target address should start with "tunnel:<portal_id>:<target_id>"

  make sure your portal is running, your end point is running,
  then start this script with:

  node example.js <portal_address> <target_address>

  if it works, it will output a bunch of logging stuff ending
  in `CONNECTED <target_id>`
  and then something like:

  {
    whole: 824, //roundtrip time
    first: 447, //time of packet from us to them
    second: 377, //time of packet from them to us
    us: 1538607498423, //our send time
    them: 1538607498870 //their send time
  }

  I have tested this bouncing a connection via my server
  back to my laptop!

*/

var portal_addr = process.argv[2]
var target_addr = process.argv[3]

var crypto = require('crypto')
var Scuttlebot = require('scuttlebot')
.use(require('scuttlebot/plugins/gossip'))
.use(require('../'))

var ssbKeys = require('ssb-keys')

function hash (s) {
  return crypto.createHash('sha256').update(s).digest()
}

var keys = ssbKeys.generate()


var client = Scuttlebot({
  port: 1235, temp: true, keys: keys,
  seeds: [portal_addr],
  timers: {
    inactivity: -1, handshake: 30000
  },
  connections: {
    outgoing: {
      net: [{transform: 'shs'}],
      tunnel: [{transform: 'shs'}]
    }
  }
})

var timer
;(function again () {
  client.connect(target_addr, function (err, rpc) {
    if(err) throw err
    console.log("CONNECTED", rpc.id)
    ;(function ping () {
      var ts = Date.now()
      rpc.tunnel.ping(function (err, _ts) {
        if(err) {console.error(err); return reconnect()}
        else console.log({whole: Date.now()-ts, first:_ts - ts, second:Date.now() - _ts, us: ts, them: _ts})
        clearTimeout(timer)
        timer = setTimeout(ping, 30e3)
      })
    })()
    rpc.on('closed', function () {
      console.log("CLOSED")
      clearTimeout(timer)
      setTimeout(again, 1000*Math.random())
    })
  })
})()







