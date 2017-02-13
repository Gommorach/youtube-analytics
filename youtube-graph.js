//put you private youtube api key on line 2
var key = '';
var dbConfig = {host: '127.0.0.1', user: 'nodeapp', password: '123456', database: 'youtubegraph'};

var mysql   = require('mysql');
var request = require('request');
var express = require("express"),
    app     = express(),
    port    = process.env['PORT'] || 3000

require('./calc.js')();

app.listen(port)

console.log('Server running at 127.0.0.1:' + port + '/');

app.get('/request', function (req, res) {
	var updateLevel = 0;
	/*
		0: database up to date 			do nothing
		1: date.today not up to date 	update savedplaylist, playlistid_videoid, videoviewcount
		2: videocount not up to date 	insert in playlistid_videoid, videoviewcount, videoinfo
		3: 1 and 2			 			update existing, add new
		4: playlist not in db: 			insert in all tables
	*/
	var	playlistId = req.query.playlistId;
	var playlistTitle;
	var views = [];
	var episodeNumber = [];
	var episodeInfo = [];



	var url = 'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=' 
		+ playlistId + '&key=' + key;

	var getTitle = function (playlistId, updateLevel) {
		if (updateLevel > 0) {
			request({
				url: 'https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=' + playlistId + '&key=' + key
			}, function (error, response, body) {
				if (response.statusCode == 200) {
					var data = JSON.parse(body);
					playlistTitle = data.items[0].snippet.title + ' - Channel: ' + data.items[0].snippet.channelTitle;
					getIds(url, [], '');					
				} else {
					res.writeHead(400, {'Content-Type:': 'text/plain'});
					res.end('ok');
				}
			});			
		}
		//query database
	}
	
	var getIds = function (url, collectedIds, nextPageToken) {
		request({
			url: url + '&pageToken=' + nextPageToken,
			method: 'GET'
		}, function (error, response, body) {
			var data = JSON.parse(body);
			var totalIds = data.pageInfo.totalResults;		
			data.items.forEach(function (item) {
				collectedIds.push(item.snippet.resourceId.videoId);
			});
			if(collectedIds.length >= totalIds) {
	        	getViewsByIds(collectedIds, []);
	      	} else {
	        	getIds(url, collectedIds, data.nextPageToken);
		  	}
		});
	}

	var getViewsByIds = function (ids, statistics) {
	    var videosUrl = 'https://www.googleapis.com/youtube/v3/videos?part=statistics%2csnippet&id=';
	    var numberOfIds = ids.length <= 50? ids.length: 50;
	    for (var i = 0; i < numberOfIds; i++) {
	      videosUrl += ids.shift() + '%2C';
	    }
		videosUrl = videosUrl.substring(0, videosUrl.length - 3) + '&key=' + key;
		request({
				url: videosUrl,
				method: 'GET'
			}, function (error, response, body) {
				var data = JSON.parse(body);
				data.items.forEach(function (element) {
		        	statistics.push(element);
		      	});
		      	if (ids <= 0) {
		        	statistics.forEach(function (item) {
			          	episodeNumber.push(item.snippet.title);
			          	views.push(parseInt(item.statistics.viewCount));
			          	episodeInfo.push({'snippet': item.snippet, 'statistics': item.statistics});
		        	});
		        	//console.log(views);
		        	//console.log(episodeNumber);
		        	//console.log(episodeInfo);
		        	res.setHeader('Content-Type', 'application/json');
		        	res.send(JSON.stringify({playlistTitle: playlistTitle,
		        		views: views, 
		        		episodeNumber: episodeNumber}));
		      	} else {
		        	getViewsByIds(ids, statistics);
				}
			});
	}

	var isInDb = function(playlistId, totalIds) {
		var connection = mysql.createConnection(dbConfig);
		connection.connect();
		var query = 'select * from savedplaylist where playlistid = ' + connection.escape(playlistId);
		connection.query(query, function (err, rows, fields) {
			if (err) throw err;
			var result = {nrOfRows:rows.length, rows:rows};
			connection.end();

			if(result.nrOfRows >= 1) { //playlist already in db
				var savedPlaylist = result.rows[0];
				console.log('videocount in db: ' + savedPlaylist.videocount);
				updateLevel = 0; //db up to date
				if (!timeCheck(savedPlaylist.lastchecked)) {
					updateLevel = 1;
				} 
				if (savedPlaylist.videocount < totalIds) {
					updateLevel = 2;
				}
				if (savedPlaylist.videocount < totalIds && !timeCheck(savedPlaylist.lastchecked)) { 
					updateLevel = 3; 
				}//playlist not in db
			} else {
				updateLevel = 4;
			}
			getTitle(playlistId, updateLevel);
		});
	}

	var getIdsCount = function (playlistId) {
		request({
			url: url,
			method: 'GET'
		}, function(error, response, body) {
			if (response.statusCode == 200) {
				var totalIds = JSON.parse(body).pageInfo.totalResults;
				isInDb(playlistId, totalIds);
			} else {
				console.log('bad statusCode');
				res.status(400).send('playlistId was not found');
				res.end();
			}
		});
	}


	getIdsCount(playlistId);
});


app.get('/', express.static('./static_content'));

app.use('/index', express.static('static_content'));
