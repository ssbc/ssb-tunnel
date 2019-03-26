var crypto = require('crypto')

var createSsbServer = require('ssb-server')
  .use(require('ssb-gossip'))
  .use(require('..'))

var tape = require('tape')

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

  var carol = createSsbServer({
    port: 1236, temp: true, keys: c_keys, caps:caps,
    connections: {
      outgoing: {
        net: [{scope: 'local', transform: 'shs'}],
      },
      incoming: {
        tunnel: [{scope: 'local', transform: 'shs' }]
      },
    }
  })

  var bob = createSsbServer({
    port: 1237, temp: true, keys: b_keys, caps:caps,
  })

  t.ok(bob.getAddress('local'))

  carol.connect(bob.getAddress('local'), function (err, rpc) {
    if(err) throw err
    carol.close()
    bob.close()
    t.end()
  })
})

