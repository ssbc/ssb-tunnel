var Client = require('ssb-client')
var isFeed = require('ssb-ref').isFeed
var DuplexPair = require('pull-pair/duplex')

function DuplexError (message) {
  var err = new Error(message)
  return {
    source: function (abort, cb) {
      cb(err)
    },
    sink: function (read) {
      read(err, function () {})
    }
  }
}

function isObject (o) {
  return 'object' === typeof o
}

exports.name = 'tunnel'
exports.version = '1.0.0'

exports.manifest = {
  announce: 'sync',
  connect: 'duplex'
}
exports.permissions = {
  anonymous: {allow: ['connect', 'announce']}
}

exports.init = function (sbot, config) {
  var endpoints = {}
  var portal = config.tunnel && config.tunnel.portal

  function parse (string) {
    var opts
    if(isObject(string))
      opts = string
    else {
      var parts = string.split(':')
      var portal = parts.slice(3).join(':')
      opts = {
        name: 'tunnel',
        id: parts[1],
        port: +parts[2],
        portal: portal
      }
    }

    if(!(
      opts.name === 'tunnel' &&
      isFeed(opts.id) &&
      Number.isInteger(opts.port) &&
      sbot.multiserver.parse(opts.portal)
    )) throw new Error('weird:'+string)

    return opts
  }

  var handlers = {}

  sbot.multiserver.transport(function (instance) {
    return {
      name: 'tunnel',
      server: function (onConnect) {
        //just remember the reference, call it
        //when the tunnel api is called.
        handlers[instance] = onConnect
      },
      client: function (addr, cb) {
        var opts = parse(addr)
        return Client(sbot.keys, {
          remote: opts.portal,
          caps: config.caps,
          manifest: sbot.getManifest()
        }, function (err, rpc) {
          if(err) cb(err)
          else cb(null, rpc.tunnel.connect({id: opts.id, port: opts.port}))
        })
      },
      parse: parse,
      stringify: function () {
        if(portal)
          return ['tunnel', sbot.id, instance, portal].join(':')
      }
    }
  })

  setImmediate(function () {
    if(config.tunnel && config.tunnel.portal)
      sbot.connect(config.tunnel.portal, function (err, rpc) {
        rpc.tunnel.announce(null, function () {

        })
      })
  })

  return {
    announce: function (opts) {
      endpoints[this.id] = sbot.peers[this.id][0]
    },
    connect: function (opts, cb) {
      if(endpoints[opts.id]) {
        return endpoints[opts.id].tunnel.connect(opts, function (err) {
          if(cb) cb(err)
        })
      }
      else if(opts.id === sbot.id && handlers[opts.port]) {
        var streams = DuplexPair()
        handlers[opts.port](streams[0])
        return streams[1]
      }
      else
        return DuplexError('could not connect to:'+opts.id)
    }
  }
}

