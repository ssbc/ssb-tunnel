
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

var path = require('path')

//create a secret-stack peer with no database.
//just enough stuff to put ssb-tunnel and ssb-gossip on top of it.

var SecretStack = require('secret-stack')({})
.use({
  //this is enough ssb-db methods that ssb-gossip will run.
  version: '1.0.0',
  manifest: {
    status: 'sync',
    progress: 'sync'
  },
  init: function () {
    return {
      status: function () { return {} },
      progress: function () { return {} },
      ready: function (fn) { fn && fn(true); return true },
      post: function (fn) {
        //ssb-db would call this when a new message arrives, but that never happens here
      }
    }
  }
})
.use(require('ssb-gossip'))
.use(require('../'))
.use(require('ssb-ws'))

var ssbKeys = require('ssb-keys')
var keys = ssbKeys.generate()

module.exports = function (portal_addr) {
  return SecretStack({
    path: path.join(process.env.HOME || '/browser', '.' + (process.env.ssb_appname || 'ssb')),
    port: 1235, temp: true, keys: keys,
    caps: require('ssb-server/caps'),
    seeds: [portal_addr],
    gossip: {
      pub: false
    },
    timers: {
      inactivity: -1, handshake: 30000
    },
    connections: {
      outgoing: {
//        net: [{transform: 'shs'}],
        ws: [{transform: 'shs'}],
        tunnel: [{transform: 'shs'}]
      }
    }
  })

}

if(!module.parent && process.title != 'browser') {

  var timer
  ;(function again () {
    var portal_addr = process.argv[2]
    var target_addr = process.argv[3]

    var node = module.exports(portal_addr)

    node.connect(target_addr, function (err, rpc) {
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

}


