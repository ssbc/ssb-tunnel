
// a minimal interface to tunnel to a remote, to test from a browser
var pull = require('pull-stream')
var ssbKeys = require('ssb-keys')
var PortalClient = require('ssb-client')
var TunnelClient = require('secret-handshake').createClient

var keys = ssbKeys.generate()
var config = require('ssb-config')
var timeout = 5000

var MuxRpc = require('muxrpc')

function toBuffer(s) {
  if(~s.indexOf('.'))
    return Buffer.from(s.substring(0, s.indexOf('.')), 'base64')
  else
    return Buffer.from(s, 'base64')
}

var portal = process.argv[2]
var target = process.argv[3]

function toSodiumKeys(keys) {
  if(!keys || !keys.public) return null
  console.log(keys)
  return {
    publicKey: toBuffer(keys.public),
    secretKey: toBuffer(keys.private)
  }
}
console.log('target:', target)

var Client = TunnelClient(toSodiumKeys(keys), toBuffer(config.caps.shs), timeout)

console.error('connecting to portal:', portal)
PortalClient(
  keys,
  {
  remote: portal,
  caps: config.caps,
  manifest: {
    tunnel: {connect: 'duplex'}
  }
}, function (err, rpc) {
  if(err) throw err
  console.error('connecting to tunnel:', target)
  var stream = rpc.tunnel.connect({target: target, port: 0})
  pull(
    stream.source,
    Client(toBuffer(target), function (err, stream) {
      if(err) throw err
      console.log('successfully connected to target, pinging...')
      var rpc2 = MuxRpc({tunnel:{ping: 'async'}}, null)()
      pull(stream.source, rpc2.createStream(), stream.sink)
      var ts = Date.now()
      rpc2.tunnel.ping(function (err, _ts) {
        if(err) throw err
        console.log('ping through tunnel', _ts-ts, Date.now()-ts)
        rpc.close()
        rpc2.close()
      })
    }),
    stream.sink
  )
})

