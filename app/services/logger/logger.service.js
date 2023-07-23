const log4js = require("log4js");

const LOGGER_CONFIG = {
    appenders: { 
        app: { type: "file", filename: "app.log" } ,
        email: { type: "file", filename: "email.log" } 
    },
    categories: {
        default: { appenders: ["app"], level: "debug" },
        email: { appenders: ["email"], level: "debug" }  
    },
};

log4js.configure(LOGGER_CONFIG);

class Logger {
    constructor(name) {
        this.logger = log4js.getLogger(name);
    }

    debug(message, ...args) {
        this.logger.debug(message, args);
    }
}

module.exports = Logger;