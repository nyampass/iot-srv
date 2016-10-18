var fs = require('fs');
var path = require('path');
var appDir = path.dirname(require.main.filename)
var documentsDir = appDir + '/views/docs'

var Document = function(name) {
  this.name = name;
}

function DocumentList(callback) {
  fs.readdir(documentsDir, function(err, files) {
    callback(
      files.map( function (file_name) {
      return {name: file_name}
      })
    )
  })
}

Document.prototype.info = function(callback) {
  var name = this.name;
  fs.readFile(documentsDir + '/' + name, 'utf-8', function(err, data) {
    callback({
      body: data
    });
  })
}

module.exports = function(name) { return new Document(name); };
module.exports.list = DocumentList;
