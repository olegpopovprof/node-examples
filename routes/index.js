const models = require('./../models');
const Instance = models.Instance;
const Permission = models.Permission;
const Api = require('./../api/api');
const Token = require('./../api/token');
const Logger = require('./../helpers/logger');
let sharedSecret = '';

module.exports = (app, addon) => {

    // Root route. This route will serve the `atlassian-connect.json` unless the
    // documentation url inside `atlassian-connect.json` is set
    app.get('/', function (req, res) {
        res.format({
            // If the request content-type is text-html, it will decide which to serve up
            'text/html': function () {
                res.redirect('/atlassian-connect.json');
            },
            // This logic is here to make sure that the `atlassian-connect.json` is always
            // served up when requested by the host
            'application/json': function () {
                res.redirect('/atlassian-connect.json');
            }
        });
    });

    // save addon data on installation
    app.post('/installed', (req, res, next) => {
        sharedSecret = req.body.sharedSecret;
        next();
    });

    // store epic link and story points field numbers after add-on is enabled
    app.post('/enabled', addon.authenticate(), (req, res) => {
        Api.client = addon.httpClient(req);
        Api.getFields((fields) => {
            if(!fields) {
                res.sendStatus(500);
            }

            const data = req.body;
            const epicLink = fields.find(field => field.name === 'Epic Link');
            const storyPoints = fields.find(field => field.name === 'Story Points');
            data['epicLink'] = epicLink.key;
            data['storyPoints'] = storyPoints.key;
            data['sharedSecret'] = sharedSecret;

            Instance.find({
                where: {
                    baseUrl: req.body.baseUrl
                }
            }).then((instance) => {
                if(instance) {
                    instance.sharedSecret = sharedSecret;
                    instance.save().then(() => {
                        res.sendStatus(200);
                    });
                } else {
                    Instance.create(data).then((instance) => {
                        Permission.bulkCreate([
                            {
                                instanceId: instance.id,
                                name: 'site-admins'
                            },
                            {
                                instanceId: instance.id,
                                name: 'administrators'
                            }
                        ]).then(() => {
                            res.sendStatus(200);
                        });
                    });
                }
            }).catch((error) => {
                Logger.logDb(error);
                res.sendStatus(500);
            });
        });
    });

    // add-on starting point
    app.get('/home', addon.authenticate(), (req, res) => {
        Api.client = addon.httpClient(req);
        Token.getUserFromToken(req, (user, instance) => {
            Api.getUserGroups(user, (userGroups) => {
                Permission.findAll({
                    where: {
                        instanceId: instance.id,
                    }
                }).then((permissions) => {
                    let authorized = false;
                    userGroups.map(userGroup => {
                        if (permissions.find(permission => permission.name === userGroup.name)) {
                            req.session.instance = instance;
                            return authorized = true;
                        }
                    });

                    if (authorized) {
                        res.render('home');
                    } else {
                        res.render('unauthorized');
                    }
                }).catch((error) => {
                    Logger.logDb(error);
                });
            });
        });
    });

    require('./permissions')(app, Api);
    require('./logs')(app, Api);


    // load any additional files you have in routes and apply those to the app
    {
        const fs = require('fs');
        const path = require('path');
        const files = fs.readdirSync("routes");
        for(let index in files) {
            let file = files[index];
            if (file === "index.js") continue;
            // skip non-javascript files
            if (path.extname(file) != ".js") continue;

            const routes = require("./" + path.basename(file));

            if (typeof routes === "function") {
                routes(app, addon);
            }
        }
    }
};
