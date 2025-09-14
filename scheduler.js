let processes = [];  // Array for the processes
const UNIT_WIDTH = 50; // The width per second
let colors = {}; // Colors of the processes
let processCount = 0; // Tracks number of processes added

// Set the first row PID
const firstRowPID = document.querySelector('table tr:nth-child(2) input[name="pid"]');
firstRowPID.value = getProcessID(processCount);
processCount++;

// Auto-generate id for uniformity
function getProcessID(index) {
  let id = '';
  index++; // 1-based
  while(index > 0){
    index--;
    id = String.fromCharCode(65 + (index % 26)) + id;
    index = Math.floor(index / 26);
  }
  return id;
}

// Event listener for adding new row in the process table
document.getElementById('addProcess').addEventListener('click', () => {
  const table = document.querySelector('table');
  const row = document.createElement('tr');

  const pid = getProcessID(processCount);
  processCount++;

  row.innerHTML = `
    <td><input type="text" name="pid" value="${pid}" readonly></td>
    <td><input type="number" name="arrival" min="0" required></td>
    <td><input type="number" name="burst" min="1" required></td>
  `;
  table.appendChild(row);
});


// Event listener for executing the runScheduler button in the HTML
document.getElementById('runScheduler').addEventListener('click', async () => {
  
  processCount = 0; // reset for new run
  // Clear previous Gantt chart and stats
  document.getElementById('gantt').innerHTML = '';
  document.getElementById('timeLabels').innerHTML = '';
  const oldStats = document.querySelector('#stats');
  if(oldStats) oldStats.remove();

  // Storing the processes in the array
  processes = [];
  const rows = document.querySelectorAll('table tr'); // Selects the table rows for the first table

  // Loop for getting the processes
  rows.forEach((row, index) => {
    
    if(index === 0) return; // skip header
    const pid = row.querySelector('input[name="pid"]').value; // Stores pid from the table
    const arrival = parseInt(row.querySelector('input[name="arrival"]').value); // Stores the arrival time from the table
    const burst = parseInt(row.querySelector('input[name="burst"]').value); // Stores the burst time from the table

    // Pushes the elements in the array processes
    if(pid && !isNaN(arrival) && !isNaN(burst)){
      processes.push({ pid, arrival, burst, remaining: burst, completion: 0 });
    }
  });

  // Gets the time quantum from the table
  const timeQuantum = parseInt(document.getElementById('timeQuantum').value);
  
  // Processes the round robin scheduling algorithm 
  await roundRobin(processes, timeQuantum);
});

// Function for updating the cpu
function updateCPU(pid) {

  // Selects the cpuBox in from the HTML
  const cpuBox = document.getElementById('cpuBox');
  cpuBox.innerHTML = ''; // Ensures it is empty

  // If there is no process on going
  if (!pid) {
    cpuBox.innerText = 'Idle';
    cpuBox.style.background = '#eee';
    return;
  }

  // Creates a div element for boxes 
  const div = document.createElement('div');
  div.className = 'proc-box show';
  div.innerText = pid; // The pid is in the box
  // Assigns color randomly
  div.style.backgroundColor = colors[pid] || (colors[pid] = '#' + Math.floor(Math.random()*16777215).toString(16));
  cpuBox.appendChild(div); // Appends this inside the cpuBox

}

// Function for updating the ready queue
function updateRQ(queue) {

  // Gets the element with a an rqBox id
  const rqBox = document.getElementById('rqBox');

  // Build current PIDs
  const currentPIDs = queue.map(p => p.pid);

  // Remove old ones
  [...rqBox.children].forEach(child => {
    if (!currentPIDs.includes(child.dataset.pid)) {
      child.classList.remove('show');
      child.classList.add('hide');
      setTimeout(() => child.remove(), 300);
    }
  });

  // Add new ones
  queue.forEach(p => {
    if (!rqBox.querySelector(`[data-pid="${p.pid}"]`)) {
      const div = document.createElement('div');
      div.className = 'proc-box';
      div.dataset.pid = p.pid;
      div.innerText = p.pid;
      div.style.backgroundColor = colors[p.pid] || (colors[p.pid] = '#' + Math.floor(Math.random()*16777215).toString(16));
      rqBox.appendChild(div);
      requestAnimationFrame(() => div.classList.add('show'));
    }
  });
}

// Function for adding  process unit in the gantt chart
function addProcessUnit(pid) {

  // Gets the element with a gantt id
  const gantt = document.getElementById('gantt');

  // Creates an element div
  const div = document.createElement('div');
  div.className = 'process'; // div has a class named process
  div.style.width = `${UNIT_WIDTH}px`; // Style of the div

  // If !pid then idle
  if (!pid) {
    div.innerText = 'Idle';
    div.style.backgroundColor = '#ccc';
  } else { // Else randomizes a color if the process is not null
    div.innerText = pid;
    div.style.backgroundColor = colors[pid] || (colors[pid] = '#' + Math.floor(Math.random()*16777215).toString(16));
  }
  gantt.appendChild(div); /// Append the div
}

