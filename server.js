let { PORT, MONGODB, ASSETS, JWT_KEY, STRIPE_SK } = process.env;

import { join }  from 'path'
import koa from 'koa'
import json from 'koa-json'
import jsonBody from 'koa-json-body'
import route from 'koa-route'
import serve from 'koa-static'
import jwt from 'koa-jwt'
import Joi from 'joi';
import monk from 'monk'
import wrap from 'co-monk'
import router from 'koa-joi-router'

let pswd = require('pswd')();
let auth = jwt({ secret: process.env.JWT_KEY });
let staticFiles = serve(join(__dirname, ASSETS), { defer: false })
let stripe = require('stripe')(process.env.STRIPE_SK);

/**
 * Mongo DB Tables
 */
let db = monk(process.env.MONGODB);
let appsDb = wrap(db.get('apps'));
let usersDb = wrap(db.get('users'));
let stripeDb = wrap(db.get('stripe'));


/**
 * Koa Application & Middleware
 */

function* errors(next) {
 try {
   yield next;
 } catch (err) {
 	console.error(err);

   this.status = err.status || 500;
   this.body = {
   	error: err.message
   }
   this.app.emit('error', err, this);
 }
}


function authorize(user) {
  delete user.password;
  return {
    token: jwt.sign(user, process.env.JWT_KEY, { expiresInMinutes: 60 * 5 }),
    user: user,
  }
}


let loginRoute = {
  method: 'post',
  path: '/login',
  validate: {
    body: {
      email: Joi.string().lowercase().email(),
      password: Joi.string().max(100)
    },
    type: 'json'
  },
  handler: function* () {
    var email = this.request.body.email;
    var password = this.request.body.password;

    var user = yield usersDb.findOne({ email: email });
    this.assert(user, 401, 'Incorrect Email or Password');

    var valid = yield pswd.compare(password, user.password);
    this.assert(valid, 401, 'Incorrect Email or Password');

    this.body = authorize(user);

  }
};

let registerRoute = {
  method: 'post',
  path: '/register',
  validate: {
    body: {
      email: Joi.string().lowercase().email(),
      password: Joi.string().max(100)
    },
    type: 'json'
  },
  handler: function* () {
    var email = this.request.body.email;
    var password = this.request.body.password;

    var duplicate = yield usersDb.findOne({ email: email });
    this.assert(!duplicate, 400, 'Klouds ID already exists');

    var hash = yield pswd.hash(password);
    this.assert(hash, 500, 'Failed to hash password');

    var user = yield usersDb.insert({
      email: email,
      password: hash
    });
    this.assert(user, 500, 'Failed to insert new user');

    this.body = authorize(user);
  }
}

let appsRoute = {
  method: 'get',
  path: '/apps',
  handler: function*() {
    this.body = yield appsDb.find({ disabled: { "$exists" : false }});;
  }
}

let disabledRoute = {
  method: 'get',
  path: '/disabled',
  handler: function*() {
    this.body = yield appsDb.find({ disabled: true });
  }
}

let subscribeRoute = {
  method: 'post',
  path: '/subscribe',
  validate: { type: 'json' },
  handler: [
    auth,
    function*() {
        let createStripeCustomer = (customer) => function get_thunked_lol(cb) {
          return stripe.customers.create(customer, cb)
      }

      var params = this.request.body;
      var app = params.app;
      var stripeToken = params.tok;
      var customer = yield createStripeCustomer({
        source: stripeToken,
        plan: "web_application",
        email: this.state.user.email
      });

      console.log('Stripe Customer', stripeCustomer);

      this.assert(customer, 500, 'Stripe api call failed');

      this.body = { customer: customer.id };

      var inserted = yield stripeDb.insert(customer);
      console.log(inserted);
    }
  ]
}




let app = koa();

app.use(json());
// app.use(jsonBody({ limit: '10kb' }));
app.use(errors);
app.use(staticFiles);

let noAuth = router();
noAuth.route(loginRoute);
noAuth.route(registerRoute);
noAuth.route(appsRoute);
noAuth.route(disabledRoute);
app.use(noAuth.middleware());

let user = router();
user.route(subscribeRoute);
app.use(user.middleware());

/*                          You Shall Not Pass!                       */
// AUTH AUTH AUTH AUTH AUTH |UTH AUTH AUTH AUT| AUTH AUTH AUTH AUTH AUTH
// AUTH AUTH AUTH AUTH AUTH |UTH AUTH AUTH AUT| AUTH AUTH AUTH AUTH AUTH

app.use(auth);

console.log(`Listening on port ${PORT}`);
app.listen(PORT);
