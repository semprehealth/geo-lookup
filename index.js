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

var nginxIpRegex = /^(.*) - -/;
server.post('/sumologs', function (req, res, next) {
  console.log('POST /sumologs');
  res.send('ok');
  var logs = JSON.parse(req.body.logs);
  console.log('parsing ' + logs.length + ' new logs');
  eachSeries(
    logs,
    function logHandler (log, callback) {
      var rawMessage = log.Message;
      var message = JSON.parse(rawMessage);
      var nginxLog = message.log;
      var matches = nginxIpRegex.exec(nginxLog);
      if (matches !== null) {
        var ip = matches[1];
        console.log('parsed ip: ' + ip);
        getGeoLocation(ip, function (err, data) {
          if (err) {
            console.log('Err parsing geo location: ' + err);
            return callback(err);
          }
          postToSlack(data, nginxLog, function (err) {
            if (err) {
              console.log('err posting to slack: ');
              console.log(err);
              return callback(err);
            }
            callback();
          });

        });

      }
    },
    function onLogsParsed (err) {
      if (err) {
        console.log('Error handling a log: ');
        console.log(err);
        return next(err);
      }
      console.log('finished handling one pager access logs');
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

var serverPort = process.env.SERVER_PORT || 8081;
server.listen(serverPort, function () {
  console.log('geo-lookup server started on port ' + serverPort)
});
