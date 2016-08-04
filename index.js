var restify = require('restify');
var request = require('superagent');
var jsdom = require('jsdom');
var eachSeries = require('async/eachSeries');


var server = restify.createServer({
  name: 'sempre geo lookup',
  version: '1.0.0'
});

server.use(restify.queryParser());
server.use(restify.bodyParser());


server.get('/health', function (req, res, next) {
  res.json({ ok: true});
  next();
});

server.get('/test', function (req, res, next) {
  res.send('ok');
  var ip = '192.77.239.202';
  getGeoLocation(ip, function (err, data) {
    if (err) {
      console.log('Err parsing geo location: ' + err);
      return next(err);
    }
    var message = 'orig message';
    postToSlack(data, message, function (err) {
      if (err) {
        console.log('err posting to slack: ');
        console.log(err);
        return next(err);
      }
      next();
    });
  });
});


var ipRegex = /(^(?:[0-9]{1,3}\.){3}[0-9]{1,3})/;
server.post('/logs', function (req, res, next) {
  console.log('POST /logs');
  res.send('ok');
  var payload = JSON.parse(req.params.payload);
  console.log('parsing ' + payload.events.length + ' new events');
  eachSeries(
    payload.events,
    function (event, callback) {
      var message = event.message;
      console.log('parsing message: ' + message);
      var matches = ipRegex.exec(message);
      if (matches !== null) {
        var ip = matches[1];
        getGeoLocation(ip, function (err, data) {
          if (err) {
            return next(err);
          }
          postToSlack(data, message, callback);
        });
      }
    },
    function (err) {
      if (err) {
        console.log('Error: ', err);
        return next(err);
      }
      console.log('finished handling one pager logs');
      next();
    }
  );
});



function getGeoLocation (ip, callback) {
  var url = 'http://ipinfo.io/' + ip + '/json';
  request
    .get(url)
    .end(
      function (err, response) {
        if (err) {
          console.log('error fetching ip info: ');
          console.log(err);
          return callback(err);
        }
        var data = response.body;
        console.log('parsed info for ip ' + ip + ': ');
        console.log(data);
        callback (null, data);
      }
    );
}



function postToSlack (data, message, callback) {
  var text = 'One Pager / Study Design accessed\n' +
    'Region: ' + data.region + '\n' +
    'City: ' + data.city + '\n' +
    'Org: ' + data.org+ '\n' +
    'Original Message: ' + message;
  request
    .post(process.env.SLACK_ENDPOINT)
    .type('json')
    .send({
      text: text
    })
    .end(
      function (err) {
        if (err) {
          return callback(err);
        }
        console.log('Posted message to slack');
        callback();
      }
    );
}

var serverPort = 8081;
server.listen(serverPort, function () {
  console.log('geo-lookup server started on port ' + serverPort)
});
