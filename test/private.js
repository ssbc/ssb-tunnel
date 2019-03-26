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

tape('alice hosts a tunnel, with bob as portal', function (t) {

  var bob = Scuttlebot({
    temp: true, keys: b_keys,
    caps: caps,
    //enable tunnel's logging, so we can see what's happening.
    tunnel: { logging: true },
    port: 3458
//    connections: { incoming: {net: [{scope: 'public', transform: 'shs'}]} }
  })

  t.ok(bob.getAddress())

//  var carol = Scuttlebot({
//    temp: true, keys: c_keys, caps:caps,
//    seeds: [bob.getAddress()],
//    tunnel: { logging: true },
//    connections: {
//      incoming: {},
//      outgoing: {
////        tunnel: [{transform: 'shs', scope: 'public'}],
//        net: [{transform: 'shs'}],
//      }
//    }
//  })

  var alice = Scuttlebot({
    tunnel: { logging: true },
    temp: true, keys: a_keys, caps:caps,
    connections: {
      incoming: {
        //bob is the portal, so we need to know bob's address to open a portal.
        tunnel: [{scope: 'public', transform: 'shs', portal: bob.id}]
      },
      outgoing: {
        net: [{transform: 'shs'}]
      }
    }
  })

  //end the test once we've correctly started our tunnel server on alice.
  alice.once('tunnel:listening', function () {
    //alice is listening via bob
    alice.close()
    bob.close()
    t.end()
  })

  bob.deviceAddress.announce({availability: 1, scope: 'local'}, function (err, data) {
    if(err) throw err
    console.log('bob: announce', data)
    alice.add(data.value, function (err) {
      if(err) throw err
    })
  })
})

