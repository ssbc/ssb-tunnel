var crypto = require('crypto')
var Scuttlebot = require('ssb-server')
.use(require('ssb-gossip'))
.use(require('../'))
.use(require('ssb-query'))
.use(require('ssb-device-address'))
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

function waitUntil (test, cb) {
  setTimeout(function next () {
    if(test()) cb()
    else setTimeout(next, 100)
  }, 100)
}

tape('carol tunnels through bob to get to alice', function (t) {

  var bob = Scuttlebot({
    temp: true, keys: b_keys,
    caps: caps,
    tunnel: { logging: true },
    port: 3489
  })

  t.ok(bob.getAddress())

  var carol = Scuttlebot({
    temp: true, keys: c_keys, caps:caps,
    seeds: [bob.getAddress()],
    tunnel: { logging: true },
    connections: {
      incoming: {},
      outgoing: {
        net: [{transform: 'shs'}]
      }
    }
  })

  var alice = Scuttlebot({
    tunnel: { logging: true },
    temp: true, keys: a_keys, caps:caps,
    connections: {
      incoming: {
        tunnel: [{scope: 'public', transform: 'shs', portal: bob.id}]
      },
      outgoing: {
        net: [{transform: 'shs'}]
      }
    }
  })

  bob.deviceAddress.announce({availability: 1, scope: 'local'}, function (err, data) {
    alice.add(data.value, function (err) {
      if(err) throw err
    })
  })

  alice.once('tunnel:listening', function () {
    alice.deviceAddress.announce({
      recps: [carol.id, alice.id],
      availability: 0.5,
      scope: 'public'
    }, function (err, data) {
      if(err) throw err
      t.equal(typeof data.value.content, 'string',
        "alice's address is encrypted, but readable by carol!"
      )
      carol.add(data.value, function (err) {
        if(err) throw err
        alice.on('rpc:connect', function (rpc) {
          tunneled = true
          t.equal(rpc.id, carol.id)
        })
        //construct the tunnel address manually, to make sure
        //it really is tunneling.
        var tunnel_addr = [
          //tunnel:<portal>:<target>
          ['tunnel', bob.id, alice.id, 0].join(':'),
          ['shs', alice.id.substring(1, alice.id.indexOf('.'))].join(':')
        ].join('~')

        t.equal(alice.getAddress('public'), tunnel_addr)

        waitUntil(function () {
          return ~carol.gossip.peers().map(function (e) { return e.key }).indexOf(alice.id)
        }, function () {
          alice.close()
          bob.close()
          carol.close()
          return t.end()
          t.equal(alice.getAddress('public'), tunnel_addr)
          //carol should know bob by now
          t.deepEqual(
            carol.gossip.peers()
            .map(function (e) { return e.address }).sort(),
            [bob.getAddress(), alice.getAddress()].sort()
          )

          console.log('carol attempt connect to alice')
          carol.gossip.connect(alice.id, function again (err, rpc_alice) {
            console.log("RECONNECT", alice.id)
            if(err)
              return setTimeout(function () {
                carol.gossip.connect(alice.id, again)
              }, 1000 * Math.random())
            else
              console.log("CONNECTED TO ALICE")
            var ts = Date.now()
            rpc_alice.tunnel.ping(function (err, _ts) {
              if(err) throw err
              t.ok(tunneled)
              t.equal(rpc_alice.id, alice.id)
              alice.close()
              bob.close()
              carol.close()
              t.end()
            })
          })
        })
      })
    })
  })
})

