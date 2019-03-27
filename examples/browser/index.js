
// a minimal interface to tunnel to a remote, to test from a browser
var pull = require('pull-stream')
var ssbKeys = require('ssb-keys')
var PortalClient = require('ssb-client')
var TunnelClient = require('secret-handshake').createClient

var QS = require('querystring')
var qs = QS.parse(window.location.search.substring(1))

var target = decodeURIComponent(qs.target)
var portal = decodeURIComponent(qs.portal)

var keys
try {
 keys = JSON.parse(localStorage.secrets)
} catch (err) {
  var keys = ssbKeys.generate()
  localStorage.secrets = JSON.stringify(keys)
}

console.log('loaded keys:', keys.id)
var config = require('ssb-config')
var timeout = 5000

var MuxRpc = require('muxrpc')

function toBuffer(s) {
  if(~s.indexOf('.'))
    return Buffer.from(s.substring(0, s.indexOf('.')), 'base64')
  else
    return Buffer.from(s, 'base64')
}

//var portal = process.argv[2]
//var target = process.argv[3]

function toSodiumKeys(keys) {
  if(!keys || !keys.public) return null
  console.log(keys)
  return {
    publicKey: toBuffer(keys.public),
    secretKey: toBuffer(keys.private)
  }
}
console.log('target:', target)
console.log('keys:', keys)
var Client = TunnelClient(toSodiumKeys(keys), toBuffer(config.caps.shs), timeout)

var timer
;(function connect () {
  console.error('connecting to portal:', portal)

  function reconnect () {
    if(timer) return
    console.error('waiting to reconnect')
    timer = setTimeout(function () {
      timer = null
      connect()
    }, 500 + Math.random() * 1000)

  }

  PortalClient(
    keys,
    {
    remote: portal,
    caps: config.caps,
    manifest: {
      tunnel: {connect: 'duplex'}
    }
  }, function (err, rpc) {
    if(err) {
      console.error(err)
      return reconnect()
    }
    console.error('connecting to tunnel:', target)
    var stream = rpc.tunnel.connect({
      target: '@'+target.split(':').pop()+'.ed25519',
      port: 0
    })
    pull(
      stream.source,
      Client(toBuffer(target.split(':').pop()), function (err, stream) {
        if(err) {
          console.error(err)
          return reconnect()
        }
        console.log('successfully connected to target, pinging...')
        var rpc2 = MuxRpc({tunnel:{ping: 'async'}}, null)()
        pull(stream.source, rpc2.createStream(), stream.sink)
        var first = Date.now()
        ;(function ping () {
          var ts = Date.now()
          rpc2.tunnel.ping(function (err, _ts) {
            if(err) console.error(err)
            else {
              console.log('ping through tunnel', _ts-ts, Date.now()-ts, (Date.now()-first)/1000)
              setTimeout(ping, 10000)
            }
  //          rpc.close()
  //          rpc2.close()
          })
        })()
        rpc2.on('closed', function () {
          console.error('connection to portal closed')
          reconnect()
        })
      }),
      stream.sink
    )
  })
})()