// Function for animation
function animateToGantt(pid, time) {

  // Gets the element with an id of cpuBox
  const cpuBox = document.getElementById('cpuBox');

  // Gets the element with an id of gantt
  const gantt = document.getElementById('gantt');

  // If !pid then null
  if (!pid) {
    addProcessUnit(null);
    return;
  }

  // Selects .pro-box
  const cpuProc = cpuBox.querySelector('.proc-box');

  // if !cpuProc then return the div from the add process unit function
  if (!cpuProc) return addProcessUnit(pid);

  // Clones cpuProc
  const clone = cpuProc.cloneNode(true);
  clone.style.position = 'absolute';
  clone.style.zIndex = 1000;
  const rectCPU = cpuProc.getBoundingClientRect();
  const rectGantt = gantt.getBoundingClientRect();

  clone.style.left = rectCPU.left + 'px';
  clone.style.top = rectCPU.top + 'px';
  document.body.appendChild(clone);

  void clone.offsetWidth;

  clone.style.transition = 'all 0.5s ease';
  clone.style.left = rectGantt.left + gantt.children.length * UNIT_WIDTH + 'px';
  clone.style.top = rectGantt.top + 'px';

  setTimeout(() => {
    clone.remove();
    addProcessUnit(pid);
  }, 500);
}

// Function for adding time labels
function addTimeLabels(totalTime) {

  // Get the element with an id of time labels
  const container = document.getElementById('timeLabels');

  container.innerHTML = '';

  // Maps the seconds below using the 50px width
  for (let t = 0; t <= totalTime; t++) {
    const span = document.createElement('span');
    span.innerText = t;
    span.style.width = `${UNIT_WIDTH}px`; // align with gantt block
    container.appendChild(span);
  }
}

// The function for round robin algorithm
async function roundRobin(processes, timeQuantum){

  // Initializes necessary variables
  let time = 0;
  let readyQueue = [];
  let completed = 0;
  const n = processes.length;
  const totalBurst = processes.reduce((acc,p)=>acc+p.burst,0);

  // Loop for executing the processes
  while(completed < n){

    // Add newly arrived
    processes.forEach(p => {
      if(p.arrival <= time && !readyQueue.includes(p) && p.remaining > 0){
        readyQueue.push(p);
      }
    });

    // If the readyQueue length is equal to 0
    if(readyQueue.length === 0){

      // CPU idle
      updateCPU(null);
      updateRQ(readyQueue);

      animateToGantt(null, time);  // show idle block
      await new Promise(r => setTimeout(r, 500));
      time++;
      continue;
    }

    // Removes the first element in the array
    const p = readyQueue.shift();

    // Calculates the runTime for a specific process in relation to the time quantum
    const runTime = Math.min(timeQuantum, p.remaining);
    p.remaining -= runTime; // Calculates the remaining after running


    // Loop for animating the runtime if its not 0 or null
    for(let t=0; t<runTime; t++){

      // Updates the cpu and rq
      updateCPU(p.pid);
      updateRQ(readyQueue);
      
      animateToGantt(p.pid, time); // animation

      await new Promise(r => setTimeout(r, 500)); // animate per second
      time++;

      // Check arrivals mid-execution
      processes.forEach(proc => {
        if(proc.arrival === time && !readyQueue.includes(proc) && proc.remaining > 0){
          readyQueue.push(proc);
        }
      });

    }

    // Checks if the remaining is 0
    if(p.remaining > 0){
      readyQueue.push(p);
    } else {
      p.completion = time;
      completed++;
    }
  }

  addTimeLabels(time); // Add time labels after the execution

  // Stats
  const statsDiv = document.createElement('div');
  statsDiv.id = 'stats';

  // Create table for process stats
  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Process</th>
        <th>Finish Time</th>
        <th>TAT</th>
        <th>WT</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');

  // Initializes variables of ATAT and AWT
  let totalTAT = 0;
  let totalWT = 0;

  // Computes the TAT and WT 
  processes.forEach(p => {
    p.tat = p.completion - p.arrival;
    p.wt = p.tat - p.burst;
    totalTAT += p.tat;
    totalWT += p.wt;

    // Inserts table data 
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${p.pid}</td>
      <td>${p.completion}</td>
      <td>${p.tat}</td>
      <td>${p.wt}</td>
    `;

    // Append the rows
    tbody.appendChild(row);
  });

  // Append the table to stats div
  statsDiv.appendChild(table);

  // Compute averages
  const avgTAT = (totalTAT / n).toFixed(2);
  const avgWT = (totalWT / n).toFixed(2);

  // Add averages, CPU Utilization, and throughput
  const totalTime = processes.reduce((max,p)=> Math.max(max,p.completion),0);
  const cpuUtil = ((totalBurst / totalTime)*100).toFixed(2);
  const throughput = (n / totalTime).toFixed(2);

  // Creates element div in the HTML
  const averagesDiv = document.createElement('div');
  averagesDiv.className = 'averages'; // Class name of the div

  // The general stats
  averagesDiv.innerHTML = `
    CPU Utilization: <strong>${cpuUtil}%</strong> | 
    Throughput: <strong>${throughput}</strong> processes/unit time | 
    ATAT: <strong>${avgTAT}</strong> | 
    AWT: <strong>${avgWT}</strong>
  `;

  // Appends the averagesDiv
  statsDiv.appendChild(averagesDiv);

  // Append inside main container
  document.querySelector('.main-container').appendChild(statsDiv);
}
