const keystone = require('keystone');
const User = keystone.list("User");
const bcrypt = require('bcrypt');
const mail = require("../../../mailin/mailin.js");

exports = module.exports = function (req, res) {

	const token = req.params.token;
	const locals = res.locals;
	locals.formData = req.body || {};

	const view = new keystone.View(req, res);

	view.on("get", next => {
		User.model.findOne({
			["activation_token"]: token
		}).exec((err, user) => {
			if (err) return res.err(err, err.name, err.message);

			if (!user) {
				req.flash('error', "Requête introuvable.");
				return res.redirect("/");
			} else {
				next();
			}

		});
	});

	view.on("post", {action: 'reset'}, next => {

		const password = locals.formData.password;
		const token = locals.formData.token;

		bcrypt.hash(password, 10, function (err, hash) {
			if (err) return res.status(500).send({error: err.message});

			User.model.findOneAndUpdate({
				["activation_token"]: token
			}, {
				["password"]: hash,
				["activation_token"]: null
			}, (err, user) => {
				if (err) return res.err(err, err.name, err.message);

				if (!user) {
					req.flash('error', "Requête introuvable.");
					return res.redirect("/");
				} else {
					req.flash('success', "Mot de passe modifié.");

					// On envoie un mail de notification de manière async.
					mail.sendMail(user.email, user.username, "Modification du mot de passe", "password_change.pug", {
						username: user.username,
						today: locals.dateformat(new Date(), "d mmm yyyy à HH:MM"),
						ip: req.connection.remoteAddress,
						account: process.env.BASE_URL + "/account"
					});
					
					return res.redirect("/");
				}

			});
		});
		
	});

	// Render the view
	view.render('web/account_reset', {token: token});


};
