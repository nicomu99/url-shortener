require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');
const cors = require('cors');
const dns = require('dns');
const app = express();

const mySecret = process.env['MONGO_URI']
// Basic Configuration
const port = process.env.PORT || 3000;

//Needed for body parsing.
app.use(express.urlencoded({ extended: true }));

//Connection to DB
const connection = mongoose.createConnection(mySecret);

//Needed for AutoIncrement on DB input.
autoIncrement.initialize(connection)

const urlSchema = new mongoose.Schema({
	original_url: String
});

urlSchema.plugin(autoIncrement.plugin, { model: 'URL', field: 'short_url' })

const URLModel = connection.model('URL', urlSchema);

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

//Sends the Homepage on Site request.
app.get('/', function (req, res) {
	res.sendFile(process.cwd() + '/views/index.html');
});

//hanldes requests to post /api/shorturl
async function main(req, res) {

  let originalUrl = ""

  try {
    originalUrl = new URL(req.body.url);
  } catch {
    res.json({
      error: 'invalid url'
    })
    return;
  }

  if(!originalUrl.protocol.includes('https:')) {
    res.json({
      error: 'invalid url'
    })
    return;
  }

	console.log('Checking URL: ' + originalUrl);

	let newUrl = originalUrl.hostname;

	console.log('Updated URL: ' + newUrl)

	dns.lookup(newUrl, async function (err, address, family) {
    console.log(newUrl)
		if (!err) {
			//find document with entered url
			let doc = await URLModel.findOne({ original_url: originalUrl });

			if (!doc) {
				//The URL was not found. A new db entry is made.
				const document = new URLModel({ original_url: originalUrl });
				await document.save();
				console.log("URL was not found, but is valid.")
				//Load the new entry into doc
				doc = await URLModel.findOne({ original_url: originalUrl });
			}

			console.log("Responding with URLs.")
			//Respond with the entry values.
			res.json({
				original_url: doc.original_url,
				short_url: doc.short_url
			});
		} else {
			console.log("URL is invalid.")
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

  console.log("ShortURL: " + shortUrl)

	//Find document with entered URL.
	let doc = await URLModel.findOne({ short_url: parseInt(shortUrl) });

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
  console.log(req.query.short_url)
  if(req.params.short_url == 'undefined') {
    console.log('Undefined short_URL')
    return res.json({
      error: 'invalid url'
    })
  }
  console.log(req.params)
	handleShortURLRequests(req, res);
});

app.listen(port, function () {
	console.log(`Listening on port ${port}`);
});
