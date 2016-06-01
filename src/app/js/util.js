var appUtil = (function(window) {
  'use strict';

  var windowHref = getWindowHref();
  var windowBareHref = getBareWindowHref();

  expandOrrOntRest();

  var uri, debug;

  (function() {
    var windowLocationSearch = parseWindowLocationSearch();
    uri = windowLocationSearch.uri || uriFromWindowLocation();
    debug = windowLocationSearch.debug !== undefined
      ? { level: "dummy" }
      : undefined;
  })();

  /*
   * TODO the whole htmlfying/text-processing/filtering in this module needs revision/simplification
   */

  var uriRegex = /\b(https?:\/\/[0-9A-Za-z-\.\/&@:%_\+~#=\?\(\)]+\b)/g;
  // http://stackoverflow.com/q/7885096/830737
  // we could use JSON.parse instead of this regex based conversion
  var escapedUnicodeRegex = /\\u([\d\w]{4})/gi;

  setPolyfills();


  return {
    uri:            uri,
    debug:          debug,

    windowBareHref: windowBareHref,

    getHref4uriWithSelfHostPrefix: getHref4uriWithSelfHostPrefix,
    mklink4uriWithSelfHostPrefix:  mklink4uriWithSelfHostPrefix,
    mklink4uriAlwaysUriParameter:  mklink4uriAlwaysUriParameter,

    mklinks4text:   mklinks4text,

    mklinks4uri:    mklinks4uri,

    htmlifyUri:     htmlifyUri,
    htmlifyObject:  htmlifyObject,

    cleanTripleObject:  cleanTripleObject,

    //getHmac:        getHmac,
    //getHmacParam:   getHmacParam,

    escapeRegex:    escapeRegex,

    filterKeys:     filterKeys,

    updateModelArray: updateModelArray,

    logTs: function() { return moment().local().format(); }
  };

  function getHref4uriWithSelfHostPrefix(uri) {
    uri = uri.replace(escapedUnicodeRegex, unescapeEscapedUnicode);
    if (uri.startsWith(windowHref)) {
      // it's self-resolvable:
      return uri;
    }
    else {
      // use "uri" parameter to windowHref:
      var url4link = uri.replace(/#/g, "%23");
      // question mark or ampersand?
      var qa = windowHref.indexOf('?') >= 0 ? '&' : '?';
      return windowHref + qa + "uri=" + url4link;
    }
  }

  function mklink4uriWithSelfHostPrefix(uri) {
    var href = getHref4uriWithSelfHostPrefix(uri);
    return '<a class="uriLink" href="' + href + '">' + uri + '</a>';
  }

  function mklink4uriAlwaysUriParameter(uri) {
    uri = uri.replace(escapedUnicodeRegex, unescapeEscapedUnicode);
    var url4link = uri.replace(/#/g, "%23");
    var href = "?uri=" + url4link;
    return '<a class="uriLink" href="' + href + '">' + uri + '</a>';
  }

  function htmlifyUri(uri) {
    return mklinks4uri(uri, true);
  }

  function htmlifyObject(value, onlyExternalLink) {
    if (/^<([^>]*)>$/.test(value)) {
      // it is an uri.
      value = mklinks4uri(value, true, onlyExternalLink);
    }
    else {
      // \"Age of sea ice\" means...  -->  "Age of sea ice" means...
      value = value.replace(/\\"/g, '"');

      value = value.replace(/^"(.*)"$/, '$1');
      // string with language tag?
      var m = value.match(/^("[^"]+")(@[A-Za-z\-]+)$/);
      if (m) {
        // http://stackoverflow.com/questions/7885096/how-do-i-decode-a-string-with-escaped-unicode
        var parsed = JSON.parse(m[1]);
        value = '"' + parsed + '"' + m[2];

        // TODO review the use of decodeURIComponent below because parsed could
        // be a long string, not just a URI component.
        //try {
        //  value = '"' + decodeURIComponent(parsed) + '"' + m[2];
        //}
        //catch(ex) {
        //  console.error(ex, "parsed=", parsed, "m[2]=", m[2]);
        //}
      }
      else {
        value = mklinks4text(value, onlyExternalLink);
        value = value.replace(escapedUnicodeRegex, unescapeEscapedUnicode);
      }
    }
    return value
  }

  /*
   * based on htmlifyObject this is to remove/adjust the extra/special characters included
   * in SPARQL responses.
   */
  function cleanTripleObject(value) {
    // uri?
    var m = value.match(/^<([^>]*)>$/);
    if (m) {
      return m[1];
    }

    // \"Age of sea ice\" means...  -->  "Age of sea ice" means...
    value = value.replace(/\\"/g, '"');

    value = value.replace(/^"(.*)"$/, '$1');
    // string with language tag?
    m = value.match(/^("[^"]+")(@[A-Za-z\-]+)$/);
    if (m) {
      // http://stackoverflow.com/questions/7885096/how-do-i-decode-a-string-with-escaped-unicode
      var parsed = JSON.parse(m[1]);
      value = '"' + parsed + '"' + m[2];
    }

    return value
  }

  // newline -> <br/>
  function n2br(str) {
    str = str.replace(/\\n/g, "\n");
    str = str.replace(/\n/g, "<br />\n");
    return str;
  }

  // newline -> <p>..</p>
  function n2p(str) {
    str = str.replace(/\\n/g, "\n");
    var parts = str.split(/\n/);
    if (parts.length > 1) {
      parts = _.map(parts, function(p) { return "<p>" + p + "</p>"; });
      str = parts.join("");
    }
    return str;
  }

  function mklinks4uri(uri, possibleBrackets, onlyExternalLink) {
    //console.log("mklinks4uri: onlyExternalLink=" + onlyExternalLink + " uri=" + uri);
    //console.log("1 URI[" + uri+ "]");
    uri = uri.replace(escapedUnicodeRegex, unescapeEscapedUnicode);
    var pre = "";
    var post = "";
    if (possibleBrackets !== undefined && possibleBrackets) {
      var m = uri.match(/^(<)?([^>]*)(>)?$/);
      pre  = _.escape(m[1]);
      uri  = m[2];
      post = _.escape(m[3]);
    }
    var url4link = uri.replace(/#/g, "%23");

    var icon = '<span class="fa fa-external-link xsmall"></span>';
    var link;
    if (onlyExternalLink) {
      //link = '<a target="_blank" href="' + uri + '">' + icon + uri + '</a>';
      link = '<a class="uriLink" target="_blank" href="' + uri + '">' + uri + '</a>';
    }
    else {
      link = '<a class="uriLink" href="#/uri/' + url4link + '">' + uri + '</a> '
        + '<a target="_blank" title="open directly in a new browser window" href="'
        + uri + '">' +icon+ '</a>'
      ;
    }

    //console.log("mklinks4uri:" +pre + "|" + link + "|" +post);
    return pre + link + post;
  }

  function mklinks4uriNoBrackets(uri) {
    return mklinks4uri(uri);
  }

  function mklinks4uriNoBracketsOnlyExternalLink(uri) {
    return mklinks4uri(uri, false, true);
  }

  function mklinks4text(str, onlyExternalLink) {
    //console.log("mklinks4text: onlyExternalLink=" + onlyExternalLink + " str=" + str);
    // first, escape original text
    str = _.escape(str);
    // but restore any '&' for the links processing below:
    str = str.replace(/&amp;/g, "&");
    str = str.replace(/&gt;/g, ">");
    // then, add our re-formatting
    str = n2p(str);
    str = str.replace(uriRegex, onlyExternalLink ? mklinks4uriNoBracketsOnlyExternalLink : mklinks4uriNoBrackets);
    return str;
  }

  function unescapeEscapedUnicode(escaped, val) {
    return String.fromCharCode(parseInt(val, 16));
  }

  //function getHmac(str) {
  //    var shaObj = new jsSHA(str, "TEXT");
  //    return shaObj.getHMAC(appConfig.orront.secret, "TEXT", "SHA-1", "B64");
  //}
  //
  //function getHmacParam(str) {
  //    return appConfig.orront.sigParamName + "=" + encodeURIComponent(getHmac(str));
  //}

  function setPolyfills() {
    /*
     * from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String
     */

    if (!String.prototype.startsWith) {
      Object.defineProperty(String.prototype, 'startsWith', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function(searchString, position) {
          position = position || 0;
          return this.lastIndexOf(searchString, position) === position;
        }
      });
    }

    if (!String.prototype.endsWith) {
      Object.defineProperty(String.prototype, 'endsWith', {
        value: function(searchString, position) {
          var subjectString = this.toString();
          if (position === undefined || position > subjectString.length) {
            position = subjectString.length;
          }
          position -= searchString.length;
          var lastIndex = subjectString.indexOf(searchString, position);
          return lastIndex !== -1 && lastIndex === position;
        }
      });
    }
  }

  // http://stackoverflow.com/a/3561711/830737
  function escapeRegex(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  }

  function parseWindowLocationSearch() {
    var locSearch = window.location.search.substring(1);
    var params = {};
    if ( locSearch && locSearch.trim().length > 0 ) {
      // skip ? and get &-separated chunks:
      var chunks = locSearch.split("&");
      _.each(chunks, function(chunk) {
        var toks = _.map(chunk.split("="), decodeURIComponent);
        if ( toks.length > 0 ) {
          var key = toks[0].trim();
          if (key) {
            params[key] = toks.length === 2 ? toks[1].trim() : '';
          }
        }
      });
    }
    if (params.debug !== undefined) console.log("parseWindowLocationSearch: params=", params);
    return params;
  }

  function expandOrrOntRest() {
    var original = appConfig.orront.rest;
    if (original.startsWith("/")) {
      var loc = window.location;
      appConfig.orront.rest = loc.protocol + "//" + loc.host + original;
      console.debug("orront.rest expanded to=" + appConfig.orront.rest);
    }
  }

  /**
   * Returns window.location.href without trailing hash part (but possibly with search part)
   */
  function getWindowHref() {
    var result = window.location.href;
    console.debug("window.location.href=", window.location.href);
    if (result.endsWith(window.location.hash)) {
      result = result.substring(0, result.length - window.location.hash.length);
    }
    console.debug("getWindowHref=", result);
    return result;
  }

  /**
   * Returns window.location.href without anything starting with search part (if any)
   * and no trailing slash.
   * If no search part, returns the same as getWindowHref but without trailing slash.
   * This was mainly introduced to facilitate local development.
   */
  function getBareWindowHref() {
    var result = window.location.href;
    var search = window.location.search;
    if (search) {
      result = result.substring(0, result.indexOf(search));
    }
    else {
      result = getWindowHref()
    }
    result = result.replace(/\/+$/, '');
    console.debug("getBareWindowHref=", result);
    return result;
  }

  /**
   * Returns windowHref if it has appConfig.orront.rest as a proper prefix (modulo trailing slash).
   * The returned string can be interpreted as a particular URI request as opposed
   * to a request to the main ontology list page. Otherwise, returns undefined.
   */
  function uriFromWindowLocation() {
    var orrOntRest = appConfig.orront.rest;
    console.debug("orrOntRest=[" +orrOntRest+ "] windowHref=[" +windowHref+ "]");
    if (windowHref.startsWith(orrOntRest) && windowHref.length > orrOntRest.length && orrOntRest+"/" !== windowHref) {
      console.log("orrOntRest=[" +orrOntRest+ "] is proper prefix of windowHref=[" +windowHref+ "]");
      return windowHref;
    }
  }

  /**
   * Returns a copy of the given element except that any traversed
   * dictionary will only have the keys passing the given predicate `goodKey`.
   */
  function filterKeys(obj, goodKey) {
    return doIt(obj);

    function doIt(obj) {
      if (_.isPlainObject(obj)) {
        var res = {};
        _.each(obj, function(val, key) {
          if (goodKey(key)) {
            res[key] = doIt(val);
          }
        });
        return res;
      }
      else if (_.isArray(obj)) {
        return _.map(obj, doIt);
      }
      else return obj;
    }
  }

  /**
   * Helps perform updates to a view-model array with potential better UI responsiveness
   * and/or visual feedback.
   *
   * @param targetArray    Destination array.
   * @param sourceArray    Source array. It's assumed this array doesn't change during the transfer.
   * @param stepFn         stepFn(done) called at every chunk update, with
   *                       done indicating whether the update has been completed.
   *                       If not complete, this function should return true to stop the transfer.
   * @param doPush         Elements are pushed to the target array unless this parameter is defined and falsy
   * @param chunkSize      the larger this value the less responsive the ui.
   */
  function updateModelArray(targetArray, sourceArray, stepFn, chunkSize, doPush) {
    chunkSize = chunkSize || 5;
    doPush = doPush === undefined ? true : doPush;
    var jj = 0, len = sourceArray.length;
    setTimeout(function () {
      function processNext() {
        for (var kk = 0; jj < len && kk < chunkSize; kk++, jj++) {
          if (doPush)
            targetArray.push(sourceArray[jj]);
          else
            targetArray.unshift(sourceArray[jj]);
        }

        var done = jj >= len;
        var stop = stepFn(done);

        if (!done && !stop) {
          setTimeout(processNext, 0);
        }
      }
      processNext();
    }, 0);
  }

})(window);
