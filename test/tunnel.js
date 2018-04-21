var crypto = require('crypto')
var Scuttlebot = require('scuttlebot')
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

tape('carol tunnels through alice to get to bob', function (t) {

  var alice = Scuttlebot({
    port: 1234, temp: true, keys: a_keys, caps:caps
  })
  var bob = Scuttlebot({
    port: 1235, temp: true, keys: b_keys,
    tunnel: {portal: alice.getAddress()},
    caps: caps
  })

  var carol = Scuttlebot({
    port: 1236, temp: true, keys: c_keys, caps:caps
  })

  setTimeout(function () {
    var tunneled = false
    alice.on('rpc:connect', function (rpc) {
      tunneled = true
      t.equal(rpc.id, carol.id)
    })
    //construct the tunnel address manually, to make sure
    //it really is tunneling.
    var tunnel = [
      ['tunnel', bob.id, 0, alice.getAddress().replace('~', '!~')].join(':'),
      ['shs', bob.id.substring(1, bob.id.indexOf('.'))].join(':')
    ].join('~')

    t.equal(tunnel, bob.getAddress().split(';').pop())
    carol.connect(tunnel, function (err, rpc) {
      if(err) throw err
      t.equal(rpc.id, bob.id)
      rpc.close(true)
      alice.close(true)
      bob.close(true)
      carol.close(true)
      t.ok(tunneled)
      t.end()
    })
  }, 100)
})

