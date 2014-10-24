/*globals Worker */
/*jslint indent:2, white:true, node:true, sloppy:true, browser:true */
/*jshint -W089 */

var Link = require('../link');

/**
 * A port providing message transport between two freedom contexts via Worker.
 * @class Worker
 * @extends Link
 * @uses handleEvents
 * @constructor
 */
var WorkerLink = function(id, resource) {
  Link.call(this, id, resource);
  if (id) {
    this.id = id;
  }
};

/**
 * Start this port by listening or creating a worker.
 * @method start
 * @private
 */
WorkerLink.prototype.start = function() {
  if (this.config.moduleContext) {
    this.setupListener();
  } else {
    this.setupWorker();
  }
};

/**
 * Stop this port by destroying the worker.
 * @method stop
 * @private
 */
WorkerLink.prototype.stop = function() {
  // Function is determined by setupListener or setupFrame as appropriate.
};

/**
 * Get the textual description of this port.
 * @method toString
 * @return {String} the description of this port.
 */
WorkerLink.prototype.toString = function() {
  return "[Worker " + this.id + "]";
};

/**
 * Set up a global listener to handle incoming messages to this
 * freedom.js context.
 * @method setupListener
 */
WorkerLink.prototype.setupListener = function() {
  var onMsg = function(msg) {
    this.emitMessage(msg.data.flow, msg.data.message);
  }.bind(this);
  this.obj = this.config.global;
  this.obj.addEventListener('message', onMsg, true);
  this.stop = function() {
    this.obj.removeEventListener('message', onMsg, true);
    delete this.obj;
  };
  this.emit('started');
  this.obj.postMessage('Ready For Messages');
  // Whitelist for allowed globals, mask all others
  var whitelist = ['Array', 'ArrayBuffer', 'Boolean', 'DataView', 'Date',
                   'Error', 'Float32Array', 'Float64Array', 'Infinity',
                   'Int16Array', 'Int32Array', 'Int8Array', 'Intl', 'JSON',
                   'Math', 'NaN', 'Number', 'Object', 'Promise', 'RangeError',
                   'RegExp', 'String', 'SyntaxError', 'URIError', 'Uint16Array',
                   'Uint32Array', 'Uint8Array', 'Uint8ClampedArray', 'console',
                   'decodeURI', 'decodeURIComponent', 'encodeURI',
                   'encodeURIComponent', 'escape', 'isFinite', 'isNaN',
                   'parseFloat', 'parseInt', 'undefined', 'unescape'];
  // This loops over *all* properties, enumerable and not
  Object.getOwnPropertyNames(this.obj).forEach(function(val, idx, array) {
    if (whitelist.indexOf(val) === -1) {
      Object.defineProperty(this, val, {value:undefined});
    }
  });
  Object.freeze(this);
};

/**
 * Set up a worker with an isolated freedom.js context inside.
 * @method setupWorker
 */
WorkerLink.prototype.setupWorker = function() {
  var worker,
    blob,
    self = this;
  worker = new Worker(this.config.source + '#' + this.id);

  worker.addEventListener('error', function(err) {
    this.onError(err);
  }.bind(this), true);
  worker.addEventListener('message', function(worker, msg) {
    if (!this.obj) {
      this.obj = worker;
      this.emit('started');
      return;
    }
    this.emitMessage(msg.data.flow, msg.data.message);
  }.bind(this, worker), true);
  this.stop = function() {
    worker.terminate();
    if (this.obj) {
      delete this.obj;
    }
  };
};

/**
 * Receive messages from the hub to this port.
 * Received messages will be emitted from the other side of the port.
 * @method deliverMessage
 * @param {String} flow the channel/flow of the message.
 * @param {Object} message The Message.
 */
WorkerLink.prototype.deliverMessage = function(flow, message) {
  if (flow === 'control' && message.type === 'close' &&
      message.channel === 'control') {
    this.stop();
  } else {
    if (this.obj) {
      this.obj.postMessage({
        flow: flow,
        message: message
      });
    } else {
      this.once('started', this.onMessage.bind(this, flow, message));
    }
  }
};

module.exports = WorkerLink;
