var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var index = require('./routes/index');
var users = require('./routes/users');
var csvWriter = require('csv-write-stream')

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);

var sixtyFour ='https://hdh.ucsd.edu/DiningMenus/default.aspx?i=64';
var pines = 'https://hdh.ucsd.edu/DiningMenus/default.aspx?i=01';
var canyonVista = 'https://hdh.ucsd.edu/DiningMenus/default.aspx?i=24';
var cafeVentans = 'https://hdh.ucsd.edu/DiningMenus/default.aspx?i=18';
var foodWorx = 'https://hdh.ucsd.edu/DiningMenus/default.aspx?i=11';
var oceanViewTerrace = 'https://hdh.ucsd.edu/DiningMenus/default.aspx?i=05';
var restaurants = [
    sixtyFour,
    pines,
    canyonVista,
    cafeVentans,
    foodWorx,
    oceanViewTerrace
];

app.get('/scrape', function(req, res){

    var writer = csvWriter();


    var jsonTemp = {
        "name": "food",
        "loc": "loc",
        "cal": "1",
        "price": "1",
        "diet": "veg"
    };


    var bigObj = {table : []};

    for(i = 0; i <= 5; i++) {
        var url = restaurants[i];

        request(url, function (error, response, html) {
            if (!error) {
                var $ = cheerio.load(html);

                var loc = $('#HoursLocations_locationName').text();

                $('ul[class="itemList"] > li > a[href]').each(function (i, e) {

                    var data = $(this).text();

                    var itemDetails = data.toString().split(/[()$]+/)
                    var name = itemDetails[0];
                    var price = itemDetails[1];

                    //console.log(itemDetails);

                    var link = $(this).attr('href');
                    //console.log(loc);
                    console.log(name + "\t\t" + link);

                    var veg = $(this).next().attr('alt');

                    var fullLink = "https://hdh.ucsd.edu/DiningMenus/" + link.toString();
                    console.log("\t\t" + fullLink);
                    var myObj = {
                        name: name,
                        loc: loc,
                        nutLink: fullLink,
                        price: price,
                        diet: veg,
                        cal: ""
                    };

                    bigObj.table.push(myObj);

                    //console.log("name: " + name + "\n      price: " + price + "\n      link:  " + fullLink + "\n      loc:   " + loc + "\n      alt:   " + veg + "\n");
                    //console.log("table size: " + bigObj.table.length);


                    fs.writeFile('final2.json', JSON.stringify(bigObj, null, 4), function(err){
                       // console.log(name + " was added to fuck.json");
                    })



                })

            }
        })

    }
// Finally, we'll just send out a message to the browser reminding you that this app does not have a UI.
    res.send('Check your console!')

});

app.get('/iterate', function(req, res) {
    var file = require("./fuck.json");
    var obj = file.fuck;
    for(var ind in obj){
        console.log( "name: " + obj[ind].name);
    }

    res.send("lol.")

});

app.get('/calories', function(req, res) {
    var file = require("./final.json");
    var obj = file.table;
    for (var ind in obj) {
        var myObj = obj[ind];
        //console.log("food item: " + myObj.name);
        var url = obj[ind].nutLink;
        console.log("url: " + url);
        request(url, function (error, response, html) {
            if (!error) {
                var $ = cheerio.load(html);

                var calories = $('#lblItemHeader').text();

                myObj.cal = calories;

                console.log("name: " + myObj.name + "cals: " + calories);

            }
        })
    }

    res.send("check log pls.");
});

app.get('/convert', function(req, res) {

    var sqlite3 = require('sqlite3').verbose();
    var db = new sqlite3.Database('data.db');

    var json = require("./final2.json");
    var foods = json.table;
    db.serialize(function() {
        db.run("CREATE TABLE items (item TEXT, location TEXT, calories INTEGER, price REAL, dietary TEXT, nutLink TEXT)");

        var stmt = db.prepare("INSERT INTO items VALUES (?,?,?,?,?,?)");

        for(var ind in foods){
            var n = foods[ind].name;
            var l = foods[ind].loc;
            var c = foods[ind].cal;
            var p = foods[ind].price;
            var d = foods[ind].diet;
            var nl = foods[ind].nutLink;

            stmt.run(n, l, c, p, d, nl);
        }
        stmt.finalize();

        db.each("SELECT name, loc FROM items", function(err, row) {
            //console.log("food: "+ row.name + "|| loc: " + row.location);
        });
    });

    db.close();

    res.send('Check your console.')

});

app.listen('8081')

console.log('listening on port 8081');

module.exports = app;
