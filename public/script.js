var lastUpdateTime = null;

let previousQueueTimes = {
  disneyland: {},
  wdsp: {}
};


async function fetchQueueTimes() {
  try {
    setLoadingText(true);

    const response = await fetch('/api/queue-times');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const { disneylandData, wdspData } = await response.json();
    displayQueueTimes(disneylandData, wdspData);
  } catch (error) {
    console.error('Error fetching queue times:', error);
  } finally {
    setLoadingText(false);
  }
}

function setLoadingText(isLoading) {
  const closedRidesTitles = document.querySelectorAll('.closed-rides-title');
  closedRidesTitles.forEach(title => {
    if (isLoading) {
      title.classList.add('loading-dots');
      title.textContent = '';
    } else {
      title.classList.remove('loading-dots');
      title.textContent = 'Closed Rides';
    }
  });
}

function formatWaitTime(minutes) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes === 0 ? `${hours} hour` : `${hours} hour ${remainingMinutes} minutes`;
  } else {
    return `${minutes} minutes`;
  }
}

function displayQueueTimes(disneylandData, wdspData) {
  const disneylandOpenRides = document.getElementById('disneyland-open-rides');
  const disneylandClosedRides = document.getElementById('disneyland-closed-rides');
  const wdspOpenRides = document.getElementById('wdsp-open-rides');
  const wdspClosedRides = document.getElementById('wdsp-closed-rides');

  disneylandOpenRides.innerHTML = '';
  disneylandClosedRides.innerHTML = '';
  wdspOpenRides.innerHTML = '';
  wdspClosedRides.innerHTML = '';

  const parksData = [
    { data: disneylandData, openRidesContainer: disneylandOpenRides, closedRidesContainer: disneylandClosedRides, previousQueueTimes: previousQueueTimes.disneyland },
    { data: wdspData, openRidesContainer: wdspOpenRides, closedRidesContainer: wdspClosedRides, previousQueueTimes: previousQueueTimes.wdsp }
  ];

  parksData.forEach(({ data, openRidesContainer, closedRidesContainer, previousQueueTimes }) => {
    const closedRidesByLand = {};

    data.lands.forEach(land => {
      const singleRiderMap = {};
      land.rides.forEach(ride => {
        const rideName = ride.name.replace(/[*™®]/g, '');
        if (rideName.includes('Single Rider')) {
          const originalRideName = rideName.replace(' Single Rider', '');
          singleRiderMap[originalRideName] = ride;
        }
      });

      const openRides = land.rides.filter(ride => ride.is_open);

      openRides.sort((a, b) => b.wait_time - a.wait_time);

      if (openRides.length > 0) {
        const landDiv = document.createElement('div');
        landDiv.className = 'land';
        landDiv.innerHTML = `<h2 class="land-title">${land.name}</h2>`;

        openRides.forEach(ride => {
          const rideName = ride.name.replace(/[*™®]/g, '');
          
          if (rideName.includes('Single Rider')) {
            return;
          }
        
          const rideDiv = document.createElement('div');
          rideDiv.className = 'open-ride';

          let arrow = '';
          const previousRide = previousQueueTimes[rideName]?.ride;
          const previousArrow = previousQueueTimes[rideName]?.arrow || '';

          if (!previousRide || previousRide.wait_time !== ride.wait_time) {
            const previousWaitTime = previousRide ? previousRide.wait_time : null;
            if (ride.wait_time > previousWaitTime && previousWaitTime !== 0 && previousWaitTime !== null) {
              arrow = ' ▲';
              console.log(rideName, previousWaitTime, "minutes -> ", ride.wait_time, "minutes");
            } else if (ride.wait_time < previousWaitTime) {
              arrow = ' ▼';
              console.log(rideName, previousWaitTime, "minutes -> ", ride.wait_time, "minutes");
            }
            previousQueueTimes[rideName] = { ride: { ...ride }, arrow: arrow };
          } else {
            arrow = previousArrow;
          }

          const singleRiderRide = singleRiderMap[rideName];
          if (singleRiderRide) {
            rideDiv.innerHTML = `
              <strong class="ride-title">${rideName}</strong><br>
              Wait Time: <span class="wait-time">${formatWaitTime(ride.wait_time)}${arrow} / ${formatWaitTime(singleRiderRide.wait_time)} (Single Rider)</span><br>
            `;
          } else {
            rideDiv.innerHTML = `
              <strong class="ride-title">${rideName}</strong><br>
              <span class="wait-time">Wait Time: ${formatWaitTime(ride.wait_time)}${arrow}</span><br>
            `;
          }
        
          landDiv.appendChild(rideDiv);
        
          const rideUpdateTime = new Date(ride.last_updated);
          if (!lastUpdateTime || rideUpdateTime > lastUpdateTime) {
            lastUpdateTime = rideUpdateTime;
          }
        });

        openRidesContainer.appendChild(landDiv);
      }

      land.rides.forEach(ride => {
        if (!ride.is_open) {
          if (!closedRidesByLand[land.name]) {
            closedRidesByLand[land.name] = [];
          }
          closedRidesByLand[land.name].push(ride.name);
        }
      });
    });

    const closedLandNames = Object.keys(closedRidesByLand);
    if (closedLandNames.length > 0) {
      closedLandNames.forEach(landName => {
        const closedLandDiv = document.createElement('div');
        closedLandDiv.className = 'land closed-land';
        closedLandDiv.innerHTML = `<h3 class="closed-land-title">${landName}</h3>`;
      
        const filteredClosedRides = closedRidesByLand[landName].map(rideName => rideName.replace(/[*™®]/g, '')).filter(rideName => !rideName.includes('Single Rider'));
        
        filteredClosedRides.forEach(rideName => {
          const rideDiv = document.createElement('div');
          rideDiv.className = 'ride';
          rideDiv.innerHTML = `${rideName}`;
          closedLandDiv.appendChild(rideDiv);
        });
      
        closedRidesContainer.appendChild(closedLandDiv);
      });
    }
  });

}

