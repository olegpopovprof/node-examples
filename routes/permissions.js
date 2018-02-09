const auth = require('./../api/auth');
const models = require('./../models');
const Permission = models.Permission;
const Client = require('../helpers/client');

module.exports = (app, Api) => {
    app.get('/permissions', auth.check, (req, res) => {
        Api.getGroups((jiraGroups) => {
            if(!jiraGroups) {
                Client.error(res, 'Groups not found');
            }
            Permission.findAll({
                where: {
                    instanceId: req.session.instance.id,
                }
            }).then((permissions) => {
                Client.success(res, {
                    permissions: permissions,
                    jiraGroups: jiraGroups
                });
            }).catch((err) => {
                Client.error(res, err, 'Failed to load execution logs');
            });
        });
    });

    app.post('/permissions', auth.check, (req, res) => {
        const data = req.body;
        data['instanceId'] = req.session.instance.id;
        Permission.create(data).then((permission) => {
            Client.success(res, {
                message: 'Permission added successfully',
                permission: permission
            });
        }).catch((err) => {
            Client.error(res, err, 'Failed to add permission');
        });
    });

    app.delete('/permissions/:id', auth.check, (req, res) => {
        Permission.destroy({
            where: {
                id: req.params.id
            }
        })
            .then(() => Client.success(res, 'Permission removed successfully'))
            .catch((err) => Client.error(res, err, 'Failed to remove permission'));
    });

};