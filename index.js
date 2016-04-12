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
  request
    .post('https://www.iplocation.net/')
    .send('query=' + ip)
    .send('submit=IP Lookup')
    .end(
      function (err, lookupResponseHTML) {
        if (err) {
          return callback(err);
        }
        console.log('parsed geolocation for ip ' + ip);
        parseIpPage(lookupResponseHTML.text, callback);
      }
    );
}

function parseIpPage (html, callback) {
  var data = {};
  jsdom.env({
    html: html,
    scripts: ['https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.3/jquery.min.js'],
    done: function (err, window) {
      if (err) {
        return callback(err);
      }
      data.ip = window.$('#wrapper > section > div > div > div.col.col_8_of_12 > div:nth-child(9) > div > table > tbody:nth-child(2) > tr > td:nth-child(1)').html();
      data.region = window.$('#wrapper > section > div > div > div.col.col_8_of_12 > div:nth-child(9) > div > table > tbody:nth-child(2) > tr > td:nth-child(3)').html();
      data.city = window.$('#wrapper > section > div > div > div.col.col_8_of_12 > div:nth-child(9) > div > table > tbody:nth-child(2) > tr > td:nth-child(4)').html();
      data.isp = window.$('#wrapper > section > div > div > div.col.col_8_of_12 > div:nth-child(9) > div > table > tbody:nth-child(4) > tr > td:nth-child(1)').html();
      data.organization = window.$('#wrapper > section > div > div > div.col.col_8_of_12 > div:nth-child(9) > div > table > tbody:nth-child(4) > tr > td:nth-child(2)').html();
      console.log('parsed ip from page: ' + JSON.stringify(data));
      callback(null, data);
    }
  });
}

function postToSlack (data, message, callback) {
  var text = 'One Pager / Study Design accessed\n' +
    'Region: ' + data.region + '\n' +
    'City: ' + data.city + '\n' +
    'ISP: ' + data.isp + '\n' +
    'Org: ' + data.organization + '\n' +
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
