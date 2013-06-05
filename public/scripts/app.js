'use strict';

// construct app and default routes
var app = angular.module("ChatApp", []).config(function ($routeProvider) {
    $routeProvider.when('/',
					    {
					        templateUrl: 'public/templates/index.html'
					    })
				  .when('/chatrooms/:id',
						{
						    templateUrl: 'public/templates/chatroom.html'
						})
				  .when('/chatrooms',
					  {
					      templateUrl: 'public/templates/chatrooms.html'
					  })
				  .when('/login',
						{
						    templateUrl: 'public/templates/login.html'
						}).
				   otherwise({ redirectTo: '/' });
});

/* causes infinite redirection loop in ChatroomController, so we use /# urls instead
app.config(['$locationProvider', function($location) {
	$location.html5Mode(true);
}]);
*/