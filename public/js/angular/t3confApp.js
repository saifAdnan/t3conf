var SIGNALING_SERVER = "//46.36.223.131:2156/";

var app = angular.module('t3confApp', ['ui.bootstrap', 'ngAnimate', 'ngRoute'], ['$interpolateProvider',
    function($interpolateProvider) {
        $interpolateProvider.startSymbol('{%');
        $interpolateProvider.endSymbol('%}');
    }
]);

function getValues(hash) {
    var values = [];
    for (var key in hash) {
        if (hash.hasOwnProperty(key)) {
            var ar = {
                name: key,
                sip: hash[key].sip,
                users: hash[key].users
            };
            values.push(ar);
        }
    }
    return values;
}

/**
 * Path to angular directory
 * @type {string}
 */
var PATH = "/public/js/angular/";

//Global variables
app.run(['$rootScope', '$http',
    function($rootScope, $http) {
        $rootScope.username = USERNAME;
        $rootScope.enableChat = true;

        $http.get("/rooms").success(function(data) {
            $rootScope.rooms = data;
        });
    }
]);

app.config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
        $routeProvider
            .when('/', {
                templateUrl: '/views/home.html',
                controller: 'mainController',
                animation: 'slide'
            })
            .when('/conference/:name', {
                templateUrl: '/views/room.html',
                controller: 'conferenceController',
                animation: 'slide'
            });

        $locationProvider
            .html5Mode(false)
            .hashPrefix('!');
    }
]);
