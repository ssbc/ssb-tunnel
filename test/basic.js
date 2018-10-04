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

tape('connect two peers - just to test connections config', function (t) {

  var carol = Scuttlebot({
    port: 1236, temp: true, keys: c_keys, caps:caps,
    connections: {
      outgoing: {
        net: [{scope: 'public', transform: 'shs'}],
      },
      incoming: {
        tunnel: [{scope: 'public', transform: 'shs' }]
      },
    }
  })

  var bob = Scuttlebot({
    port: 1237, temp: true, keys: b_keys, caps:caps,
  })


  carol.connect(bob.getAddress(), function (err, rpc) {
    if(err) throw err
    carol.close()
    bob.close()
    t.end()
  })
})

