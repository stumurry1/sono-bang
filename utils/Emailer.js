var nodemailer = require("nodemailer");
var handlebars = require("handlebars");
var fs = require("fs");

var transporter = nodemailer.createTransport({
    host: 'stumurry-com.mail.protection.outlook.com',
    port: 25,
    secure: false, // upgrade later with STARTTLS
    auth: {
        user: 'stu@stumurry.com',
        pass: 'stuart!2345'
    },            
            // authMethod:'NTLM',
            secure:false,
            // tls: {rejectUnauthorized: false},
            debug:true
});

var emailer = {
  sendEmail: function(templatePath) {
    var htmlData = fs.readFileSync(templatePath, { encoding: "utf-8" });
    var template = handlebars.compile(htmlData);
    if (template != undefined) console.log(template);
    else console.log("nothing in here");
    const mailOptions = {
      from: "noreply@stumurry.com", // sender address
      to: "stu@stumurry.com", // list of receivers
      subject: "A SONOBANG composer would like you to listen!", // Subject line
      html: htmlData
    };

    transporter.sendMail(mailOptions, function(err, info) {
      if (err) console.log(err);
      else console.log(info);
    });
  }
};

module.exports = emailer;