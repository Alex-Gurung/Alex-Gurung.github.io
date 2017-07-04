document.addEventListener("DOMContentLoaded", function () {
    Typed.new("#typer", {
        strings: ["Me! ", "<span class='lighthouse'>Lighthouse</span> ",
            "<span class='sah'>S. A. H.</span> ",
            "<span class='notes'>W. W. F.</span> ",
            "<span class='ship'>Ship Creator</span> ", "Project Codet ", " etc! "
        ],
        typeSpeed: 2.5,
        backSpeed: 0.75,
        loop: true,
        backDelay: 800
    });
});
AOS.init();
$('body').flowtype();
    smoothScroll.init({
    speed: 800,
    easing: 'easeInOutCubic'
});
$(".github-inline").click(function () {
    var win = window.open('https://github.com/alex-gurung', '_blank');
    if (win) {
        //Browser has allowed it to be opened
        win.focus();
    } else {
        //Browser has blocked it
    }
});
var bar = new ProgressBar.Line('#bar', {
  strokeWidth: 1.0,
  easing: 'easeInOut',
  duration: 1000,
  color: '#FFD54F',
  trailColor: '#e6e9ea',
  trailWidth: 1.0,
  svgStyle: {width: '100%', height: '100%'}
});
bar.animate(2.0);
// bar.animate(2.0);
function animate_bar () {
    bar.set(0);
    bar.animate(2.0, {
        duration:1500
    }, function() {
        bar.set(0);
        bar.animate(2, {
            duration:1500
        }, animate_bar)
     }
    );
}
// animate_bar();