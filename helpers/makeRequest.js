const request = require("request");

module.exports = (uri, queryParameters = {}, postParams = {}) => {
	return new Promise((resolve, reject) => {
		request({
			method: "POST",
			uri: uri,
			qs: queryParameters,
			form: postParams
		}, (err, res, body) => {
			if (err) {
				reject(err);
				return;
			}

			if (res.statusCode !== 200) {
				reject(new Error("Invalid Status Code: " + res.statusCode + " (URI: " + uri + " QUERY: " + JSON.stringify(queryParameters) + ")"));
				return;
			}

			let json = undefined;
			try {
				json = JSON.parse(body);
			} catch (e) { };

			if (!json) {
				if (body === "win") {
					resolve(true);
				}

				reject(body);
				return;
			}

			resolve(json);
		});
	});
}
