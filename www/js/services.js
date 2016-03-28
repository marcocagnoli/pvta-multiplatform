angular.module('pvta.services', ['ngResource'])

.factory('Avail', function(){
  return 'http://bustracker.pvta.com/infopoint/rest';
})

.factory('Vehicle', function ($resource, Avail) {
    return $resource(Avail + '/vehicles/get/:vehicleId');
})

.factory('Route', function ($resource, Avail) {
    return $resource(Avail + '/routedetails/get/:routeId');
})

.factory('Routes', function ($resource, Avail) {
    return $resource(Avail + '/routes/getvisibleroutes');
})

.factory('NearestStops', function($resource, Avail){
    return $resource(Avail + '/Stops/Nearest?latitude=:latitude&longitude=:longitude', {latitude: "@latitude", longitude: "@longitude"})
})

.factory('Stop', function ($resource, Avail) {
    return $resource(Avail + '/stops/get/:stopId');
})

.factory('Stops', function ($resource, Avail){
    return $resource(Avail + '/stops/getallstops');
})

.factory('RouteVehicles', function ($resource, Avail){
    return $resource(Avail + '/vehicles/getallvehiclesforroute?routeid=:id')
})

.factory('StopDeparture', function ($resource, Avail) {
    return $resource(Avail + '/stopdepartures/get/:stopId');
})

.factory('Messages', function ($resource, Avail) {
  return $resource(Avail + '/publicmessages/getcurrentmessages');
})

.factory('SimpleRoute', function ($resource, Avail){
  return $resource(Avail + '/routes/get/:routeId');
})

.factory('Info', function(){
  return {
    versionNum: '0.5.2',
    versionName: 'Beta 2'
  };
})



.factory('StopList', function(){
  var stopsList = [];

  var pushEntireList = function(list){
    stopsList = stopsList.concat(_.uniq(list, true, 'Name'));
    return stopsList;
  };

  var getEntireList = function(){
    if(stopsList !== undefined){
      return stopsList;
    }
    else return 0;
  };

  var isEmpty = function(){
    if(stopsList.length === 0) return true;
    else return false
  };

  return {
    pushEntireList: pushEntireList,
    getEntireList: getEntireList,
    isEmpty: isEmpty,
  };

})

.factory('RouteList', function(){
  var routesList = [];

  var pushEntireList = function(list){
   // only store the route attributes we need
   routesList = _.map(list, function(route){
     return _.pick(route, 'ShortName', 'LongName', 'Color', 'RouteId');
   });
   // sort routes by their number
   var routeNumber = /\d{1,2}/;
   routesList = _.sortBy(routesList, function(route){
     matches = route.ShortName.match(routeNumber)
     return Number(_.first(matches));
   });
   return routesList;
  };

  var getEntireList = function(){
    if(!isEmpty()) {
      return routesList;
    }
    else return 0;
  }

  var isEmpty = function(){
    if(routesList.length === 0) return true;
    else return false
  };

  return {
    pushEntireList: pushEntireList,
    getEntireList: getEntireList,
    isEmpty: isEmpty,
  };

})

.factory('FavoriteRoutes', function(){
  var routes = [];
  var push = function(route){
    localforage.getItem('favoriteRoutes', function(err, value){
      var newArray = [];
      if(value !== null) {
        newArray = value;
        newArray.push(route);
      }
      else{
        newArray.push(route);
      }
      localforage.setItem('favoriteRoutes', newArray, function(err, value){
      })
    })
  };

  var getAll = function(){
    var ret = [];
    localforage.getItem('favoriteRoutes', function(err, value){

    })
  };

  var remove = function(route){
    localforage.getItem('favoriteRoutes', function(err, routes){
      for(var i = 0; i < routes.length; i++){
        if(routes[i].RouteId === route.RouteId) {
          routes.splice(i, 1);
        }
      }
      localforage.setItem('favoriteRoutes', routes, function(err, newRoutes){
      });
    });
    removeOneRoute(route);
  };

  var removeOneRoute = function(route){
    var name = 'Route ' + route.ShortName + ' favorite';
    localforage.removeItem(name, function(err){
      if(err) console.log(err);
    });
  };

  return{
    push: push,
    getAll: getAll,
    remove: remove
  };
})

