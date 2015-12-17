(function() {
  'use strict';

  angular.module('orrportal.st', [])
    .controller('SearchTermsController', SearchTermsController)
  ;

  SearchTermsController.$inject = ['$rootScope', '$scope', '$routeParams', '$location', '$http'];

  function SearchTermsController($rootScope, $scope, $routeParams, $location, $http) {
    if (appUtil.debug) console.log("++SearchTermsController++");

    $rootScope.vm.curView = 'st';

    var vm = {st: $routeParams.st};
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
      vm.st = '';
      $scope.searchSettingsChanged();
    };

    $scope.searchSettingsChanged = function() {
      var stParam = $routeParams.st !== undefined ? $routeParams.st.trim() : '';
      var searchText = vm.st !== undefined ? vm.st.trim() : '';
      if (stParam === searchText) {
        doSearch();
      }
      else {
        var url = "/st/" + searchText;
        $location.url(url);
      }
    };

    function doSearch() {
      vm.error = "";
      vm.results = "";

      if (!vm.st) {
        return;
      }

      vm.searching = true;
      vm.rows = [];

      var keywords = vm.st.replace(/\s+(o|O)(r|R)\s+/, "|");
      if (appUtil.debug) console.log("doSearch: keywords=", keywords);

      // TODO some paging mechanism

      var query = "SELECT DISTINCT ?subject ?predicate ?object " +
        "WHERE { ?subject ?predicate ?object. " +
        "FILTER regex(?object, \"" +keywords+ "\", \"i\" ) } " +
        "ORDER BY ?subject";

      // un-define the Authorization header for the sparqlEndpoint
      var headers = {Authorization: undefined};
      var url = appConfig.orront.sparqlEndpoint;
      var params = {query: query};
      console.log(appUtil.logTs() + ": GET " + url, params);
      $http.get(appConfig.orront.sparqlEndpoint, {params: params, headers: headers})
        .success(function(data, status, headers, config) {
          console.log(appUtil.logTs() + ": got results: ", data);
          if (data.error) {
            gotResults(data.error);
            return;
          }

          gotResults(null, data);
        })
        //.error(httpErrorHandler(gotResults));
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
          if (index < 2) {
            value = value.replace(/^<|>$/g, '');
          }
          return htmlify
            ? index < 2
              ? appUtil.mklinks4uri(value, true, true)
              : appUtil.htmlifyObject(value, onlyExternalLink)
            : _.escape(value);
        }));
      });
    }
  }

})();
