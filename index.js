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
  console.log("CONFIG", config)
  var endpoints = {}
  var portal = config.tunnel && config.tunnel.portal

  function parse (string) {
    var opts
    if(isObject(string))
      opts = string
    else {
      var parts = string.split(':')
      if(parts[0] != 'tunnel') return
      opts = {
        name: parts[0],
        portal: parts[1],
        target: parts[2],
        port: +parts[3] || 0,
      }
    }

    if(!(
      opts.name === 'tunnel' &&
      isFeed(opts.portal) &&
      isFeed(opts.target) &&
      Number.isInteger(opts.port)
    )) return

    return opts
  }

  var handlers = {}

  sbot.multiserver.transport({
    name: 'tunnel',
    create: function (config, instance) {
      instance = instance || 0
      console.log("CREATE MS PLUGIN, TUNNEL")
      return {
        name: 'tunnel',
        scope: function () { return config.scope || 'public' },
        server: function (onConnect) {
          //just remember the reference, call it
          //when the tunnel api is called.
          handlers[instance] = onConnect
          console.log("CREATED TUNNEL SERVER:", sbot.id)
        },
        client: function (addr, cb) {
          var opts = parse(addr)
          console.log("TUNNEL OPTS", opts)
          sbot.gossip.connect(opts.portal, function (err, rpc) {
            if(err) cb(err)
            else cb(null, rpc.tunnel.connect({target: opts.target, port: opts.port}))
          })
        },
        parse: parse,
        stringify: function () {
          if(portal)
            return ['tunnel', portal, sbot.id, instance].join(':')
        }
      }
    }
  })

  setImmediate(function () {
    if(config.tunnel && config.tunnel.portal) {
      console.log("CONNECT TO PORTAL", config.tunnel)
      console.log('PORTAL', sbot.gossip.get(config.tunnel.portal))
      var addr = sbot.gossip.get(config.tunnel.portal).address
      sbot.gossip.connect(config.tunnel.portal, function (err, rpc) {
        if(err) {
          return console.error('failed to connect to portal:',config.tunnel.portal)
          console.error(err.stack)
        }
        rpc.tunnel.announce(null, function () {
          console.log("ANNOUNCED:", sbot.id, 'at', config.tunnel.portal)
        })
      })
    }
  })

  return {
    announce: function (opts) {
      console.log('announce', this.id, opts)
      endpoints[this.id] = sbot.peers[this.id][0]
    },
    connect: function (opts, cb) {
      console.log("TUNNEL CONNECT", opts, {from: this.id, to: opts})
      //if we are being asked to forward connections...
      //TODO: config to disable forwarding
      if(endpoints[opts.target]) {
        return endpoints[opts.target].tunnel.connect(opts, function (err) {
          if(cb) cb(err)
        })
      }
      //if this connection is for us
      else if(opts.target === sbot.id && handlers[opts.port]) {
        var streams = DuplexPair()
        handlers[opts.port](streams[0])
        return streams[1]
      }
      else
        return DuplexError('could not connect to:'+opts.id)
    }
  }
}











