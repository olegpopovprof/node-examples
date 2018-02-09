const auth = require('./../api/auth');
const models = require('./../models');
const Client = require('../helpers/client');
const Log = models.ExecutionLog;

module.exports = (app) => {

    app.get('/logs', auth.check, (req, res) => {
        Log.findAll({
            where: {
                instanceId: req.session.instance.id
            }
        }).then((logs) => {
            Client.success(res, {
                logs: logs
            });
        }).catch((err) => {
            Client.error(res, err, 'Failed to load execution logs');
        });
    });

};