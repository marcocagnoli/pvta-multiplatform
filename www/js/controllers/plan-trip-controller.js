angular.module('pvta.controllers').controller('PlanTripController', function($scope, $location, $cordovaGeolocation, $cordovaDatePicker, $ionicPopup, $ionicScrollDelegate, Trips){

        $scope.$on('$ionicView.enter', function(e) {
                defaultMapCenter = new google.maps.LatLng(42.3918143, -72.5291417);//Coords for UMass Campus Center
                reload();
        });
        var reload = function() {
                currentDate = new Date();
                var loadedTrip = Trips.pop();//Trip.get();
                if (loadedTrip !== null) {
                        $scope.loaded = true; 
                        $scope.params = loadedTrip;
                }
                else {
                        $scope.loaded = false;
                        $scope.params = {
                                name: 'New Trip',
time: {
        datetime: currentDate,
type: "departure",
asap: true
},
        origin: {},
        destination: {}
        }
}
var options = {timeout: 5000, enableHighAccuracy: true};
$scope.map = null;

var swBound = new google.maps.LatLng(41.93335, -72.85809);
var neBound = new google.maps.LatLng(42.51138, -72.20302);

$scope.bounds = new google.maps.LatLngBounds(swBound, neBound); 


$cordovaGeolocation.getCurrentPosition(options).then(function(position){ 

        var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        constructMap(latLng);
}, function(error) {
        console.log("Error reading current position");
        constructMap(defaultMapCenter);
});
}



function constructMap(latLng) {
        var mapOptions = {
                center: latLng,
                zoom: 15,
                mapTypeControl: false,
                mapTypeId: google.maps.MapTypeId.ROADMAP
        }

        $scope.map = new google.maps.Map(document.getElementById("directions-map"), mapOptions);


        $scope.directionsService = new google.maps.DirectionsService;
        $scope.directionsDisplay = new google.maps.DirectionsRenderer;

        $scope.directionsDisplay.setMap($scope.map);

        var origin_input = document.getElementById("origin-input");
        var destination_input = document.getElementById("destination-input");

        var origin_autocomplete = new google.maps.places.Autocomplete(origin_input);
        var destination_autocomplete = new google.maps.places.Autocomplete(destination_input);
        origin_autocomplete.setBounds($scope.bounds);
        destination_autocomplete.setBounds($scope.bounds);

        origin_autocomplete.addListener('place_changed', function() {
                var place = origin_autocomplete.getPlace();
                if (!place.geometry) {
                        console.log("Place has no geometry.");
                        return;
                }
                if ($scope.bounds.contains(place.geometry.location)){
                        expandViewportToFitPlace($scope.map, place);
                        $scope.params.origin.id = place.place_id;
                        $scope.params.origin.name = place.name;
                        $scope.$apply();
                } else {
                        $scope.params.origin.id = null;
                        origin_input.value = $scope.params.origin.name;
                        invalidLocationPopup();
                }
        });

        destination_autocomplete.addListener('place_changed', function() {
                var place = destination_autocomplete.getPlace();
                if (!place.geometry) {
                        console.log("Place has no geometry.");
                        return;
                }
                if ($scope.bounds.contains(place.geometry.location)) {
                        expandViewportToFitPlace($scope.map, place);
                        $scope.params.destination.id = place.place_id;
                        $scope.params.destination.name = place.name;
                        $scope.$apply();
                }
                else {
                        $scope.params.destination.id = null;
                        destination_input.value = $scope.params.destination.name;
                        invalidLocationPopup();
                }
        });
}


function expandViewportToFitPlace(map, place) {
        if (place.geometry.viewpoint) {
                map.fitBounds(place.geometry.viewpoint);
        } else {
                map.setCenter(place.geometry.location);
                map.setZoom(17);
        }
}


$scope.route = function() {
        $scope.route.steps = [];
        $scope.route.step_links = [];
        $scope.route.arrival_time = null;
        $scope.route.departure_time = null;
        $scope.route.origin = null;
        $scope.route.destination= null;

        if (!$scope.params.origin.id || !$scope.params.destination.id)
                return;
        transitOptions = {
                modes: [google.maps.TransitMode.BUS]
        };
        if ($scope.params.time.type === "departure")
                transitOptions['departureTime'] = $scope.params.time.datetime;
        else
                transitOptions['arrivalTime'] = $scope.params.time.datetime;

        $scope.directionsService.route({
                origin: {"placeId": $scope.params.origin.id},
                destination: {"placeId": $scope.params.destination.id},
                travelMode: google.maps.TravelMode.TRANSIT,
                transitOptions: transitOptions
        }, function(response, status){
                if (status === google.maps.DirectionsStatus.OK){
                        $scope.directionsDisplay.setDirections(response);
                        route = response.routes[0].legs[0];
                        createStepList(response);
                        $scope.route.arrival_time = route['arrival_time']['text'];
                        $scope.route.departure_time = route['departure_time']['text'];
                        $scope.route.origin = route['start_address'];
                        $scope.route.destination = route['end_address'];
                        $scope.$apply();
                        $scope.scrollTo('route');
                }
                else
                $ionicPopup.alert({
                        title: "Request Failed",
                        template: "Directions request failed due to " + status
                });

        });
}

function createStepList(response) {
        for (var i=0; i<response.routes[0].legs[0].steps.length; i++) {
                var step = response.routes[0].legs[0].steps[i];

                if (step['travel_mode'] === 'TRANSIT') {
                        var line_name;
                        if (step['transit']['line']['short_name'])
                                line_name = step['transit']['line']['short_name'];
                        else
                                line_name = step['transit']['line']['name'];
                        var depart_instruction = "Take "+step['transit']['line']['vehicle']['name']+" "+line_name+ " at " + step['transit']['departure_time']['text'] + ". " + step['instructions'];
                        var arrive_instruction = "Arrive at "+step['transit']['arrival_stop']['name'] + " " + step['transit']['arrival_time']['text'];
                        $scope.route.steps.push(depart_instruction);
                        $scope.route.steps.push(arrive_instruction);
                        if (step['transit']['line']['agencies'][0]['name'] === 'PVTA') {
                                linkToStop(step['transit']['departure_stop']['name']);
                                linkToStop(step['transit']['arrival_stop']['name']);
                        }
                        else {
                                $scope.route.step_links.concat(['','']);
                        }


                }
                else {
                        $scope.route.steps.push(step['instructions']); 
                        $scope.route.step_links.push('');
                }
        }
}

function linkToStop(stop) {
        stop = stop.split(" ");
        stop = stop[stop.length-1];
        stop = stop.substring(1, stop.length-1);
        $scope.route.step_links.push('#/app/stops/' + stop);

}

var invalidLocationPopup = function() {
        $ionicPopup.alert({
                title: 'Invalid Location',
        template: 'PVTA does not service this location.'
        });
}

$scope.saveTrip = function() {
        var prevName = $scope.params.name;
        $ionicPopup.show({
                template: '<input type="text" ng-model="params.name">',
                title: 'Trip Name',
                subTitle: 'Give this trip a name.',
                scope: $scope,
                buttons: [
        {text: 'Cancel',
                onTap: function(e){
                               $scope.params.name = prevName;
                       }},
                {text: '<b>OK</b>',
                        type: 'button-positive',
                onTap: function(e){
                        if ($scope.loaded)
                Trips.set($scope.params);
                        else  
                Trips.add($scope.params);
        saveSuccessful();}
                }]
        });
};

var saveSuccessful = function() {$ionicPopup.alert({
        title: 'Save Successful!',
    template: 'This trip can be accessed from My Buses.'
});
};

$scope.scrollTo = function(anchor) {
        $location.hash(anchor);
        $ionicScrollDelegate.anchorScroll(true);
};

$scope.newTrip = function() {
        $ionicPopup.confirm({
                title: "New Trip",
                template: "<div style='text-align:center'>Close current trip?</div>"
        }).then(function(res){
                if (res) {
                        $scope.loaded = false;
                        reload();
                }
        });
};

})
