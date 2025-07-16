# @imqueue/sequelize

[![Build Status](https://img.shields.io/github/actions/workflow/status/imqueue/sequelize/build.yml)](https://github.com/imqueue/sequelize)
[![Known Vulnerabilities](https://snyk.io/test/github/imqueue/sequelize/badge.svg?targetFile=package.json)](https://snyk.io/test/github/imqueue/sequelize?targetFile=package.json)
[![License](https://img.shields.io/badge/license-GPL-blue.svg)](https://rawgit.com/imqueue/sequelize/master/LICENSE)

Sequelize ORM refines for @imqueue

# Install

~~~bash
npm i --save @imqueue/sequelize
~~~

# Docs

~~~bash
git clone git@github.com:imqueue/sequelize.git
cd sequelize
npm i
npm run doc
~~~

# Usage

~~~typescript
import { database, query } from '@imqueue/sequelize';

const sequelize = database({
    logger: console,
    modelsPath: './src/orm/models',
    sequelize: {
        benchmark: true,
        dialect: 'postgres',
        storage: 'sequelize',
        pool: {
            max: 250,
            min: 2,
            idle: 30000,
            acquire: 30000,
        },
    },
});


~~~

## License

This project is licensed under the GNU General Public License v3.0.
See the [LICENSE](LICENSE)
