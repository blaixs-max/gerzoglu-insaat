'use strict';
const nodemailer = require('nodemailer');
const { createContactHandler } = require('../lib/contact.cjs');

module.exports = createContactHandler({
  sendMail: async (config, message) => {
    const { from, ...options } = config;
    const transport = nodemailer.createTransport(options);
    try { return await transport.sendMail(message); }
    finally { transport.close(); }
  }
});
