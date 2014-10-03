// get packages
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var rmdir = require('rimraf');
var mkdirp = require('mkdirp');
var jquery = fs.readFileSync('./jquery.js').toString();

// get directory and destination from command line
var dir = process.argv.slice(2, 3).toString();
var dest = process.argv.slice(3, 4).toString();

// clean up destination
if (fs.existsSync(dest)) {
  rmdir(dest, function(){});
}

// read directory
fs.readdir(dir + '/', function(err, files) {

  // print errors
  if (err) {
    console.log(err);
  }

  /**
   * read file
   * @param  {object} file gets file
   * @param  {string} fileDir gets file directory
   */
  var read = function(file, fileDir) {
    var fileData = {};


    var f = fs.readFileSync(dir + '/' + fileDir + file, 'utf8');
    var name = file.replace(/\.svg|\.txt/g, '');

    fileData.name = name;
    fileData.data = f;

    // parse file
    parse(fileData, fileDir);

    // *** logs ***
    console.log('Reading file: ', file);
  };

  /**
   * grind data from SVG file
   * @param  {object}   $        jQuery object
   * @param  {object}   $e       gets element
   * @param  {Function} callback callback
   */
  var grind = function($, $e, callback) {

    // output template
    var output = {
      joined: '',
      viewbox: {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      },
      parts: []
    };

    // get viewBox attribute
    var svgViewbox = $e[0].getAttribute('viewBox');

    // promise
    $.when(

      // parse viewBox attribute
      Object.keys(output.viewbox).forEach(function(key, index) {
        var viewbox = svgViewbox.split(' ').map(function(val) {
          return parseInt(val, 10);
        });
        output.viewbox[key] = viewbox[index];
      }),

      // get 
      $e.find('path').each(function(i, e) {
        var $e = $(e);

        var name = $e.attr('id');
        var d = $e.attr('d');

        // if path has name and name matches pattern
        if (name && name.match(/\w+_\d+/g)) {

          // filter name and d
          name = name.replace(/_[a-z]\d[a-z]/ig, '');
          d = d.replace(/\\n+|\\t+/g, '').replace(/\r?\n|\r|\t/g, '');

          // push joined path data
          output.joined += d;

          // push parts data
          output.parts.push({
            name: name,
            d: d,
            url: '/' + name,
            text: null
          });
        }

      })

      // init callback when done
    ).then(function() {
      callback(output);
    });
  };

  /**
   * parse SVG file using jsdom
   * @param  {object} fileData gets file data
   * @param  {string} fileDir gets file directory
   */
  var parse = function(fileData, fileDir) {

    jsdom.env({
      html: fileData.data,
      src: [jquery],
      done: function(errors, window) {
        var $ = window.$;

        // each top level group
        var $svg = $('svg');

        // grind svg and write file
        grind($, $svg, function(output) {
          write(fileData, output, fileDir);
        });
      }
    });
  };

  /**
   * write parsed data to file
   * @param  {object} fileData gets data from file
   * @param  {object} output   gets output
   */
  var write = function(fileData, output, fileDir) {
    var filename = fileData.name;

    // write file
    var writeFile = function() {
      fs.writeFile(dest + '/' + fileDir + filename + '.json', JSON.stringify(output), function(err) {

        // *** logs ***
        if (err) {
          console.log(err);
        } else {
          console.log(filename + ' was saved!\r\n');
        }
      });
    }

    // create recursivily directories
    mkdirp(dest + '/' + fileDir, function() {
      writeFile();
    });

  };

  /**
   * iterate over files in directory
   * @param  {object} file gets file
   */
  files.forEach(function(file) {

    var fileDir = '';

    // filter file name from directories
    if (!file.match(/\w+\.[a-z]+|\.\w+/g)) {
      fileDir += file + '/';
      
      // if directory read it      
      fs.readdir(dir + '/' + fileDir, function(err, files) {

        // for each files in dir read file, if it's not
        // file beginning with dot
        files.forEach(function(file) {
          if (!file.match(/^\.\w+/g)) {
            read(file, fileDir);
          }
        });

      });

    // read other files, in main directory
    } else if (file.match(/\w+\.[a-z]+/g)) {
      read(file, fileDir);
    }

  });

});