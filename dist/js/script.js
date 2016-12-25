function initSnow(){
	snowStorm.targetElement = 'snowElement';
	snowStorm.followMouse = false;
	snowStorm.snowStick = false;
	snowStorm.followMouse = false;
	snowStorm.freezeOnBlur = true;
	snowStorm.flakesMaxActive = 500;
	snowStorm.animationInterval = 50;
}
function stopSnow() {
	snowStorm.stop();
	snowStorm.freeze();
}
var season;
var dayornight;



$('#winter').click(function () {
	snowStorm.resume();
	if (dayornight == 'day') {
		$('html').css('background-color', '#a8c4Fe');
	}
	else{
		$('html').css('background-color', '#011132');
	}
	season = 'winter';
});

$('#summer').click(function () {
	stopSnow();
	if (dayornight == 'day'){
		$('html').css('background-color', '#FFC300');
	}
	else{
		$('html').css('background-color', '#664e00');
	}
	season = 'summer';
});
$('#autumn').click(function () {
	stopSnow();
	if (dayornight == 'day'){
		$('html').css('background-color', '#F39C12');
	}
	else{
		$('html').css('background-color', '#794d06');
	}
	season = 'autumn';
});
$('#spring').click(function () {
	stopSnow();
	if (dayornight == 'day'){
		$('html').css('background-color', '#58D68D');
	}
	else{
		$('html').css('background-color', '#14522e');
	}
	season = 'spring';
});
$('#night').click(function () {
	dayornight = 'night';
	$('.text').css('color', 'white');
	$('#about').removeClass('waves-effect waves-light btn blue darken-4').addClass('waves-effect waves-light btn blue lighten-1');
	$('#projects').removeClass('waves-effect waves-light btn indigo darken-4').addClass('waves-effect waves-light btn indigo lighten-1');
	$('#contact').removeClass('waves-effect waves-light btn deep-purple darken-4').addClass('waves-effect waves-light btn deep-purple lighten-1');
	$('#cv').removeClass('waves-effect waves-light btn teal darken-4').addClass('waves-effect waves-light btn teal lighten-1')
	if (season == 'winter'){
		$('html').css('background-color', '#011132');
	}
	else if (season == 'summer'){
		$('html').css('background-color', '#664e00');
	}
	else if (season == 'spring'){
		$('html').css('background-color', '#14522e');
	}
	else{ //season == 'autumn'
		$('html').css('background-color', '#794d06');
	}
});
$('#day').click(function () {
	dayornight = 'day';
	$('.text').css('color', 'black');
	$('#about').removeClass('waves-effect waves-light btn blue lighten-1').addClass('waves-effect waves-light btn blue darken-4');
	$('#projects').removeClass('waves-effect waves-light btn indigo lighten-1').addClass('waves-effect waves-light btn indigo darken-4');
	$('#contact').removeClass('waves-effect waves-light btn deep-purple lighten-1').addClass('waves-effect waves-light btn deep-purple darken-4');
	$('#cv').removeClass('waves-effect waves-light btn teal lighten-1').addClass('waves-effect waves-light btn teal darken-4')
	if (season == 'winter'){
		$('html').css('background-color', '#a8c4Fe');
	}
	else if (season == 'summer'){
		$('html').css('background-color', '#FFC300');
	}
	else if (season == 'spring'){
		$('html').css('background-color', '#58D68D');
	}
	else{ //season == 'autumn' 
		$('html').css('background-color', '#F39C12');
	}
});

$('document').ready(function () { //Setup
	initSnow();
	var d = new Date();
	var h = d.getHours();
	var m = d.getMonth();
	if (h < 6 || h > 20){
		$('#night').click();
	}
	else{
		$('#day').click();
	}
	if (m <2 || m > 9){
		$('#winter').click();
	}
	else if (m >= 2 && m < 5){
		$('#spring').click();
	}
	else if (m >= 5 && m < 8){
		$('#summer').click();
	}
	else{
		$('#autumn').click();
	}

});
