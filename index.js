var restify = require('restify');
var request = require('superagent');
var jsdom = require('jsdom');


var server = restify.createServer({
  name: 'sempre geo lookup',
  version: '1.0.0'
});

server.use(restify.queryParser());
server.use(restify.bodyParser());


server.get('/', function (req, res, next) {
  console.log('GET /');
  var ip = '12.201.135.66';
  request
    .post('https://www.iplocation.net/')
    .send('query=' + ip)
    .send('submit=IP Lookup')
    .end(
      function (err, lookupResponseHTML) {
        if (err) {
          return next(err);
        }

        parseIpPage(lookupResponseHTML.text, function (err, data) {
          if (err) {
            return next(err);
          }
          res.json({
            data: data
          });
          next();
        });

      }
    );
});


var ipRegex = /(^(?:[0-9]{1,3}\.){3}[0-9]{1,3})/;
server.post('/logs', function (req, res, next) {
  console.log('POST /logs');
  var payload = JSON.parse(req.params.payload);
  payload.events.forEach(
    function (event) {
      var matches = ipRegex.exec(event.message);
      if (matches !== null) {
        var ip = matches[1];
        console.log(ip);
      }
    }
  );
  res.send('ok');
  next();
});

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
      callback(null, data);
    }
  });
}

var serverPort = process.env.SERVER_PORT || 8080;
server.listen(serverPort, function () {
  console.log('geo-lookup server started on port ' + serverPort)
});
