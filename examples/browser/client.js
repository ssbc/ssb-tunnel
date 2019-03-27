

var portal_addr = /* the portal is where the introduction happens */
var target_addr = /* the peer you are trying to connect to */

var node = require('../client')(portal_addr)

var timer
;(function again () {
  node.connect(target_addr, function (err, rpc) {
    if(err) {
      console.error(err)
      return setTimeout(again, 500 + 1000*Math.random())
    }
    console.log("CONNECTED", rpc.id)
    ;(function ping () {
      var ts = Date.now()
      rpc.tunnel.ping(function (err, _ts) {
        if(err) {console.error(err); return reconnect()}
        else console.log({whole: Date.now()-ts, first:_ts - ts, second:Date.now() - _ts, us: ts, them: _ts})
        clearTimeout(timer)
        timer = setTimeout(ping, 30e3)
      })
    })()
    rpc.on('closed', function () {
      console.log("CLOSED")
      clearTimeout(timer)
      setTimeout(again, 1000*Math.random())
    })
  })
})()


