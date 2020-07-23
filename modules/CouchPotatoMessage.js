/* global __dirname */

'use strict';

var _                 = require('lodash');            // https://www.npmjs.com/package/lodash
var moment            = require('moment');            // https://www.npmjs.com/package/moment
var CouchPotatoAPI    = require('couchpotato-api');   // https://www.npmjs.com/package/couchpotato-api

/*
 * libs
 */
var i18n      = require(__dirname + '/../lib/lang');      // set up multilingual support
var config    = require(__dirname + '/../lib/config');    // the concised configuration
var state     = require(__dirname + '/../lib/state');     // handles command structure
var logger    = require(__dirname + '/../lib/logger');    // logs to file and console
var acl       = require(__dirname + '/../lib/acl');       // set up the acl file

/*
 * initalize the class
 */
function CouchPotatoMessage(bot, user, cache) {
  this.bot      = bot;
  this.user     = user;
  this.cache    = cache;
  this.adminId  = config.bot.owner;
  this.username = this.user.username || (this.user.first_name + (' ' + this.user.last_name || ''));

  this.couchpotato = new CouchPotatoAPI({
    hostname : config.couchpotato.hostname, 
    apiKey   : config.couchpotato.apiKey,
    port     : config.couchpotato.port, 
    urlBase  : config.couchpotato.urlBase,
    ssl      : config.couchpotato.ssl, 
    username : config.couchpotato.username,
    password : config.couchpotato.password
  });
  
}

/*
 * handle the flow of adding a new movie
 */
CouchPotatoMessage.prototype.sendMoviesList = function(movieName) {
  var self = this;
  
  logger.info(i18n.__('logCouchPotatoQueryCommandSent', self.username));
  
  self.couchpotato.get('movie.search', { 'q': movieName }).then(function(result) {
      
      if (!result.movies) {
        throw new Error(i18n.__('errorCouchPotatoMovieNotFound', movieName));
      }
  
      var movies = result.movies;

      logger.info(i18n.__('logCouchPotatoUserMovieRequested', self.username, movieName));
  
      var movieList = [], keyboardList = [];
      var response = [i18n.__('botChatCouchPotatoFoundMovies', movies.length)];
  
      _.forEach(movies, function(n, key) {
  
        var id = key + 1;
        var title = n.original_title;
        var year = ('year' in n ? n.year : '');
        var rating = ('rating' in n ? ('imdb' in n.rating ? n.rating.imdb[0] + '/10' : '') : '');
        var movieId = ('imdb' in n ? n.imdb : n.tmdb_id);
        var thumb = ('images' in n ? ('poster' in n.images ? n.images.poster[0] : '') : '');
        var runtime = ('runtime' in n ? n.runtime : '');
        var onIMDb = ('via_imdb' in n ? true : false);
        var keyboardValue = title + (year ? ' - ' + year : '');
  
        movieList.push({
          'id': id,
          'title': title,
          'year': year,
          'rating': rating,
          'movie_id': movieId,
          'thumb': thumb,
          'via_imdb': onIMDb,
          'keyboard_value': keyboardValue
        });
  
        response.push(
          '*' + id + '*) ' +
          (onIMDb ? '[' + title + '](http://imdb.com/title/' + movieId + ')' : '[' + title + '](https://www.themoviedb.org/movie/' + movieId + ')') +
          (year ? ' - _' + year + '_' : '') +
          (rating ? ' - _' + rating + '_' : '') +
          (runtime ? ' - _' + runtime + 'm_' : '')
        );
        
        // One movie per row of custom keyboard
        keyboardList.push([keyboardValue]);
        
      });
      
      response.push(i18n.__('selectFromMenu'));
      logger.info(i18n.__("logSonarrFoundSeries2", self.username, keyboardList.join(',')));
  
      // set cache
      self.cache.set('movieList' + self.user.id, movieList);
      self.cache.set('state' + self.user.id, state.couchpotato.CONFIRM);
      
      return self._sendMessage(movieList.join('\n'), keyboardList);
      
    })
    .catch(function(error) {
      return self._sendMessage(error);
    });
};

