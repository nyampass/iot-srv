var mongoClient = require("mongodb").MongoClient;
var assert = require("assert");

var url = 'mongodb://localhost:27017/staff_ops';
var db = null;

function dbConnection(callback) {
  if (db != null) {
    callback(db);
  } else {
    mongoClient.connect(url, function(err, _db) {
      assert.equal(null, err);
      console.log("connected to db");
      db = _db;
      callback(db);
    })
  }
}

function dbDocumentCollection(callback) {
  dbConnection(function(db) {
    callback(db.collection("document"))
  })
}

var Document = function(id) {
  this.id = id;
}

function listDocument(callback) {
  findDocument(null, callback);
}

function findDocument(ops, callback) {
  dbDocumentCollection(function(docCollection) {
    var docs = [];
    docCollection.find(ops).each(function(err, doc) {
      if (doc != null) {
        docs.push(doc);
      } else {
        return callback(docs);
      }
    })
  })
}

function findOneDocument(ops, callback) {
  dbDocumentCollection(function(docCollection) {
    docCollection.findOne(ops, function(err, result) {
      callback(result)
    })
  })
}

function updateDocument(find_ops, update_ops, callback) {
  console.log('update')
  console.log(update_ops)
  dbDocumentCollection(function(docCollection) {
    docCollection.update(find_ops, update_ops, function(err, result) {
      // console.log('err')
      // console.log(err)
      // console.log('result')
      // console.log(result)
      callback(err, result)
    })
  })
}

function createDocument(create_ops, callback) {
  dbDocumentCollection(function(docCollection) {
    docCollection.insert(create_ops, function(err, result) {
      // console.log('err')
      // console.log(err)
      // console.log('result')
      // console.log(result)
      callback(err, result)
    })
  })
}

module.exports = function(id) { return new Document(id); };
module.exports.list = listDocument;
module.exports.findOne = findOneDocument;
module.exports.update = updateDocument;
module.exports.create = createDocument;
