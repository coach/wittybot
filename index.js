'use strict';

const Logger = require('node-wit').Logger;
const levels = require('node-wit').logLevels;
const Wit = require('node-wit').Wit;

const logger = new Logger(levels.DEBUG);

class Wittybot {

  constructor(attrs) {
    let wittybot = this;
    let session = attrs.session;
    let reply = this.reply;
    let ask = this.ask;
    let defaultActions = {
      say(session, context, message, cb) {
        wittybot.reply(message);
        cb();
      },
      merge(session, context, entities, message, cb) {
        cb(context);
      },
      error(session, context, error) {
      }
    };
    let customActions = {};

    Object.keys(attrs.actions).forEach(actionKey => {
      customActions[actionKey] = function (sessionId, context, cb) {
        attrs.actions[actionKey](wittybot, context);
        cb(context);
      };
    });

    this.actions = Object.assign({}, customActions, defaultActions);
    this.context = {};
    this.session = session;
    this.onMessage = attrs.onMessage;

    this.script = null;

    this.wit = new Wit(attrs.token, this.actions, logger);
  }

  reply(message) {
    if (typeof message === 'string') {
      message = {
        text: message
      };
    }
    this.onMessage(message);
  }

  /**
   * Let the bot ask a question,
   * question expect replies
   * @param  {String} question
   * @return {Promise}
   */
  ask(question) {
    return new Promise((resolve, reject) => {
      this.reply(question);
      this.receivesAnswer = resolve;
    });
  }

  end() {
    console.log('receivesAnswer', this.receivesAnswer);
    this.receivesAnswer = null;
  }

  /**
   * Make the bot hear a string of text
   * @param  {String} message
   * @return {Promise}
   */
  hears(message) {
    return new Promise((resolve, reject) => {
      // Check if the bot is awaiting
      // an answer to a question
      if (!this.receivesAnswer) {
        // Figure out the next step from wit.ai
        this.wit.runActions(this.session, message, this.context, (err, context) => {
          if (err) {
            return reject(err);
          }
          this.context = context;
          resolve();
        });
      } else {
        // Carry the next step without wit.ai
        this.receivesAnswer(message)
          .then(resolve);
      }
    });
  }

}

module.exports = Wittybot;