CouchPotatoMessage.prototype.getMovieList = function () {
  var self = this;
  logger.info(i18n.__('logCouchPotatoQueryCommandSent', self.username));
  self.couchpotato.get('media.list')
    .then(function(result) {
      logger.info('user: %s, message: all movies');

      var response = [];
      _.forEach(result.movies, function(n, key) {
        var movieId = (n.info.imdb ? n.info.imdb : n.info.tmdb_id);
        var onIMDb = (n.info.via_imdb ? true : false);
        var movie = (onIMDb ? '[' + n.title + '](http://imdb.com/title/' + movieId + ')' : '[' + n.title + '](https://www.themoviedb.org/movie/' + movieId + ') - ' + n.info.year);

        if (query) {
          if (n.title.search( new RegExp(query, 'i') ) !== -1) {
            response.push(movie);
          }
        } else {
          response.push(movie);
        }
      });

      if (!response.length) {
        return replyWithError(fromId, new Error('Unable to locate ' + query + ' in couchpotato library'));
      }

      response.sort();
      var query = 0
      if (query) {
        // add title to begining of the array
        response.unshift('*Found matching results in CouchPotato library:*');
      }

      if (response.length > 50) {
        var splitReponse = _.chunk(response, 50);
        splitReponse.sort();
        _.forEach(splitReponse, function(n) {
          n.sort();
          self._sendMessage( n.join('\n'));
        });
      } else {
        self._sendMessage(response.join('\n'));
      }
    })
    .catch(function(err) {
      console.error(err);
    })

}


CouchPotatoMessage.prototype.confirmMovieSelect = function(displayName) {
  var self = this;

  var moviesList = self.cache.get('movieList' + self.user.id);

  if (!moviesList) {
    return self._sendMessage(new Error(i18n.__('errorSonarrWentWrong')));
  }

  var selectedMovie = _.map(moviesList,((v,i,s)=>{
    if (v.keyboard_value == displayName) {
      return s[i]
    }
  }));
  
  var cacheItems = [
    'movieId', 'movieList', 'movieProfileList',
    'state', 'revokedUserName', 'revokeUserList'
  ];

  var movie = _.filter(moviesList, function(item) { return item.keyboard_value === displayName; })[0];
  let clearCache = function() {
    return _(cacheItems).forEach(function(item) {
      self.cache.del(item + self.user.id);
    });
  }

  self.couchpotato.get('movie.add', {
      'identifier': movie.movie_id,
      'title': movie.title
    })
    .then(function(result) {
      logger.info('user: %s, message: added movie "%s"', self.user.id, movie.title);

      if (!result.success) {
        throw new Error('could not add movie, try searching again.');
      }


      self._sendMessage('[Movie added!](' + movie.thumb + ')');
    })
    .catch(function(err) {
      console.log(self.user.id, err);
    })
    .finally(function() {
      console.log(self.user.id);
    });


  // TO CONTINUE !!!!
  
};

/*
 * private methods
 */
CouchPotatoMessage.prototype._sendMessage = function(message, keyboard) {
  var self = this;
  keyboard = keyboard || [];

  var options;
  if (message instanceof Error) {
    logger.warn(i18n.__("logMessageClear", self.username, message.message));

    message = message.message;
    options = {
      'parse_mode': 'Markdown',
      'reply_markup': {
        'hide_keyboard': true
      }
    };
  } else {
    options = {
      // 'disable_web_page_preview': true,
      'parse_mode': 'Markdown',
      'selective': 2,
      'reply_markup': JSON.stringify( { keyboard: keyboard, one_time_keyboard: true })
    };
  }

  return self.bot.sendMessage(self.user.id, message, options);
};


/*
 * handle removing the custom keyboard
 */
function replyWithError(userId, err) {

  logger.warn('user: %s message: %s', userId, err.message);

  bot.sendMessage(userId, '*Oh no!* ' + err, {
    'parse_mode': 'Markdown',
    'reply_markup': {
      'hide_keyboard': true
    }
  });
}

/*
 * clear caches
 */
function clearCache(userId) {
  var cacheItems = [
    'movieId', 'movieList', 'movieProfileList',
    'state', 'revokedUserName', 'revokeUserList'
  ];

  _(cacheItems).forEach(function(item) {
    cache.del(item + userId);
  });
}

module.exports = CouchPotatoMessage;
