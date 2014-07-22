var SIGNALING_SERVER = "//trafficdestination.net:2156/";

var app = angular.module('t3confApp', ['ui.bootstrap', 'ngRoute'], ['$interpolateProvider',
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
                sip_name: hash[key].sip_name,
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
var PATH = "/js/angular/";

//Global variables
app.run(['$rootScope', '$http',
    function($rootScope, $http) {
        $rootScope.username = USERNAME;
        $rootScope.role = ROLE;
        $rootScope.moderator = MODERATOR;
        $rootScope.inConference = false;

        $rootScope.enableChat = true;
        $rootScope.inCall = false;

        var browser = navigator.userAgent;

        if (browser.match(/Chrome/) || browser.match(/Firefox/)) {
            $rootScope.supported = true;
            if (browser.match(/Chrome/)) $rootScope.nav = 'chrome';
            if (browser.match(/Firefox/)) $rootScope.nav = 'firefox';
        } else {
            $rootScope.supported = true;
            /*$("#not_supported").modal({
                backdrop: 'static',
                keyboard: false
            });*/
        }

        $http.get("/conferences").success(function(data) {
            $rootScope.rooms = data;
        });
    }
]);

app.config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
        $routeProvider
            .when('/', {
                templateUrl: '/views/home.html',
                controller: 'mainController'
            })
            .when('/conference/:name', {
                templateUrl: '/views/room.html',
                controller: 'conferenceController'
            })
            .when('/dashboard/users', {
                templateUrl: '/views/users.html',
                controller: 'dashboardController'
            })
            .when('/dashboard/records', {
                templateUrl: '/views/records.html',
                controller: 'dashboardController'
            });

        $locationProvider
            .html5Mode(false)
            .hashPrefix('!');
    }
]);
