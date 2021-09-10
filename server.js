require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');
const cors = require('cors');
const dns = require('dns');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

//Needed for body parsing.
app.use(express.urlencoded({ extended: true }));

//Connection to DB
const connection = mongoose.createConnection(process.env.MONGO_URI);

//Needed for AutoIncrement on DB input.
autoIncrement.initialize(connection)

const urlSchema = new mongoose.Schema({
	original_url: String
});

urlSchema.plugin(autoIncrement.plugin, { model: 'URL', field: 'short_url' })

const URL = connection.model('URL', urlSchema);

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

//Sends the Homepage on Site request.
app.get('/', function (req, res) {
	res.sendFile(process.cwd() + '/views/index.html');
});

//hanldes requests to post /api/shorturl
async function main(req, res) {

	const originalUrl = req.body.url;

	dns.lookup(originalUrl, async function (err, address, family) {
		if (!err) {
			//find document with entered url
			let doc = await URL.findOne({ original_url: originalUrl });

			if (!doc) {
				//The URL was not found. A new db entry is made.
				const document = new URL({ original_url: originalUrl });
				await document.save();

				//Load the new entry into doc
				doc = await URL.findOne({ original_url: originalUrl });
			}

			//Respond with the entry values.
			res.json({
				original_url: doc.original_url,
				short_url: doc.short_url
			});
		} else {
			res.json({
				error: 'invalid url'
			})
		}
	})

}

//Gets POST data from HTML From on Index Page.
app.post('/api/shorturl', function (req, res) {
	main(req, res);
});

async function handleShortURLRequests(req, res) {

	const shortUrl = req.params.short_url;

	//Find document with entered URL.
	let doc = await URL.findOne({ short_url: parseInt(shortUrl) });

	if (!doc) {
		//The URL was not found.
		res.json({
			error: "No short URL found for the given input."
		});
	} else {
		let originalUrl = doc.original_url
		if(!originalUrl[0].match(/h/)) {
			originalUrl = "https://" + originalUrl;
		}
		res.redirect(302, originalUrl);
	}
}

//Redirects requests the original URL
app.get('/api/shorturl/:short_url', function (req, res) {
	handleShortURLRequests(req, res);
});

app.listen(port, function () {
	console.log(`Listening on port ${port}`);
});
