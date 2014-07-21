app.directive("navSuper", function () {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: PATH + 'templates/nav.html',
        link: function (scope, element, attr) {
            scope.sip = SIP;
            scope.password = PASSWORD;
        }
    };
});