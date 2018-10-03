var crypto = require('crypto')
var Scuttlebot = require('scuttlebot')
.use(require('scuttlebot/plugins/gossip'))
.use(require('../'))
var tape = require('tape')

Scuttlebot

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

  var bob = Scuttlebot({
    port: 1235, temp: true, keys: b_keys,
    caps: caps
  })

  var carol = Scuttlebot({
    port: 1236, temp: true, keys: c_keys, caps:caps,
    seeds: [bob.getAddress()],
    connections: {
      incoming: {
      },
      outgoing: {
        tunnel: [{transform: 'shs' }],
        net: [{transform: 'shs'}],
      }
    }
  })

  console.log("ALICE??")
  var alice = Scuttlebot({
    port: 1234, temp: true, keys: a_keys, caps:caps,
    seeds: [bob.getAddress()],
    tunnel: {portal: bob.id},
    connections: {
      incoming: {
        tunnel: [{scope: 'public', transform: 'shs', portal: bob.id}]
      },
      outgoing: {
        net: [{transform: 'shs'}]
      }
    }
  })
  console.log(">>>")

  setTimeout(function () {
    var tunneled = false
    alice.on('rpc:connect', function (rpc) {
      tunneled = true
      t.equal(rpc.id, carol.id)
    })
    //construct the tunnel address manually, to make sure
    //it really is tunneling.
    var tunnel_addr = [
      //tunnel:<portal>:<target>
      ['tunnel', bob.id, alice.id].join(':'),
      ['shs', alice.id.substring(1, alice.id.indexOf('.'))].join(':')
    ].join('~')

//    console.log(carol.gossip.peers())
    t.notEqual(carol.gossip.peers().map(function (e) { return e.key }).indexOf(bob.id), -1)

    console.log("CAROL CONNECT", tunnel_addr)
    carol.connect(tunnel_addr, function (err, rpc) {
      if(err) throw err
      t.equal(rpc.id, alice.id)
      rpc.close(true)
      alice.close(true)
      bob.close(true)
      carol.close(true)
      t.ok(tunneled)
      t.end()
    })
  }, 100)
})

