'use strict';

const fs           = require('fs');
const path         = require('path');
const EventEmitter = require('events').EventEmitter;
const request      = require('request');
const OrbitDB      = require('orbit-db');
const Post         = require('ipfs-post');
const Logger       = require('logplease');
const logger       = Logger.create("Orbit.Orbit", { color: Logger.Colors.Green });
const utils        = require('./utils');

const getAppPath = () => {
  return process.type && process.env.ENV !== "dev" ? process.resourcesPath + "/app/" : process.cwd();
}

class Orbit {
  constructor(ipfs, events) {
    this.ipfs = ipfs;
    this.orbit = null;
    this.events = events;
    this._channels = {};
  }

  connect(network, username, password) {
    const user = { username: username, password: password };
    const cacheFile = path.resolve(getAppPath(), "orbit-db-cache.json");
    logger.debug("Load cache from:", cacheFile);
    logger.info(`Connecting to network '${network}' as '${username}`);
    OrbitDB.connect(network, user.username, user.password, this.ipfs, { cacheFile: cacheFile })
      .then((orbit) => this.orbit = orbit)
      .then(() => {
        logger.info(`Connected to '${this.orbit.network.name}' at '${this.orbit.network.publishers[0]}' as '${user.username}`)
        this.events.emit('network', this.orbit);
      })
      .catch((e) => {
        this.orbit = null;
        this._handleError(e);
      });
  }

  disconnect() {
    if(this.orbit) {
      logger.warn(`Disconnected from '${this.orbit.network.name}' at '${this.orbit.network.publishers[0]}'`);
      this.orbit.disconnect();
      this.orbit = null;
      this._channels = {};
      this.events.emit('network', this.orbit);
    }
  }

  getChannels(callback) {
    const channels = Object.keys(this._channels)
      .map((f) => this._channels[f])
      .map((f) => { return { name: f.name, password: f.password } });

    if(callback) callback(channels);

    return channels;
  }

  join(channel, password, callback) {
    logger.debug(`Join #${channel}`);
    if(!this._channels[channel]) {
      this.orbit.eventlog(channel, password).then((db) => {
        db.events.on('readable', this._handleStopLoading.bind(this));
        db.events.on('data', this._handleMessage.bind(this));
        db.events.on('load', this._handleStartLoading.bind(this));
        this._channels[channel] = { name: channel, password: password, db: db };
        this.events.emit('channels.updated', this.getChannels());
        if(callback) callback(null, { name: channel, modes: {} })
      });
    } else {
      if(callback) callback(null, { name: channel, modes: {} })
    }
  }

  leave(channel) {
    if(this._channels[channel]) {
      this._channels[channel].db.close();
      delete this._channels[channel];
      logger.debug("Left channel #" + channel);
      this.events.emit('channels.updated', this.getChannels());
    }
  }

  getUser(hash, callback) {
    // TODO: return user id from ipfs hash (user.id)
    if(callback) callback(this.orbit.user.id);
  }

  getSwarmPeers(callback) {
    this.ipfs.swarm.peers()
      .then((peers) => {
        if(callback)
          callback(peers.Strings);
      })
      .catch((e) => {
        this._handleError(e);
        if(callback) callback(null);
      });
  }

  getMessages(channel, lessThanHash, greaterThanHash, amount, callback) {
    logger.debug(`Get messages from #${channel}: ${lessThanHash}, ${greaterThanHash}, ${amount}`)
    let options = { limit: amount };
    if(lessThanHash) options.lt = lessThanHash;
    if(greaterThanHash) options.gte = greaterThanHash;
    const messages = this._channels[channel].db.iterator(options).collect();
    if(callback) callback(channel, messages);
  }

  getPost(hash, callback) {
    this.ipfs.object.get(hash)
      .then((res) => {
        if(callback)
          callback(null, JSON.parse(res.Data));
      })
      .catch((e) => {
        this._handleError(e);
        if(callback) callback(e.message, null);
      });
  }

  sendMessage(channel, message, callback) {
    logger.debug(`Send message to #${channel}: ${message}`);
    const data = {
      content: message,
      from: this.orbit.user.id
    };
    Post.create(this.ipfs, Post.Types.Message, data)
      .then((post) => this._channels[channel].db.add(post.Hash))
      .then((hash) => {
        if(callback)
          callback(null);
      })
      .catch((e) => {
        this._handleError(e);
        if(callback) callback(e.message);
      });
  }

  addFile(channel, filePath, callback) {
    const addToIpfs = (ipfs, filePath, isDirectory) => {
      return new Promise((resolve, reject) => {
        if(!fs.existsSync(filePath))
          throw "File not found at '" + filePath + "'";

        // this.ipfs.add(filePath, { recursive: recursive }).then((hash) => {
        this.ipfs.add(filePath, { recursive: isDirectory }).then((hash) => {
          logger.debug("H, " + JSON.stringify(hash));

          if(isDirectory) {
            // FIXME: ipfs-api returns an empty dir name as the last hash, ignore this
            if(hash[hash.length-1].Name === '')
              resolve(hash[hash.length-2].Hash);

            resolve(hash[hash.length-1].Hash);
          } else {
            resolve(hash[0].Hash);
          }
        });
      });
    }

    logger.info("Adding file from path '" + filePath + "'");
    let isDirectory = false, size = -1, hash;
    utils.isDirectory(filePath)
      .then((res) => isDirectory = res)
      .then(() => addToIpfs(this.ipfs, filePath, isDirectory))
      .then((res) => hash = res)
      .then(() => utils.getFileSize(filePath))
      .then((res) => size = res)
      .then(() => {
        logger.info("Added local file '" + filePath + "' as " + hash);

        const data = {
          name: filePath.split("/").pop(),
          hash: hash,
          size: size,
          from: this.orbit.user.id
        };

        const type = isDirectory ? Post.Types.Directory : Post.Types.File;
        Post.create(this.ipfs, type, data).then((post) => {
          this._channels[channel].db.add(post.Hash).then((hash) => {
            if(callback) callback(null);
          });
        });
      });
  }

  getDirectory(hash, callback) {
    this.ipfs.ls(hash).then((result) => {
      if(result.Objects && callback)
        callback(result.Objects[0].Links);
    }).catch((e) => {
      this._handleError(e);
      if(callback) callback(null);
    });
  }

  getFile(hash, callback) {
    request('http://localhost:8080/ipfs/' + hash, function (error, response, body) {
      if(!error && response.statusCode === 200) {
        if(callback) callback(body);
      }
    })
  }

  get user() {
    return this.orbit.user;
  }

  get network() {
    return this.orbit.network;
  }

  _handleError(e) {
    logger.error(e.message);
    logger.debug("Stack trace:\n", e.stack);
    this.events.emit('orbit.error', e.message);
  }

  _handleMessage(channel, message) {
    this.events.emit('message', channel, message);
  }

  _handleStartLoading(channel) {
    logger.debug("load channel", channel)
    this.events.emit('db.load', channel)
  }

  _handleStopLoading(channel) {
    logger.debug("channel ready", channel)
    this.events.emit('readable', channel)
  }

  onSocketConnected(socket) {
    this.events.emit('network', this.orbit);
  }

}

module.exports = Orbit;