.factory('FavoriteStops', function(){
  var stops = [];
  var push = function(stop){
    localforage.getItem('favoriteStops', function(err, value){
      var newArray = [];
      if(value !== null) {
        newArray = value;
        newArray.push(stop);
      }
      else{
        newArray.push(stop);
      }
      localforage.setItem('favoriteStops', newArray, function(err, value){
      });
    });
  };

  var getAll = function(){
    var ret = [];
    localforage.getItem('favoriteStops', function(err, value){
    });
  };

  var remove = function(stop){
    localforage.getItem('favoriteStops', function(err, stops){
      for(var i = 0; i < stops.length; i++){
        if(stops[i].StopId === stop.StopId) {
          stops.splice(i, 1);
        }
      }
      localforage.setItem('favoriteStops', stops, function(err, newStops){
      });
    });

    //Since stops also have their own separate entries,
    // (for toggling the heart on the Stop's page),
    // remove that too.
    removeOneStop(stop);
  };

  var removeOneStop = function(stop){
    var name = 'Stop ' + stop.Name + " favorite";
    localforage.removeItem(name, function(err){
      if(err) console.log(err);
    });
  }

  return{
    push: push,
    getAll: getAll,
    remove: remove
  };
})

.factory('Trips', function(){
    var trips = [];
    var loadedTrip = null;
    var lastPoppedIndex = 0;
    var push = function(index) {
        lastPoppedIndex = index; 
        loadedTrip = trips[index];
    };

    var pop = function() {
        toReturn = loadedTrip;
        loadedTrip = null;
        return toReturn;
    };

    var getAll =  function(callback){
      localforage.getItem('savedTrips', function(err, value){
        if (err) {
              console.log("Error loading trips.");
              callback([]);
              return;
        }
        if (value === null){
                console.log("No trips loaded");
                callback([]);
                return; 
        }
        trips = JSON.parse(value);
        for (var i = 0; i<trips.length; i=i+1) {
            trips[i].time.datetime = new Date(trips[i].time.datetime);
        }
        callback(trips);
      });
    };

    var pop = function() {
         var toReturn = loadedTrip;
         loadedTrip = null;
         return toReturn;
         };

   var push = function(index){
          loadedTrip = trips[index];
          };

   var set = function(trip) {//Sets a new trip object at the index of the last trip popped
        trips[lastPoppedIndex] = trip;
        localforage.setItem('savedTrips', JSON.stringify(trips), function(err, value) {
            if (err !== null) console.log("Error saving trips.");
        });
    };

   var add = function(trip) {
        trips.push(trip);
        localforage.setItem('savedTrips', JSON.stringify(trips), function(err, value) {
            if (err!== null) console.log("Error saving trips.");
        });
    };

   var remove = function(index) {
        trips.splice(index, 1);
        localforage.setItem('savedTrips', JSON.stringify(trips), function(err, value) {
            if (err!== null) console.log("Error saving trips.");
        });
    }; 
    
   return {
    getAll: getAll,
    push: push,
    pop: pop,
    set: set,
    add: add,
    remove: remove
   }; 
})

.factory('KML', function(){
  var kml = [];
  function push(shortName){
    kml.push(shortName);
  };
  function pop(){
    if(kml.length == 1){
      return kml.pop();
    }
    else{
      // Empty the array,
      // because anything else
      // will produce undesired
      // activity in MapController
      kml = [];
      return null;
    }
  }
  return {
    push: push,
    pop: pop
  };
})

.service('LatLong', function(){
  var latlong = [];
  return {
    push: function(lat, long){
      var p = {lat, long};
      latlong.push(p);
    },
    getAll: function(){
      if(latlong.length > 0){
        var toReturn = latlong;
        latlong = [];
        return toReturn;
      }
      else {
        return null;
      }
    }
  };
})


