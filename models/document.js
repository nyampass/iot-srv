var redis = require('redis');
var _redisClient = null;

var REDIS_DOCUMENT_KEY = {
  TITLE: "title",
  BODY: "body",
  UPDATED_AT: "updated_at",
}

function redisDocumentKey(documentPath, key, option) {
  return "doc:" + documentPath + ":" + key + (option? ":" + option: "");
}

function redisClient() {
  if (_redisClient) {
    return _redisClient;
  }

  _redisClient = redis.createClient(process.env.REDIS_URL);
  _redisClient.on('error', function(err) {
    console.log(err);
    _redisClient = null;
  });
  return _redisClient;
}

function loge(err) {
  if (err) {
    console.log("ERR: " + err);
  }
}

var Document = function(path) {
  this.path = path;
}

Document.prototype.info = function(callback) {
  var path = this.path;
  redisClient().mget([
    redisDocumentKey(path, REDIS_DOCUMENT_KEY.TITLE),
    redisDocumentKey(path, REDIS_DOCUMENT_KEY.BODY),
    redisDocumentKey(path, REDIS_DOCUMENT_KEY.UPDATED_AT)], function(err, vals) {
      callback({
        path: path,
        title: vals[0],
        body: vals[1],
        updated_at: vals[2],
      });
    });
}

Document.prototype.setText = function(vals, callback) {
  var path = this.path;
  var now = new Date().getTime();
  redisClient().mset([
    redisDocumentKey(path, REDIS_DOCUMENT_KEY.TITLE), vals.title,
    redisDocumentKey(path, REDIS_DOCUMENT_KEY.BODY), vals.body,
    redisDocumentKey(path, REDIS_DOCUMENT_KEY.UPDATED_AT), now], function(err, vals) {
      callback();
    });
}

Document.prototype.destroy = function(callback) {
  var path = this.path;
  redisClient().del(
    redisDocumentKey(path, REDIS_DOCUMENT_KEY.TITLE),
    redisDocumentKey(path, REDIS_DOCUMENT_KEY.BODY),
    redisDocumentKey(path, REDIS_DOCUMENT_KEY.UPDATED_AT),
    function(err, o) {
      callback()
    })
}

function documentList(callback) {
  redisClient().keys(
    redisDocumentKey("*", REDIS_DOCUMENT_KEY.TITLE),
    function (err, keys) {
      loge(err);
      callback(keys.map(function(o) {
        return {
          path: o.split(":")[1],
          title: o.split(":")[1],
        }
      }));
    });
}

module.exports = function(path) { return new Document(path); };
module.exports.list = documentList;
