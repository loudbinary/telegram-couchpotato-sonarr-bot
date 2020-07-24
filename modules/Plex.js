/* global __dirname */

'use strict';

var _                 = require('lodash');            // https://www.npmjs.com/package/lodash
var moment            = require('moment');            // https://www.npmjs.com/package/moment
var axios             = require('request');   // https://www.npmjs.com/package/couchpotato-api
var parseString = require('xml2js').parseString;
var Promise = require('bluebird')
/*
 * libs
 */
var i18n      = require(__dirname + '/../lib/lang');      // set up multilingual support
var config    = require(__dirname + '/../lib/config');    // the concised configuration
var state     = require(__dirname + '/../lib/state');     // handles command structure
var logger    = require(__dirname + '/../lib/logger');    // logs to file and console
var acl       = require(__dirname + '/../lib/acl');       // set up the acl file

function PlexMessage(bot,user,cache) {
    this.bot = bot;
    this.user = user;
    this.cache = cache;
    this.adminId = config.bot.owner;
    this.username = this.user.username || (this.user.first_name + (' ' + this.user.last_nam || ''));
    this.host = "192.168.0.254";
    this.port = 32400;
    this.token = config.plex.token;
}

async function getLibraries(host,port,token) {
    var plexLibraries = []
    let results = await axios.get('http://' + host + ':' + port + '/library/sections' + '?X-Plex-Token=' + token)
    return results.data.MediaContainer.Directory;
}
async function getMovies(host,port,token) {
    var plexLibraries = getLibraries(host,port,token);
    console.log(plexLibraries)
}
PlexMessage.prototype.getMoviesInLibrary = function (libraryId,user,cb) {
    var self = this;
    libraryId = libraryId.key;
    var request = require('request');
    var options = {
      'method': 'GET',
      'url': 'http://' + self.host + ':' + self.port + '/library/sections/' + libraryId + '/all?X-Plex-Token=' + self.token,
      'headers': {
    }
    };
    let getList =  {
    libraryId: libraryId,
    parseResults: function(response) {
        return new Promise((resolve,reject)=>{
           parseString(response.body, function (err, result) {
             var libraries =[]
             libraries =  _.flattenDeep(result.MediaContainer.Video)
             libraries = _.map(libraries,function(item){
                 return item["$"]
             })
            var library = _.map(libraries, (v,i,s)=>{
              return v;
            })
            library = _.compact(library)
            resolve(library)
          })
    })},
           makeRequestForMovies: function(library) {
            return new Promise((resolve,reject) => {
                request(options, function (error, response) { 
                    var self = this;
                  if (error) throw new Error(error);
                  resolve(response);
                });
            })
    }
    
  }
  getList.makeRequestForMovies(libraryId)
    .then(results =>{
        getList.parseResults(results)
        .then(results=> { 
            cb(results,user)     
      })
    })
}
PlexMessage.prototype.getMovieLibraries = function (library,user,cb) {
    var self = this;
        logger.info(i18n.__('logPlexQueryMovieListCommandSent'));
    var request = require('request');
    var options = {
      'method': 'GET',
      'url': 'http://' + self.host + ':' + self.port + '/library/sections?X-Plex-Token=' + self.token,
      'headers': {
    }
    };
    let getList =  {
      library: library || "movies",
      parseResults: function(library,response) {
        return new Promise((resolve,reject)=>{
            library: this.library || "movies"
           parseString(response.body, function (err, result) {
             var libraries =[]
             libraries =  _.flattenDeep(result.MediaContainer.Directory)
             libraries = _.map(libraries,function(item){
                 return item["$"]
             })
            var library = _.map(libraries, (v,i,s)=>{
            if (v.title.toLowerCase() == getList.library ) {
                  return v
              }
            })
            library = _.compact(library)
            resolve(library)
          })
      })},
      makeRequest: function(library) {
            return new Promise((resolve,reject) => {
                request(options, function (error, response) { 
                    var self = this;
                  if (error) throw new Error(error);
                  resolve(response);
                });
            })
      }
    }
    getList.makeRequest(library)
      .then(response =>{
        if (typeof(response) !== 'undefined') {
            getList.parseResults(library,response)
              .then(results=> { 
                  cb(results,user)     
            })
        }
      })
}

PlexMessage.prototype.getMoviesInLibrary = function (libraryId,user,cb) {
    var self = this;
    libraryId = libraryId.key;
    var request = require('request');
    var options = {
      'method': 'GET',
      'url': 'http://' + self.host + ':' + self.port + '/library/sections/' + libraryId + '/all?X-Plex-Token=' + self.token,
      'headers': {
    }
    };
    let getList =  {
    libraryId: libraryId,
    parseResults: function(response) {
        return new Promise((resolve,reject)=>{
           parseString(response.body, function (err, result) {
             var libraries =[]
             libraries =  _.flattenDeep(result.MediaContainer.Video)
             libraries = _.map(libraries,function(item){
                 return item["$"]
             })
            var library = _.map(libraries, (v,i,s)=>{
              return v;
            })
            library = _.compact(library)
            resolve(library)
          })
    })},
           makeRequestForMovies: function(library) {
            return new Promise((resolve,reject) => {
                request(options, function (error, response) { 
                    var self = this;
                  if (error) throw new Error(error);
                  resolve(response);
                });
            })
    }
    
  }
  getList.makeRequestForMovies(libraryId)
    .then(results =>{
        getList.parseResults(results)
        .then(results=> { 
            cb(results,user)     
      })
    })
}

PlexMessage.prototype.refreshAllLibraries = function (user,cb) {
    var self = this;
        logger.info(i18n.__('logPlexRefreshAllLibrariesCommandSent'));
    var request = require('request');
    var options = {
      'method': 'GET',
      'url': "",
      'headers': {
    }
    };
    let getList =  {
      parseResults: function(response) {
        return new Promise((resolve,reject)=>{
            library: this.library || "movies"
           parseString(response.body, function (err, result) {
             var libraries =[]
             libraries =  _.flattenDeep(result.MediaContainer.Directory)
             libraries = _.map(libraries,function(item){
                 return item["$"]
             })
            var library = _.map(libraries, (v,i,s)=>{
               return v;
            })
            library = _.compact(library)
            resolve(library)
          })
      })},
      makeRequest: function(library) {
            return new Promise((resolve,reject) => {
                options.uri = 'http://' + self.host + ':' + self.port + '/library/sections?X-Plex-Token=' + self.token,
                request(options, function (error, response) { 
                    var self = this;
                  if (error) throw new Error(error);
                  resolve(response);
                });
            })
      },
      refreshLibrary: function(libraryKey) {
          return new Promise((resolve,reject) =>  {
           options.uri = 'http://' + self.host + ':' + self.port + '/library/sections/'+ libraryKey + '/refresh?X-Plex-Token=' + self.token
           request(options, function (error, response) { 
              var self = this;
            if (error) throw new Error(error);
            resolve(response);
          })
        })
      }
    }
    getList.makeRequest()
      .then(response =>{
        if (typeof(response) !== 'undefined') {
            getList.parseResults(response)
              .then(results=> { 
                  _.forEach(results,(v,i,s)=>{
                      getList.refreshLibrary(v.key);
                  })
            })
              .then(() =>{
                cb("Library Refresh Initiated",user)  
              })
        }
      })
}




module.exports = PlexMessage;