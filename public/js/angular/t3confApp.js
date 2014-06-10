var current_username = USERNAME;
var SIGNALING_SERVER = "https://trafficdestination.net:1088/";

var app = angular.module('t3confApp', ['ui.bootstrap', 'ngAnimate', 'ngRoute'], ['$interpolateProvider', function($interpolateProvider) {
    $interpolateProvider.startSymbol('{%');
    $interpolateProvider.endSymbol('%}');
}]);

/**
 * Path to angular directory
 * @type {string}
 */
var PATH = "/public/js/angular/";

//Global variables
app.run(['$rootScope', '$http', function ($rootScope, $http) {
    $rootScope.username = USERNAME;

    $http.get("/rooms").success(function(data) {
        $rootScope.rooms = data;
    });
}]);

app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider
        .when('/', {
            templateUrl: '/views/home.html',
            controller: 'mainController'
        })
        .when('/room/:name', {
            templateUrl: '/views/room.html',
            controller: 'createController'
        })
        .when('/room/join/:name', {
            templateUrl: '/views/room.html',
            controller: 'joinController'
        });

    $locationProvider
        .html5Mode(false)
        .hashPrefix('!');
}]);