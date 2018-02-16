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

    for(i = 1; i < 6; i++) {
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

                    var veg = $(this).next().attr('alt');

                    var fullLink = "https://hdh.ucsd.edu/DiningMenus/" + link.toString();

                    var myObj = {
                        name: name,
                        loc: loc,
                        cal: fullLink,
                        price: price,
                        diet: veg
                    };

                    bigObj.table.push(myObj);

                    //console.log("name: " + name + "\n      price: " + price + "\n      link:  " + fullLink + "\n      loc:   " + loc + "\n      alt:   " + veg + "\n");
                    //console.log("table size: " + bigObj.table.length);


                    fs.writeFile('fuck.json', JSON.stringify(bigObj.table, null, 4), function(err){
                        console.log(name + " was added to fuck.json");
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

app.get('/convert', function(req, res) {

    var sqlite3 = require('sqlite3').verbose();
    var db = new sqlite3.Database('tab');

    var json = require("./fuck.json");
    var foods = json.fuck;
    db.serialize(function() {
        db.run("CREATE TABLE tab (name TEXT, loc TEXT, cal TEXT, price TEXT, diet TEXT)");

        var stmt = db.prepare("INSERT INTO tab VALUES (?,?,?,?,?)");

        for(var ind in foods){
            var n = foods[ind].name;
            var l = foods[ind].loc;
            var c = foods[ind].cal;
            var p = foods[ind].price;
            var d = foods[ind].diet;

            stmt.run(n, l, c, p, d);
        }
        stmt.finalize();

        db.each("SELECT name, loc FROM tab", function(err, row) {
            console.log("food: "+ row.name + "|| loc: " + row.loc);
        });
    });

    db.close();

    res.send('Check your console.')

});

app.listen('8081')

console.log('listening on port 8081');

module.exports = app;
