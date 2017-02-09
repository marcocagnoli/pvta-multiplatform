angular.module('pvta.controllers').controller('RoutesAndStopsController', function ($scope, $ionicFilterBar, $cordovaGeolocation, RouteForage, StopsForage, $ionicLoading, $stateParams, $state, FavoriteStops, FavoriteRoutes, Map, Helper, ionicLoadingConfig) {
  ga('set', 'page', '/routes-and-stops.html');
  ga('send', 'pageview');
  // The two dimensions used in the view to sort the lists.
  var primarySort = '-Liked';
  var secondarySort = 'RouteAbbreviation';
  // Used by orderBy in view to order lists by two
  // dimensions (see them above).
  $scope.propertyName = [primarySort, secondarySort];
  // The current sort order being used onscreen.
  $scope.order = 'favorites';
  // The user can have different orderings based on what's being displayed.
  var stopOrder = 'favorites';
  var routeOrder = 'favorites';
  // Used for determining whether to calculate stop distances.
  var previousPosition;
  // The lists that will eventually be displayed on the UI.
  $scope.routesDisp = [];
  $scope.stopsDisp = [];
  // We can control which list is shown via the page's URL.
  // Pull that param and same it for later.
  $scope.currentDisplay = parseInt($stateParams.segment);
  $scope._ = _;
  // Filter bar's show() function returns a hide function
  // that will be assigned to this variable.
  var hideFilterBarFunction;

  /*
  *  Two redirect functions, which are called
  *  when clicking on the ion-items in the lists.
  *  These are necessary so that we can use
  *  $event.stopPropagation() in the directive
  *  (see directives/route/route-directive.html
  *  or directives/stop/stop-directive.html for
  *  more info about $event.stopPropagation())
  */

  $scope.redirectRoute = Helper.redirectToRoute;

  $scope.redirectStop = Helper.redirectToStop;

  /*
   * Gets all the PVTA routes.
   */
  function getRoutes () {
    // RouteForage returns a promise, resolve it.
    RouteForage.get().then(function (routes) {
      RouteForage.save(routes);
      getFavoriteRoutes(routes);
      redraw();
    });
  }
  /*
   * Gets all the PVTA stops.
   */
  function getStops () {
    return StopsForage.get();
  }
  /*
   * Helper function.
   * Given the list of route objects, this function removes properties
   * that we don't care about and adds whether each route is favorited.
   *
   * IMPORTANT: before this function is called, $scope.favoriteRoutes
   * must already be populated!
   */
  function prepareRoutes (routeList) {
    // For each route, add the custom 'Liked' property and keep only
    // the properties we care about.  Doing this makes searching easier.
    return _.map(routeList, function (route) {
      route.Liked = _.contains(_.pluck($scope.favoriteRoutes, 'RouteId'), route.RouteId);
      return _.pick(route, 'RouteId', 'RouteAbbreviation', 'LongName', 'ShortName', 'Color', 'GoogleDescription', 'Liked');
    });
  }

  /*
   * See prepareRoutes (above).
   */
  function prepareStops (stopList) {
    return _.map(stopList, function (stop) {
      stop.Liked = _.contains(_.pluck($scope.favoriteStops, 'StopId'), stop.StopId);
      return _.pick(stop, 'StopId', 'Name', 'Liked', 'Description', 'Latitude', 'Longitude', 'Distance');
    });
  }
 /*
  * Gets the list of the user's favorite routes and
  * passes control to prepareRoutes.
  */
  function getFavoriteRoutes (routes) {
    localforage.getItem('favoriteRoutes', function (err, value) {
      $scope.favoriteRoutes = value;
      $scope.routes = prepareRoutes(routes);
      redraw();
    });
  }
/*
 * See getFavoriteRoutes (above).
 */
  function getFavoriteStops (stops) {
    localforage.getItem('favoriteStops', function (err, value) {
      $scope.favoriteStops = value;
      $scope.stops = prepareStops(stops);
      redraw();
    });
  }

  /* Decides which list to display.
   * Takes an index (0 or 1) and assigns
   * the appropriate variables.
   */
  $scope.display = function (index) {
    // If we're switching pages and the filter bar is in view,
    // hide it to prevent a scary bug (#288).
    if (hideFilterBarFunction && $scope.currentDisplay !== index) {
      hideFilterBarFunction();
    }
    /* Set the controller-wide
     * variable to indicate
     * which type of data is being displayed.
     * This is useful when searching.
     */
    $scope.currentDisplay = index;
    /* Fill the $scope variable for
     * the proper list and clear out
     * the ones for the other list.
     */
    switch (index) {
      case 0:
        $scope.stopsDisp = null;
        $scope.routesDisp = $scope.routes;
        // toggleOrdering() will sort based on $scope.order,
        // so set it to be the desired route ordering.
        $scope.order = routeOrder;
        break;
      case 1:
        $scope.routesDisp = null;
        $scope.stopsDisp = $scope.stops;
        $scope.order = stopOrder;
        break;
    }
    $scope.toggleOrdering();
  };

  /* When the search button is clicked onscreen,
   * this function is called. The library, in the background,
   * takes care of some things for us, like tracking the input text.
   * The key here is to determine whether we're
   * trying to search stops or routes.
   */
  $scope.showFilterBar = function () {
    var itms;
    // itms is the variable we'll be searching.
    // If routes are displayed, imts is routes.
    // Else, it's stops.
    if ($scope.currentDisplay === 0) {
      itms = $scope.routesDisp;
    }
    else {
      itms = $scope.stops;
    }
    hideFilterBarFunction = $ionicFilterBar.show({
      // tell $ionicFilterBar to search over itms.
      items: itms,
      cancel: function () {
        // Reset the routes and stops lists to be the full lists
        $scope.routesDisp = $scope.routes;
        $scope.stopsDisp = $scope.stops;
        // Now that there's no filter bar, there should be no hide function
        hideFilterBarFunction = undefined;
      },
      // Every time the input changes, update the results.
      update: function (filteredItems) {
        // if routes are currently being displayed, update
        // their list with our results here.
        if ($scope.currentDisplay === 0) {
          $scope.routesDisp = filteredItems;
        }
        else {
          // otherwise, update the stops list.
          $scope.stopsDisp = filteredItems;
        }

      }
    });
  };
   /*
   * Switches between the ways Routes and Stops can be ordered.
   * Takes no params because the <select> is bound to a model - $scope.order.
   */
  $scope.toggleOrdering = function () {
    var routeOrderings = ['favorites', 'name'];
    var stopOrderings = ['favorites', 'distance'];
    // If routes are currently in view
    if ($scope.currentDisplay === 0) {
      // If the current ordering isn't a supported ordering for routes,
      // switch to one that is.
      if (!_.contains(routeOrderings, $scope.order)) {
        $scope.order = routeOrderings[0];
      }
      routeOrder = $scope.order;
      // Based on the user's requested ordering, we need to
      // set the dimensions that orderBy  will use in the view.
      switch ($scope.order) {
        case 'name':
          primarySort = 'RouteAbbreviation';
          break;
        case 'favorites':
          primarySort = '-Liked';
          break;
        default:
          primarySort = '-Liked';
      }
      // Make sure the secondary dimension for ordering is always by name.
      secondarySort = 'RouteAbbreviation';
    }
    // If stops are currently in view
    else if ($scope.currentDisplay === 1) {
    // (See the same comments for routes, just above)
      if (!_.contains(stopOrderings, $scope.order)) {
        $scope.order = stopOrderings[0];
      }
      stopOrder = $scope.order;
      switch ($scope.order) {
        case 'favorites':
          primarySort = '-Liked';
          break;
        case 'distance':
          primarySort = 'Distance';
          break;
        default:
          primarySort = '-Liked';
      }
      // If we have location, secondarily sort by distance. Otherwise, by name.
      if ($scope.noLocation === false) {
        secondarySort = 'Distance';
      }
      else {
        secondarySort = 'Description';
      }
    }
    // Assign the new ordering to the controller-wide filter.
    $scope.propertyName = [primarySort, secondarySort];
  };

  /*
   * Called when a user clicks on the heart button,
   * this function either removes or adds
   * the stop to the user's list of favorites.
   */
  $scope.toggleStopHeart = function (stop) {
    FavoriteStops.contains(stop.StopId, function (bool) {
      if (bool) {
        FavoriteStops.remove(stop);
      }
      else {
        FavoriteStops.push(stop);
      }
      $scope.$apply();
    });
  };

  /*
   * Called when a user clicks on the heart button,
   * this function either removes or adds
   * the route to the user's list of favorites.
   */
  $scope.toggleRouteHeart = function (route) {
    FavoriteRoutes.contains(route, function (bool) {
      if (bool) {
        FavoriteRoutes.remove(route);
      }
      else {
        FavoriteRoutes.push(route);
      }
      $scope.$apply();
    });
  };

  function redraw () {
    $scope.display($scope.currentDisplay);
  }

  function finalPositionCallback (stopsWithDistances, haveCurrentLocation) {
    $scope.stops = stopsWithDistances.stopList;
    previousPosition = stopsWithDistances.previousPosition;
    $scope.noLocation = !haveCurrentLocation;
    haveCurrentLocation ? stopOrder = 'distance' : stopOrder = 'favorites';
    redraw();
  }

  $scope.$on('$ionicView.enter', function () {
    // Load the list of routes - do this every time
    // because we need to update the "heart" for each one.
    $ionicLoading.show(ionicLoadingConfig);
    getRoutes();
    // Get the stops.
    getStops().then(function (stops) {
      $ionicLoading.hide();
      $scope.stops = StopsForage.uniq(stops);
      getFavoriteStops($scope.stops);
      // Grab the current location
      Map.getCurrentPosition().then(function (position) {
        var distances = Map.calculateStopDistances($scope.stops, previousPosition, position);
        finalPositionCallback(distances, true);
      }, function (error) {
        Map.showInsecureOriginLocationPopup(error);
        var distances = Map.calculateStopDistances($scope.stops, previousPosition, position);
        finalPositionCallback(distances, false);
        // No location? Log and report.
        console.error('No location. Code: ' + error.code + '\n' +
          'message: ' + error.message + '\n');
        ga('send', 'event', 'LocationFailure',
          'Map.getCurrentPosition',
          'Location failed in RoutesAndStops; error: ' + error.code + ':, ' + error.message);
      });
    });
  });
});
