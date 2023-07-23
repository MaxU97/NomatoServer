const hbs = require("nodemailer-express-handlebars");
const nodemailer = require("nodemailer");
const path = require("path");
const Logger = require("../../logger/logger.service")

const logger = new Logger("email");

module.exports = (mailOptions) => {
  const transporter = nodemailer.createTransport({
    host: "mail.nomato.eu",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

  logger.debug("mailer::transporter", process.env.EMAIL,process.env.PASSWORD);

  const handlebarOptions = {
    viewEngine: {
      partialsDir: path.join(__dirname, "email_templates"),
      defaultLayout: false,
    },
    viewPath: path.join(__dirname, "email_templates"),
  };
  logger.debug("mailer::handlerbar", handlebarOptions);

  transporter.use("compile", hbs(handlebarOptions));

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      logger.debug("mailer::error", error);
      return;
    }
    logger.debug(`Message sent to ${mailOptions.to}. Response:`, info.response);
  });
};
