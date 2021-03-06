const config = require('config');

const mongooseOptions = {
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
    useUnifiedTopology: (config.get('mongodb.useUnifiedTopology') === 'true'),
    readPreference: 'secondaryPreferred', // Has MongoDB prefer secondary servers for read operations.
    appname: 'subscriptions', // Displays the app name in MongoDB logs, for ease of debug
    serverSelectionTimeoutMS: 10000, // Number of milliseconds the underlying MongoDB driver has to pick a server
    // loggerLevel: config.get('logger.level') // Logger level to pass to the MongoDB driver
};

module.exports = mongooseOptions;
