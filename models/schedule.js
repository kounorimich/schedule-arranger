'use strict';

const loader = require('./sequelize-loader');
const Sequelize = loader.Sequelize;

const Schedule = loader.database.define('schedules', {
    scheduleId: {
        type: Sequelize.UUID, // 予定のURLが容易に特定されないよう、UUIDでランダムな数を生成して、IDとし、URLに使う
        primaryKey: true,
        allowNull: false
    },
    scheduleName: {
        type: Sequelize.STRING,
        allowNull: false
    },
    memo: {
        type: Sequelize.TEXT,
        allowNull: false
    },
    createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    updateAt: {
        type: Sequelize.DATE,
        allowNull: false
    }
}, {
    freezeTableName: true,
    timestamps: false,
    indexes: [
        {
            fields: ['createdBy']
        }
    ]
});

module.exports = Schedule;
