// set-up Firebase
require('dotenv').config()
var firebase = require('firebase');
var config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_URL,
};
firebase.initializeApp(config);
var database = firebase.database();
var ref = firebase.database().ref();

// set-up Express and enable bodyParser
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());

// set-up response based on user input

app.post('/', (req, res) => {

  var input = req.body.text;
  var firstChar = input.charAt(0);

  var indexCollection = [];
  var keywordCollection = [];
  var kanjiCollection = [];

  if (input > 0 && input < 2201) {

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

// start server

app.listen(process.env.PORT, () => {
  console.log("We're listening...")
});
