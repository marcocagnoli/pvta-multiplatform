import { Component, ChangeDetectorRef } from '@angular/core';

import { NavController, NavParams, LoadingController } from 'ionic-angular';

import { StopDeparture } from '../../models/stop-departure.model';
import { StopDepartureService } from '../../providers/stop-departure.service';
import { FavoriteStopService } from '../../providers/favorite-stop.service';
import { RouteComponent } from '../route/route.component';
import { RouteService } from '../../providers/route.service';
import { Route } from '../../models/route.model';
import * as _ from 'lodash';
import * as moment from 'moment';

@Component({
  selector: 'page-stop',
  templateUrl: 'stop.html'
})
export class StopComponent {
  directions: StopDeparture[];
  shownRoute: any = null;
  stopId: number;
  departuresByDirection: Array<any> = [];
  routeList = [];
  loader;
  order: String;
  constructor(public navCtrl: NavController, private navParams: NavParams,
    private stopDepartureService: StopDepartureService,
    private routeService: RouteService, private changer: ChangeDetectorRef,
    private loadingCtrl: LoadingController, private favoriteStopService: FavoriteStopService) {
      this.stopId = navParams.get('stopId');
      this.order = '0';
      this.loader = loadingCtrl.create({
        content: 'Downloading departures...'
      });
    }
    ionViewWillEnter() {
      this.loader.present();
      this.stopDepartureService
        .getStopDeparture(this.stopId)
        .then(directions => {
          this.sort(directions[0]);
          this.getRoutes(_.uniq(_.map(directions[0].RouteDirections, 'RouteId')));
          this.loader.dismiss();
        });
    }

  // For a given RouteId, downloads the simplest
  // version of the details for that route from
  // Avail.  Adds it to a $scope-wide list.
  // Returns nothing.
  getRoute (id): any {
    this.routeService
      .getRoute(id)
      .then(route => {
        this.routeList[id] = (route);
      });
  }
  // Calls getRoute() for each RouteId in
  // the input array.
  // Ex input: [20030, 30031, 20035]
  getRoutes (routes): any {
    for (let routeId of routes) {
      this.getRoute(routeId);
    }

    //$ionicLoading.hide();
  };
  toggleStopHeart(stop): void {
    // console.log('toggling', stop.Description);
    this.favoriteStopService.toggleFavorite(stop);
  }
  /**
   * Given a Departure object,
   * calculates the human-readable departure times
   * that will be displayed in the UI.
   * Returns an object with 5 properties,
   * each a different way of displaying
   * either a scheduled time ('s') or an estimated time ('e').
   */
  calculateTimes (departure): Object {
    return {
      // ex: '8:12 PM'
      sExact: moment(departure.SDT).format('LT'),
      eExact: moment(departure.EDT).format('LT'),
      // ex: 'in 6 minutes'
      sRelative: moment(departure.SDT).fromNow(),
      eRelative: moment(departure.EDT).fromNow(),
      // ex: '6 minutes'
      eRelativeNoPrefix: moment(departure.EDT).fromNow(true)
    };
  }
  /**
  * Given all the RouteDirections and their upcoming departures
  * at this stop, this function organizes and manipulates
  * all departures so they can be clearly and simply displayed in the UI.
  * It sorts departures in two ways:
  *   1) By Route Direction
  *   2) By Time
  */
  departuresByTime = [];
  sort (directions): any {
    this.departuresByTime = [];
    // Avail returns an array of RouteDirections. We must deal
    // with the Departures for each Direction.
    for (let direction of directions.RouteDirections) {
      if (direction.Departures && direction.Departures.length != 0 && !direction.IsDone) {
        // Sorting Departures by Direction requires us to
        // maintain a tmp array of valid departures for a
        // given direction.
        var futureDepartures = [];
        // For each Departure for a given RouteDirection...
        for (let departure of direction.Departures) {

          // A departure is invalid if it was in the past
          if (!moment(departure.EDT).isAfter(Date.now())) {
            continue;
          }
          /* Manipuate the departure object.
           * When sorting by Direction, we only need to
           * obtain the stringified departure times
           * and save the departure to futureDepartures.
           * When sorting by Time, pull out only the
           * necessary details from the Departures
           * and hold onto them.
           */
          else {
            // Departures by time: we can use a stripped down
            // version of the RouteDirection, because each
            // departure will be its own entry in the list.
            let lightweightDirection = {
              RouteId: direction.RouteId,
              Times: {},
              Departures: []
            };
            var times = this.calculateTimes(departure);
            departure.Times = times;
            lightweightDirection.Times = times;
            // Departures by time: marry this departure with its RouteId;
            // that's all it needs.
            lightweightDirection.Departures = departure;
            // Departures by RouteDirection: this is a valid departure,
            // so add it to the array.
            futureDepartures.push(departure);
            this.departuresByTime.push(lightweightDirection);
          }
        }
        /* Departures by RouteDirection: now that we
         * have all the valid departures for a given direction,
         * overwrite the RouteDirection's old departures array.
         */
        direction.Departures = futureDepartures;
        if (direction.Departures.length > 0) {
          this.departuresByDirection.push(direction);
        }
      }
    }
    // Departures by time: Sort the list of all
    // departures by Estimated Departure Time.
    this.departuresByTime = _.sortBy(this.departuresByTime, function (direction) {
      return direction.Departures.EDT;
    });
  }


    // **Sets** whether a route's
    // departures have been expanded on the page
    toggleRouteDropdown (routeDirection): void {
     if (this.isRouteDropdownShown(routeDirection)) {
       this.shownRoute = null;
     } else {
       this.shownRoute = routeDirection.RouteId + routeDirection.DirectionCode;
     }
   };

   // **Checks** whether a route's departures
 // have been expanded on the page
  isRouteDropdownShown (routeDirection): any  {
   return this.shownRoute === (routeDirection.RouteId + routeDirection.DirectionCode);
 };

 goToRoutePage(routeId: number): void {
   this.navCtrl.push(RouteComponent, {
     routeId: routeId
   });
 }
}