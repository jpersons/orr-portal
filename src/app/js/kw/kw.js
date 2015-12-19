(function() {
  'use strict';

  angular.module('orrportal.kw', [])
    .controller('KeywordSearchController', KeywordSearchController)
  ;

  KeywordSearchController.$inject = ['$rootScope', '$scope', '$routeParams', '$location', '$http'];

  function KeywordSearchController($rootScope, $scope, $routeParams, $location, $http) {
    if (appUtil.debug) console.log("++KeywordSearchController++");

    $rootScope.vm.curView = 'kw';

    var vm = {};
    vm.kw = $routeParams.kw ? $routeParams.kw.replace(/\s*,\s*/g, ", ") : '';
    $scope.vm = vm;

    doSearch();

    $scope.searchKeyPressed = function($event) {
      if ($event.keyCode == 13) {
        $scope.searchSettingsChanged();
      }
    };

    $scope.searchButtonClicked = function() {
      $scope.searchSettingsChanged();
    };

    $scope.clearSearch = function() {
      vm.kw = '';
      $scope.searchSettingsChanged();
    };

    $scope.searchSettingsChanged = function() {
      var stParam = $routeParams.kw !== undefined ? $routeParams.kw.trim() : '';
      var searchText = vm.kw !== undefined ? vm.kw.trim() : '';
      if (stParam === searchText) {
        doSearch();
      }
      else {
        searchText = searchText.replace(/\s*,\s*/g, ",");
        var url = "/kw/" + searchText;
        $location.url(url);
      }
    };

    function doSearch() {
      vm.error = "";
      vm.results = "";

      if (!vm.kw) {
        return;
      }

      vm.searching = true;
      vm.rows = [];

      var searchString = vm.kw;

      searchString = appUtil.escapeRegex(searchString);
      searchString = searchString.replace(/\\/g, "\\\\"); // for SPARQL still need to escape \ --> \\
      searchString = searchString.replace(/\s*,\s*/, "|");

      // TODO some paging mechanism

      var query = "PREFIX omv: <http://omv.ontoware.org/2005/05/ontology#> " +
        "select distinct ?subject ?name " +
        "where {" +
        " ?subject omv:keywords ?kws." +
        " FILTER regex(str(?kws), \"" +searchString+ "\", \"i\" ). " +
        " ?subject omv:name ?name. " +
        "} " +
        "ORDER BY ?subject";

      if (appUtil.debug) console.log("doSearch: query={" +query+ "}");

      // un-define the Authorization header for the sparqlEndpoint
      var headers = {Authorization: undefined};
      var url = appConfig.orront.sparqlEndpoint;
      var params = {query: query};
      console.log(appUtil.logTs() + ": GET " + url, params);
      $http.get(appConfig.orront.sparqlEndpoint, {params: params, headers: headers})
        .success(function(data, status, headers, config) {
          console.log(appUtil.logTs() + ": got response: status=", status, "data=", data);
          if (status !== 200) {
            gotResults("Error: " +status+ ": " +data);
            return;
          }

          gotResults(null, data);
        })
        .error(function(data, status, headers, config) {
          var reqMsg = config.method + " '" + config.url + "'";
          var error = "[" + appUtil.logTs() + "] ";
          console.log("error in request " +reqMsg+ ":",
            "data=", data, "status=", status,
            "config=", config);
          error += "An error occurred with request: " +
            config.method + " " +config.url+ "\n";
          error += "Response from server:\n";
          error += " data: " + JSON.stringify(data) + "\n";
          error += " status: " + status;
          gotResults(error);
        });
    }

    function gotResults(error, data) {

      vm.searching = false;

      if (error) {
        console.log("error getting query results:", error);
        vm.error = error;
        return;
      }

      var htmlify = true;
      var onlyExternalLink = true;

      vm.colNames = data.names;

      vm.rows = []; // with htmlified or escaped uri's and values
      _.each(data.values, function(row) {
        vm.rows.push(_.map(row, function(value, index) {
          if (index < 1) {
            value = value.replace(/^<|>$/g, '');
          }
          return htmlify
            ? index < 1
              ? appUtil.mklinks4uri(value, true, false)
              : appUtil.htmlifyObject(value, onlyExternalLink)
            : _.escape(value);
        }));
      });
    }
  }

})();