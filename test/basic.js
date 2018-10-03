var crypto = require('crypto')
var Scuttlebot = require('scuttlebot')
.use(require('scuttlebot/plugins/gossip'))
var tape = require('tape')

Scuttlebot
  .use(require('../'))

var ssbKeys = require('ssb-keys')

function hash (s) {
  return crypto.createHash('sha256').update(s).digest()
}

var a_keys = ssbKeys.generate(null, hash('alice'))
var b_keys = ssbKeys.generate(null, hash('bob'))
var c_keys = ssbKeys.generate(null, hash('carol'))

var caps = {
  shs: hash('cap')
}

tape('carol tunnels through bob to get to alice', function (t) {

  var carol = Scuttlebot({
    port: 1236, temp: true, keys: c_keys, caps:caps,
    connections: {
      outgoing: {
        net: [{scope: 'public', transform: 'shs'}],
      },
      incoming: {
        tunnel: [{scope: 'public', transform: 'shs' }]
      },
//      outgoing: {
//        net: [{scope: 'public'}]
//      }
    }
  })

  var bob = Scuttlebot({
    port: 1237, temp: true, keys: b_keys, caps:caps,
//    connections: {
//      incoming: {
//        tunnel: [{scope: 'public', transform: 'shs' }]
//      },
//      outgoing: {
//        net: [{scope: 'public'}]
//      }
//    }
  })


  carol.connect(bob.getAddress(), function (err, rpc) {
    if(err) throw err
    console.log('connected', rpc.id)
    rpc.close()
    carol.close()
    bob.close()
    t.end()

  })
  

})
