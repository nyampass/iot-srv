/* eslint-env browser */
/* global Chart, deviceName, jQuery, moment */

(function () {
  const ctx = document.getElementById('chart')
  jQuery.getJSON('/' + deviceName + '.json', function (device) {
    const _ = new Chart(ctx, {
      type: 'line',
      data: {
        fill: true,
        labels: device.logLabels.map(function (o) {
          return moment(o)
        }),
        datasets: [{
          label: 'ステータス',
          backgroundColor: 'rgba(75,192,192,0.4)',
          borderColor: 'rgba(75,192,192,1)',
          borderCapStyle: 'butt',
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: 'miter',
          pointBorderColor: 'rgba(75,192,192,1)',
          pointBackgroundColor: '#fff',
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: 'rgba(75,192,192,1)',
          pointHoverBorderColor: 'rgba(220,220,220,1)',
          pointHoverBorderWidth: 2,
          pointRadius: 0.5,
          lineTension: 0.0,
          pointHitRadius: 10,
          data: device.logs.map(function (o) {
            return o.value
          })
        }]
      },
      options: {
        scales: {
          xAxes: [{
            type: 'time'
          }]
        }
      }})
  })
})()
