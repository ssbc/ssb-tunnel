var crypto = require('crypto')
var Scuttlebot = require('scuttlebot')
.use(require('scuttlebot/plugins/gossip'))
.use(require('../'))
.use(require('ssb-query'))
.use(require('ssb-public'))
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
    tunnel: { logging: true }
  })

  var carol = Scuttlebot({
    temp: true, keys: c_keys, caps:caps,
    seeds: [bob.getAddress()],
    tunnel: { logging: true },
    connections: {
      incoming: {
      },
      outgoing: {
        tunnel: [{transform: 'shs' }],
        net: [{transform: 'shs'}],
      }
    }
  })

  var alice = Scuttlebot({
    tunnel: { logging: true },
    temp: true, keys: a_keys, caps:caps,
//    seeds: [bob.getAddress()],
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

  bob.public.announce({availability: 1}, function (err, data) {
    alice.add(data.value, function (err) {
      if(err) throw err
      alice.public.announce({
        recps: [carol.id, alice.id],
      }, function (err, data) {
        if(err) throw err
        carol.add(data.value, function (err) {
          if(err) throw err
//          alice.once('tunnel:listening', function () {
  //          var tunneled = false
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

            waitUntil(function () {
              return ~carol.gossip.peers().map(function (e) { return e.key }).indexOf(alice.id)
            }, function () {

              t.equal(alice.getAddress('public'), tunnel_addr)
              //carol should know bob by now
              t.equal(
                carol.gossip.peers()
                .map(function (e) { return e.address }).sort(),
                [bob.getAddress(), alice.getAddress()].sort()
              )

              console.log('carol attempt connect to alice')
              carol.gossip.connect(alice.id, function (err, rpc_alice) {
                if(err) throw err
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
})







