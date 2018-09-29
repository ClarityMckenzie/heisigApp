// set-up .env, request, Express, and enable bodyParser
require('dotenv').config()
const request = require('request');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());

// initalize Kanji Firebase

var firebase = require('firebase');
var config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_URL,
};

firebase.initializeApp(config);
var database = firebase.database();
var ref = firebase.database().ref();

// initialize installation Firebase

var secondaryAppConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  databaseURL: process.env.DATABASE_URL,
  projectId: process.env.PROJECT_ID,
};

var secondary = firebase.initializeApp(secondaryAppConfig, "secondary");
var secondaryDatabase = secondary.database();

// NodeJS encryption with CTR

var crypto = require('crypto');
var algorithm = process.env.CRYPTO_ALGORITHM;
var password = process.env.CRYPTO_PASSWORD;

function encrypt(text){
  var cipher = crypto.createCipher(algorithm,password)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text){
  var decipher = crypto.createDecipher(algorithm,password)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}

// function to add installation data
function addEntry(userID, workspaceID, userToken) {
  var data = {
    user: userID,
    workspace: workspaceID,
    token: userToken
  }

  var refTwo = secondaryDatabase.ref(process.env.REFERENCE);
  refTwo.push(data);
};

// set-up response based on user input

app.post('/heisig', function(req, res) {

  var input = req.body.text;
  var firstChar = input.charAt(0);

  var indexCollection = [];
  var keywordCollection = [];
  var kanjiCollection = [];

  if (!input) {

    res.send("What are we searching for?")

  } else if (input > 0 && input < 2201) {

    var thisKanji = database.ref(input - 1);

    thisKanji.once("value").then(function(snapshot) {

      var kanji = snapshot.child("kanji").val();
      var keyword = snapshot.child("keyword").val();

      indexCollection.push(kanji, keyword);

    })

    setTimeout(function() {

      if (indexCollection[0]) {

        res.send(`The kanji for #${input} is "${indexCollection[0]}" with the keyword "${indexCollection[1]}"`);

      }
    }, 200);

  } else if (input > 2200 || input <= 0) {

    res.send(`That number is out of bounds.`)

  } else if (firstChar >= "\u4e00" && firstChar <= "\u9faf")

    ref.orderByChild("kanji").equalTo(input).on('value', function(snapshot) {

      snapshot.forEach(function(childSnapshot) {

        var childData = childSnapshot.val();

        kanjiCollection.push(childData.keyword);

      })

      setTimeout(function() {

        if (kanjiCollection[0]) {
          res.send(`The keyword for ${input} is: ${kanjiCollection[0]}`);
        } else {
          res.send(`I'm afraid ${input} isn't part of the Heisig list.`)
        }
      }, 200);
    })

  else {

    ref.orderByChild("keyword").equalTo(input).on('value', function(snapshot) {

      snapshot.forEach(function(childSnapshot) {
        var childData = childSnapshot.val();
        keywordCollection.push(childData.kanji);

      })

      setTimeout(function() {

        if (keywordCollection[0]) {
          res.send(`The kanji for "${input}" is: ${keywordCollection[0]}`);
        } else {
          res.send(`It doesn't look like we don't have that keyword.`)

        }
      }, 200);
    })
  };
});

// authorize the app for other workspaces

app.get('/authorize', function(req, res){

  var apiURI = 'https://slack.com/api/oauth.access?code=' + req.query.code + "&client_id=" + process.env.CLIENT_ID + "&client_secret=" + process.env.CLIENT_SECRET + "&redirect_uri=" + process.env.REDIRECT_URI;

  request.post(apiURI, function(error, response, body) {

    if (!error && response.statusCode == 200) {

      var oauthToken = JSON.parse(body).access_token;
      var workspaceID = JSON.parse(body).team_id;
      var userID = JSON.parse(body).user_id;

      var encryptedToken = encrypt(String(oauthToken))
      var encryptedWorkspaceID = encrypt(String(workspaceID))
      var encryptedUserID = encrypt(String(userID));

      addEntry(encryptedUserID, encryptedWorkspaceID, encryptedToken);

      res.redirect('https://www.hakoneprojects.com');
    }
  })
});

// start server

app.listen(process.env.PORT, () => {
  console.log("We're listening...")
});
