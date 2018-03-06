// 
// Is it a powder day at CB? :)
//
// @author: Ido Green | @greenido
// @date: Feb 2018
// @last update: Feb 2018
//
// @see:
// source for date: http://www.skicb.com/the-mountain/trail-weather
//
// https://github.com/greenido/bitcoin-info-action
// http://expressjs.com/en/starter/static-files.html
// http://www.datejs.com/
//
//
// init project pkgs
const express = require('express');
const ApiAiAssistant = require('actions-on-google').ApiAiAssistant;
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const Map = require('es6-map');
const dateJS = require('./dateLib.js');

// Pretty JSON output for logs
const prettyjson = require('prettyjson');
const toSentence = require('underscore.string/toSentence');

app.use(bodyParser.json({type: 'application/json'}));
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// Calling GA to make sure how many invocations we had on this skill
const GAurl = "https://ga-beacon.appspot.com/UA-65622529-1/powder-day-cb-server/?pixel=0";
request.get(GAurl, (error, response, body) => {
  console.log(" - Called the GA - " + new Date());
});


//
// Handle webhook requests
//
app.post('/', function(req, res, next) {
  //logObject("-- req: " , req);
  //logObject("-- res: " , res);
  
  // Instantiate a new API.AI assistant object.
  const assistant = new ApiAiAssistant({request: req, response: res});
  //let flightDate = assistant.getArgument('date');
  // Declare constants for your action and parameter names
  const KEYWORD_ACTION = 'is-powder-day'; 
  
  //
  // trim words so we won't talk for more than 2 minutes.
  //
  function trimToWordsLimit(limit, text) {
    if (text == null) {
      return "";
    }
    
    var words = text.match(/\S+/g).length;
    var trimmed = text;
    if (words > limit) {
        // Split the string on first X words and rejoin on spaces
        trimmed = text.split(/\s+/, limit).join(" ");
    }
    return trimmed;
  }
  
  //
  // Clean the text we are getting from the API so it will work great with voice only
  //
  function getOnlyAsciiChars(str) {
    let cleanStr = str.replace(/[^\x00-\x7F]/g, "");
    //&#8217;
    cleanStr = cleanStr.replace(/&#\d\d\d\d;/g, "");
    cleanStr = cleanStr.replace(/\\u\w+/g, "");
    cleanStr = cleanStr.replace(/\\n/g, "");
    return cleanStr;
  }
  
  //
  // Coz wikipedia api return some data fields not inside tags :/
  //
  function cleanHTMLTags(html) {
    if (html != null && html.length > 1) {
      let text = html.replace(/<(?:.|\n)*?>/gm, '');
      let inx1 = 0;
      let foundDataField = text.indexOf("data-");
      while (inx1 < text.length && foundDataField > 0) {
        let inx2 = text.indexOf(">", inx1) + 1;
        if (inx2 < inx1) {
          inx2 = text.indexOf("\"", inx1) + 1;
          inx2 = text.indexOf("\"", inx2) + 2;
        }
        text = text.substring(0,inx1) + text.substring(inx2, text.length);
        inx1 = inx2 + 1;
        foundDataField = text.indexOf("data-", inx1);
      } 
      return text;  
    }
    //
    return html;
  }
  
  //
  // Create functions to handle intents here
  //
  function getNextFlightInfo(assistant) {
    
    console.log('** Handling action: ' + KEYWORD_ACTION );

    request({ method: 'GET',
             url:'http://www.skicb.com/the-mountain/trail-weather'},
            function (err, response, body) {
        if (err) {
            console.log("An error occurred. Err: " + JSON.stringify(err));
            assistant.tell("Sorry something is not working at the moment. Please try again later and be happy.");
            return;
        }
        try {  
          let html = response.body; 
          let inx1 = html.indexOf('temperature') + 13;
          let inx2 = html.indexOf('&', inx1);
          let temp = html.substring(inx1, inx2).trim();
          //console.log("== Raw text we got from API: " + JSON.stringify(html));
          ;
          let inx3 = html.indexOf('weather', inx2) + 9;
          let inx4 = html.indexOf('<', inx3) ;
          let weather = html.substring(inx3, inx4).trim();
          
          let inx5 = html.indexOf('pane-cb-weather-cb-snowfall');
          let inx6 = html.indexOf('value', inx5) + 7;
          let inx7 = html.indexOf('<', inx6);
          let snow24h = html.substring(inx6, inx7).trim();
          
          console.log("== temp: " + temp + " | weather: " + weather + " snow24h: " + snow24h);
  
          if (snow24h == null || snow24h.length < 1) {
            assistant.ask("Could not find if there is powder today. See you later!");
            return;
          }
          
          let res = "In the past 24 hours we got " + snow24h + " inch of snow. The current tempartue is " +
            temp + " and it is " + weather + ". have a great day!" ;
           // 'tell' (and not 'ask') as we don't wish to finish the conversation
          assistant.tell(res);
        }
        catch(error) {
          console.log("(!) Error: " + error + " json: "+ JSON.stringify(error));
        }
    }); //
  }
  
  //
  // Add handler functions to the action router.
  //
  let actionRouter = new Map();
  actionRouter.set(KEYWORD_ACTION, getNextFlightInfo);
  
  // Route requests to the proper handler functions via the action router.
  assistant.handleRequest(actionRouter);
});

//
// Handle errors
//
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Oppss... could not check when is the next flight to space.');
})

//
// Pretty print objects for logging
//
function logObject(message, object, options) {
  console.log(message);
  //console.log(prettyjson.render(object, options));
}


//
// Listen for requests -- Start the party
//
let server = app.listen(process.env.PORT, function () {
  console.log('--> Our Webhook is listening on ' + JSON.stringify(server.address()));
});