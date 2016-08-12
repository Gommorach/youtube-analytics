$(document).ready(function () {
  var playlistId;
  var reverse;
  var views;
  var episodeNumber;
  var playlistTitle;

  $('#drawGraph').on('click', function(){
    initialiseSearch();
  });

  $('#playlistId').keyup(function (e) {
    if (e.keyCode == 13) {
      initialiseSearch();
    }
  });

  $('#reverse').change(function () {
    reverse = !reverse;
    if (myChart) drawGraph(views, episodeNumber, playlistTitle);
    reverse = !reverse;
  });

  function initialiseSearch() {
    console.log('search initialised');
    $('#errorMessage').remove();
    $('.reverseCheck').css('visibility', 'hidden');
    $('iframe').remove();
    $('canvas').remove();
    $('.box').append('<div class="loader1"></div>');
    $('#reverse').prop('checked', false);

    playlistId = $('#playlistId').val();    
    reverse = $('#reverse').is(':checked');
    var url = '/request?playlistId=' + playlistId;
    $.ajax({
      url: url
    }).done(function (data) {
      views         = data.views;
      episodeNumber = data.episodeNumber;
      playlistTitle = data.playlistTitle;
        drawGraph(views, episodeNumber, playlistTitle);
    }).fail(function(errorMessage) {
      $('iframe').remove();
      $('canvas').remove();
      $('.box').empty();
      $('.container').append('<h3 id="errorMessage">playlistId was not found. Please try again</h3>');
    });
  }

  var drawGraph = function (views, episodeNumber, playlistTitle) {
    $('iframe').remove();
    $('canvas').remove();
    $('.box').empty();
    $('.reverseCheck').css('visibility', 'visible');
    $('.container').append('<canvas id="myChart"></canvas>');

    views = reverse ? views.reverse(): views;
    episodeNumber = reverse ? episodeNumber.reverse(): episodeNumber;
    var color = 'rgba(255, 99, 132, 0.8)';
    var ctx = document.getElementById("myChart");
    var myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: episodeNumber,
            datasets: [{
              backgroundColor: 'rgba(75, 179, 214, 0.5)',
                label: '#number of views: ',
                data: views
            }]
        },
        options: {
          scales: {
            xAxes: [{ ticks: { display: false}}],
            yAxes: [{ ticks: { beginAtZero:false }}]
          },
          responsive: true,
          title: {
            display: true,
            fontSize: 24,
            fontStyle: 'bold',
            text: playlistTitle
          }
        }
      });
    }
});