function formatUpdateTime(date) {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    const secondsAgo = Math.floor((now - date) / 1000);
    if (secondsAgo < 60) {
      return 'Just now';
    } else if (secondsAgo < 120) {
      return '1 minute ago';
    } else {
      const minutesAgo = Math.floor(secondsAgo / 60);
      const remainingSeconds = secondsAgo % 60;
      if (remainingSeconds === 0) {
        return `${minutesAgo} minutes ago`;
      } else if (minutesAgo === 1) {
        return `1 minute and ${remainingSeconds} seconds ago`;
      } else {
        return `${minutesAgo} minutes and ${remainingSeconds} seconds ago`;
      }
    }
  } else {
    return date.toLocaleString();
  }
}

let previousFetchedData = null;
function checkForDataChanges(newData) {
  if (!previousFetchedData || JSON.stringify(previousFetchedData) !== JSON.stringify(newData)) {
    fetchQueueTimes();
    let x = new Date();
    let y = x.getSeconds();
    let z = "";
    if (y < 10) {
      z = "0" + y.toString();
    } else {
      z = y.toString();
    }

    console.log("Update Check: " + x.getHours().toString() + ":" + x.getMinutes().toString() + ":" + z);
    previousFetchedData = newData;
  }
}

setInterval(async () => {
  try {
    const response = await fetch('/api/queue-times');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const { disneylandData, wdspData } = await response.json();
    checkForDataChanges({ disneylandData, wdspData });
  } catch (error) {
    console.error('Error fetching queue times:', error);
  }
}, 1000);

function updateLastUpdateTime() {
  const lastUpdateElement = document.getElementById('last-update');
  if (lastUpdateTime) {
    lastUpdateElement.innerHTML = `Last Update: ${formatUpdateTime(lastUpdateTime)}`;
  } else {
    lastUpdateElement.innerHTML = 'Last Update: Not available';
  }
}

setInterval(() => {
  updateLastUpdateTime();
}, 1000);