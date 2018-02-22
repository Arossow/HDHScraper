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

//TODO: add Roots, The Bistro, 64 North
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


/**
 * Converting the json file to sqlite table.
 */
app.get('/convert', function(req, res) {


    var sqlite3 = require('sqlite3').verbose();
    var db = new sqlite3.Database('data.db');


    var json = require("./FoodsWithCalories.json");
    var foods = json.table;
    db.serialize(function() {
        db.run("CREATE TABLE items (item TEXT, location TEXT, calories INTEGER, price REAL, dietary TEXT, nutLink TEXT)");

        var stmt = db.prepare("INSERT INTO items VALUES (?,?,?,?,?,?)");

        for(var ind in foods){
            console.log("ind: " + ind);
            var n = foods[ind].name;
            var l = foods[ind].loc;
            var c = foods[ind].cal;
            var p = foods[ind].price;
            var d = foods[ind].diet;
            var nl = foods[ind].nutLink;

            stmt.run(n, l, c, p, d, nl);
        }
        stmt.finalize();

    });

    db.close();

    res.send('Check your console.')

});

app.get('/scraper', function(req,res) {

    var bigTableObject = {table : []};

    for(i = 0; i < restaurants.length; ++i){
        var URL = restaurants[i];
        request(URL, function (error, response, html) {
            if (!error) {
                //Use cheerio to load page
                var $ = cheerio.load(html);
                //Select element with id of location (e.g. Pines, Foodworx, etc.)
                var loc = $('#HoursLocations_locationName').text();

                //For each list item in unorder menu list, get item string with name and price/
                $('ul[class="itemList"] > li > a[href]').each(function (i, e) {

                    //unorganized Item Name ($price).
                    var data = $(this).text();
                    //split item by parenthesis and $.
                    var itemDetails = data.toString().split(/[()$]+/);
                    var name = itemDetails[0];
                    var price = itemDetails[1];
                    var link = $(this).attr('href');
                    //get the next element after <a> which is <img> and get alt description (Vegetarian, Vegan, etc.)
                    var veg = $(this).next().attr('alt');
                    //Construct a full URL from the relative link gather from <a>.
                    var fullLink = "https://hdh.ucsd.edu/DiningMenus/" + link.toString();
                    console.log(loc + ", " + name + ", " + price + ", " + veg + ", " + fullLink);

                    request(fullLink, function (error2, response2, html2) {
                        if(!error2) {
                            var cal$ = cheerio.load(html2);
                            var calories = cal$('table #tblFacts span').text().toString().split(" ");
                            var calData = calories[1];
                            console.log(name + ": " + calories + "Kcal for " + price + "$ at " + loc + " added to menu.");
                            var myObj = {
                                name: name,
                                loc: loc,
                                nutLink: fullLink,
                                price: price,
                                diet: veg,
                                cal: calData
                            };
                            bigTableObject.table.push(myObj);
                            fs.writeFile('FoodsWithCalories.json', JSON.stringify(bigTableObject, null, 4), function(err){
                                console.log("FoodsWithCalories.json was created successfully.");
                            })
                        }
                    })
                })
            }
        })
    }
    res.send('Check the console.');
});




app.listen('8081')

console.log('listening on port 8081');

module.exports = app;
