/**
 * FitGraph - Modern Responsive Fitness Tracker
 * Full client-side application logic with local storage persistence,
 * dynamic charting, data import/export, and interactive fitness tools.
 */

// ==========================================================================
// Default / Seed Data (Matching historical project user_data)
// ==========================================================================
const DEFAULT_WORKOUTS = [
  { id: "w-1", date: "2025-07-24", exercise: "Strength Training", duration: 30, calories: 1200 },
  { id: "w-2", date: "2025-07-25", exercise: "Strength Training", duration: 45, calories: 1400 },
  { id: "w-3", date: "2025-07-26", exercise: "Strength Training", duration: 50, calories: 1480 },
  { id: "w-4", date: "2025-07-27", exercise: "Weightlifting", duration: 5, calories: 1100 },
  { id: "w-5", date: "2025-07-28", exercise: "Strength Training", duration: 50, calories: 1500 },
  { id: "w-6", date: "2025-07-28", exercise: "Strength Training", duration: 40, calories: 1300 },
  { id: "w-7", date: "2025-07-29", exercise: "Strength Training", duration: 50, calories: 1700 },
  { id: "w-8", date: "2025-07-30", exercise: "Strength Training", duration: 45, calories: 1850 }
];

const DEFAULT_WEIGHTS = [
  { id: "wt-1", date: "2025-07-24", weight: 55.0 },
  { id: "wt-2", date: "2025-07-25", weight: 57.0 },
  { id: "wt-3", date: "2025-07-26", weight: 58.4 },
  { id: "wt-4", date: "2025-07-27", weight: 54.0 },
  { id: "wt-5", date: "2025-07-28", weight: 57.0 },
  { id: "wt-6", date: "2025-07-29", weight: 59.0 },
  { id: "wt-7", date: "2025-07-30", weight: 60.0 }
];

const QUOTES = [
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger" },
  { text: "Success starts with self-discipline.", author: "Dwayne Johnson" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Your body can stand almost anything; it’s your mind that you have to convince.", author: "Fitness Proverb" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Don’t count the days, make the days count.", author: "Muhammad Ali" },
  { text: "Energy flows where focus goes.", author: "Tony Robbins" }
];

// Exercise MET values for rough calorie burn estimation
const MET_VALUES = {
  "Weightlifting": 6.0,
  "Compound Lifts": 6.5,
  "Strength Training": 5.5,
  "Hypertrophy": 5.0,
  "Calisthenics": 7.0,
  "Running": 9.8,
  "Cycling": 8.0,
  "HIIT": 10.0,
  "Swimming": 8.5,
  "Jump Rope": 11.0,
  "Rowing": 7.5,
  "Cardio": 7.0,
  "Yoga / Mobility": 3.0,
  "Other": 5.0
};

// ==========================================================================
// ==========================================================================
// Application State & User Account Management
// ==========================================================================
class AppState {
  constructor() {
    // 1. Accounts store (multi-user accounts in localStorage)
    this.accounts = JSON.parse(localStorage.getItem("fitgraph_accounts"));
    if (!this.accounts || typeof this.accounts !== "object") {
      this.accounts = {};
      this.saveAccounts();
    }
    // Remove legacy demo account if present
    if (this.accounts.alex && this.accounts.alex.password === "123") {
      delete this.accounts.alex;
      this.saveAccounts();
    }

    // 2. Active Session
    this.activeUsername = localStorage.getItem("fitgraph_session_user") || null;
    if (this.activeUsername === "alex" || (this.activeUsername && !this.accounts[this.activeUsername])) {
      this.activeUsername = null;
      this.saveSession();
    }

    this.user = this.activeUsername ? this.accounts[this.activeUsername] : null;
    this.loadUserData(this.activeUsername);

    this.activeTimeRange = "7d";
    this.currentView = "dashboard";
  }

  saveAccounts() {
    localStorage.setItem("fitgraph_accounts", JSON.stringify(this.accounts));
  }

  saveSession() {
    if (this.activeUsername) {
      localStorage.setItem("fitgraph_session_user", this.activeUsername);
    } else {
      localStorage.removeItem("fitgraph_session_user");
    }
  }

  loadUserData(username) {
    if (!username || !this.accounts[username]) {
      this.user = { fullName: "User", username: "", goal: "Weight Gain", subgoal: "Muscle Gain", currentWeight: 60, targetWeight: 65, soundEnabled: true };
      this.workouts = [];
      this.weights = [];
      this.waterCount = 0;
      return;
    }

    this.user = this.accounts[username];
    const savedWorkouts = localStorage.getItem(`fitgraph_workouts_${username}`);
    const savedWeights = localStorage.getItem(`fitgraph_weights_${username}`);

    this.workouts = savedWorkouts ? JSON.parse(savedWorkouts) : [];
    this.weights = savedWeights ? JSON.parse(savedWeights) : (this.user && this.user.currentWeight ? [{ id: `wt-${Date.now()}`, date: new Date().toISOString().split('T')[0], weight: this.user.currentWeight }] : []);
    this.waterCount = parseInt(localStorage.getItem(`fitgraph_water_${username}`) || "0", 10);
  }

  saveUser() {
    if (this.activeUsername && this.accounts[this.activeUsername]) {
      this.accounts[this.activeUsername] = { ...this.user };
      this.saveAccounts();
    }
    localStorage.setItem("fitgraph_user", JSON.stringify(this.user));
  }

  saveWorkouts() {
    if (this.activeUsername) {
      localStorage.setItem(`fitgraph_workouts_${this.activeUsername}`, JSON.stringify(this.workouts));
    }
  }

  saveWeights() {
    if (this.activeUsername) {
      localStorage.setItem(`fitgraph_weights_${this.activeUsername}`, JSON.stringify(this.weights));
    }
  }

  saveWater() {
    if (this.activeUsername) {
      localStorage.setItem(`fitgraph_water_${this.activeUsername}`, this.waterCount.toString());
    }
  }

  login(username, password) {
    const handle = username.toLowerCase().trim();
    const account = this.accounts[handle];
    if (!account) {
      return { success: false, message: "User not found. Please click 'Create Account' above." };
    }
    if (account.password !== password) {
      return { success: false, message: "Incorrect password. Please try again." };
    }

    this.activeUsername = handle;
    this.saveSession();
    this.loadUserData(this.activeUsername);
    return { success: true, user: this.user };
  }

  signup(accountData) {
    const handle = accountData.username.toLowerCase().trim();
    if (this.accounts[handle]) {
      return { success: false, message: "Username already taken. Please choose another or Sign In." };
    }

    this.accounts[handle] = {
      username: handle,
      fullName: accountData.fullName.trim() || handle,
      password: accountData.password,
      goal: accountData.goal || "Weight Gain",
      subgoal: accountData.subgoal || "Muscle Gain",
      currentWeight: parseFloat(accountData.currentWeight) || 60,
      targetWeight: parseFloat(accountData.targetWeight) || 65,
      soundEnabled: true,
      theme: "dark"
    };

    this.saveAccounts();
    this.activeUsername = handle;
    this.saveSession();
    this.loadUserData(handle);
    return { success: true, user: this.user };
  }

  logout() {
    this.activeUsername = null;
    this.saveSession();
    this.loadUserData(null);
  }

  addWorkout(workout) {
    this.workouts.push(workout);
    this.saveWorkouts();
  }

  addWeight(weightRecord) {
    const existingIndex = this.weights.findIndex(w => w.date === weightRecord.date);
    if (existingIndex >= 0) {
      this.weights[existingIndex].weight = weightRecord.weight;
    } else {
      this.weights.push(weightRecord);
    }
    this.weights.sort((a, b) => new Date(a.date) - new Date(b.date));
    this.user.currentWeight = weightRecord.weight;
    this.saveUser();
    this.saveWeights();
  }

  deleteWorkout(id) {
    this.workouts = this.workouts.filter(w => w.id !== id);
    this.saveWorkouts();
  }

  resetToDefault() {
    this.workouts = [];
    this.weights = this.user && this.user.currentWeight ? [{ id: `wt-${Date.now()}`, date: new Date().toISOString().split('T')[0], weight: this.user.currentWeight }] : [];
    this.saveWorkouts();
    this.saveWeights();
  }
}

// Global state instance
const state = new AppState();

// ==========================================================================
// Audio Synthesis (Web Audio API for zero-dependency sound feedback)
// ==========================================================================
class SoundFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  playChime() {
    if (!state.user.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn("Audio chime prevented or unsupported", e);
    }
  }

  playBeep(freq = 440, duration = 0.1) {
    if (!state.user.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  }
}

const sfx = new SoundFX();

// ==========================================================================
// Confetti Particle System (Zero-dependency Canvas Confetti)
// ==========================================================================
class ConfettiEngine {
  constructor() {
    this.canvas = document.getElementById("confettiCanvas");
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    this.particles = [];
    this.animating = false;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

  burst(x = window.innerWidth / 2, y = window.innerHeight * 0.5) {
    if (!this.canvas) {
      this.canvas = document.getElementById("confettiCanvas");
      if (this.canvas) this.ctx = this.canvas.getContext("2d");
      this.resize();
    }
    if (!this.ctx) return;

    const colors = ["#00f0ff", "#3b82f6", "#10b981", "#ff7043", "#8b5cf6", "#f43f5e", "#ffd700"];
    const count = 100;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 9;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        size: 5 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        life: 1,
        decay: 0.012 + Math.random() * 0.015
      });
    }

    if (!this.animating) {
      this.animating = true;
      this.animate();
    }
  }

  animate() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.28; // gravity
      p.vx *= 0.98; // drag
      p.rotation += p.rotationSpeed;
      p.life -= p.decay;

      if (p.life <= 0 || p.y > this.canvas.height + 50) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.animating = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

const confetti = new ConfettiEngine();

// ==========================================================================
// Chart Management (Chart.js wrappers)
// ==========================================================================
let weightChartInstance = null;
let calorieChartInstance = null;
let workoutDistChartInstance = null;

function getFilteredData(days) {
  const cutoff = new Date();
  if (days === 'all') {
    return {
      weights: [...state.weights].sort((a, b) => new Date(a.date) - new Date(b.date)),
      workouts: [...state.workouts].sort((a, b) => new Date(a.date) - new Date(b.date))
    };
  }

  cutoff.setDate(cutoff.getDate() - parseInt(days, 10));
  const cutoffStr = cutoff.toISOString().split('T')[0];

  return {
    weights: state.weights
      .filter(w => w.date >= cutoffStr)
      .sort((a, b) => new Date(a.date) - new Date(b.date)),
    workouts: state.workouts
      .filter(w => w.date >= cutoffStr)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  };
}

function initCharts() {
  if (typeof Chart === "undefined") {
    console.warn("Chart.js not yet loaded.");
    return;
  }

  // Set Chart.js Defaults
  Chart.defaults.color = "#94a3b8";
  Chart.defaults.font.family = "'Outfit', sans-serif";
  Chart.defaults.plugins.tooltip.backgroundColor = "rgba(15, 23, 42, 0.95)";
  Chart.defaults.plugins.tooltip.borderColor = "rgba(0, 240, 255, 0.4)";
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.boxPadding = 6;
  Chart.defaults.plugins.tooltip.cornerRadius = 10;

  updateAllCharts();
}

function updateAllCharts() {
  const days = state.activeTimeRange === "7d" ? 7 : (state.activeTimeRange === "30d" ? 30 : "all");
  const filtered = getFilteredData(days);

  renderWeightChart(filtered.weights);
  renderCalorieChart(filtered.workouts);
  renderWorkoutDistributionChart(filtered.workouts);
  updateStatsCards();
  updateActivityRings();
}

function renderWeightChart(weightData) {
  const canvas = document.getElementById("weightTrendChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Fallback if empty
  const labels = weightData.length ? weightData.map(w => w.date) : ["No Data"];
  const data = weightData.length ? weightData.map(w => w.weight) : [0];

  // Neon Gradient Fill
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, "rgba(0, 240, 255, 0.35)");
  gradient.addColorStop(1, "rgba(0, 240, 255, 0.0)");

  if (weightChartInstance) {
    weightChartInstance.destroy();
  }

  weightChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Weight (kg)",
          data: data,
          borderColor: "#00f0ff",
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: "#00f0ff",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8
        },
        {
          label: `Goal Target (${state.user.targetWeight} kg)`,
          data: labels.map(() => state.user.targetWeight),
          borderColor: "rgba(255, 112, 67, 0.65)",
          borderWidth: 2,
          borderDash: [6, 6],
          fill: false,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: { color: "#cbd5e1", usePointStyle: true }
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(255, 255, 255, 0.05)" },
          ticks: { color: "#94a3b8" }
        },
        y: {
          grid: { color: "rgba(255, 255, 255, 0.05)" },
          ticks: { color: "#94a3b8" },
          suggestedMin: Math.min(...data, state.user.targetWeight) - 3,
          suggestedMax: Math.max(...data, state.user.targetWeight) + 3
        }
      }
    }
  });
}

function renderCalorieChart(workoutData) {
  const canvas = document.getElementById("calorieBurnChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Aggregate calories by date
  const dateMap = {};
  workoutData.forEach(w => {
    dateMap[w.date] = (dateMap[w.date] || 0) + Number(w.calories);
  });

  const labels = Object.keys(dateMap).length ? Object.keys(dateMap) : ["No Workouts"];
  const data = Object.keys(dateMap).length ? Object.values(dateMap) : [0];

  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, "#3b82f6");
  gradient.addColorStop(1, "rgba(59, 130, 246, 0.2)");

  if (calorieChartInstance) {
    calorieChartInstance.destroy();
  }

  calorieChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Calories Burned (kcal)",
          data: data,
          backgroundColor: gradient,
          borderColor: "#3b82f6",
          borderWidth: 1.5,
          borderRadius: 8,
          hoverBackgroundColor: "#00f0ff"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#94a3b8" }
        },
        y: {
          grid: { color: "rgba(255, 255, 255, 0.05)" },
          ticks: { color: "#94a3b8" }
        }
      }
    }
  });
}

function renderWorkoutDistributionChart(workoutData) {
  const canvas = document.getElementById("workoutDistributionChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const categoryMap = {};
  workoutData.forEach(w => {
    categoryMap[w.exercise] = (categoryMap[w.exercise] || 0) + Number(w.duration);
  });

  const labels = Object.keys(categoryMap).length ? Object.keys(categoryMap) : ["None"];
  const data = Object.keys(categoryMap).length ? Object.values(categoryMap) : [1];

  const palette = [
    "#00f0ff",
    "#3b82f6",
    "#10b981",
    "#ff7043",
    "#8b5cf6",
    "#f43f5e",
    "#eab308"
  ];

  if (workoutDistChartInstance) {
    workoutDistChartInstance.destroy();
  }

  workoutDistChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: palette.slice(0, labels.length),
          borderColor: "rgba(15, 23, 42, 0.9)",
          borderWidth: 3,
          hoverOffset: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#cbd5e1", boxWidth: 12, padding: 12 }
        }
      }
    }
  });
}

// ==========================================================================
// Statistics Cards Calculator
// ==========================================================================
function updateStatsCards() {
  const totalWorkouts = state.workouts.length;
  const totalCalories = state.workouts.reduce((sum, w) => sum + Number(w.calories || 0), 0);
  const totalMinutes = state.workouts.reduce((sum, w) => sum + Number(w.duration || 0), 0);

  const startWeight = state.weights.length > 0 ? state.weights[0].weight : state.user.currentWeight;
  const latestWeight = state.weights.length > 0 ? state.weights[state.weights.length - 1].weight : state.user.currentWeight;
  const delta = (latestWeight - startWeight).toFixed(1);

  const elWorkouts = document.getElementById("statTotalWorkouts");
  const elCalories = document.getElementById("statTotalCalories");
  const elMinutes = document.getElementById("statTotalTime");
  const elWeight = document.getElementById("statCurrentWeight");
  const elWeightDelta = document.getElementById("statWeightDelta");

  if (elWorkouts) elWorkouts.textContent = totalWorkouts;
  if (elCalories) elCalories.textContent = totalCalories.toLocaleString();
  if (elMinutes) elMinutes.textContent = `${totalMinutes} m`;
  if (elWeight) elWeight.textContent = `${latestWeight} kg`;

  if (elWeightDelta) {
    const isGainGoal = state.user.goal.includes("Gain");
    const deltaVal = parseFloat(delta);
    let trendClass = "stat-subtitle";
    let icon = "⚡";

    if (deltaVal > 0) {
      trendClass = isGainGoal ? "stat-trend-up" : "stat-trend-down";
      icon = "▲";
    } else if (deltaVal < 0) {
      trendClass = isGainGoal ? "stat-trend-down" : "stat-trend-up";
      icon = "▼";
    }

    elWeightDelta.className = trendClass;
    elWeightDelta.innerHTML = `${icon} ${deltaVal >= 0 ? '+' : ''}${deltaVal} kg from start`;
  }
}

// ==========================================================================
// Concentric Activity Rings (Apple Fitness Style)
// ==========================================================================
function updateActivityRings() {
  const moveFg = document.getElementById("ringMoveFg");
  const exerciseFg = document.getElementById("ringExerciseFg");
  const hydrateFg = document.getElementById("ringHydrateFg");

  const moveValEl = document.getElementById("ringMoveValue");
  const exerciseValEl = document.getElementById("ringExerciseValue");
  const hydrateValEl = document.getElementById("ringHydrateValue");
  const centerScoreEl = document.getElementById("ringsCenterScore");
  const overallEl = document.getElementById("ringsOverallPercent");

  if (!moveFg || !exerciseFg || !hydrateFg) return;

  // Use latest workout metrics or fallback
  const lastWorkout = state.workouts.length ? state.workouts[state.workouts.length - 1] : { calories: 1200, duration: 45 };
  const todayCalories = lastWorkout.calories || 1200;
  const todayMinutes = lastWorkout.duration || 45;
  const todayWater = state.waterCount * 250;

  const moveGoal = 1500;
  const exerciseGoal = 45;
  const waterGoal = 2000;

  const movePct = Math.min(todayCalories / moveGoal, 1);
  const exercisePct = Math.min(todayMinutes / exerciseGoal, 1);
  const waterPct = Math.min(todayWater / waterGoal, 1);

  // Circumferences: Outer=565.48, Middle=439.82, Inner=314.15
  moveFg.style.strokeDashoffset = (565.48 * (1 - movePct)).toString();
  exerciseFg.style.strokeDashoffset = (439.82 * (1 - exercisePct)).toString();
  hydrateFg.style.strokeDashoffset = (314.15 * (1 - waterPct)).toString();

  if (moveValEl) moveValEl.textContent = todayCalories.toLocaleString();
  if (exerciseValEl) exerciseValEl.textContent = todayMinutes;
  if (hydrateValEl) hydrateValEl.textContent = todayWater.toLocaleString();

  let completedRings = 0;
  if (movePct >= 1) completedRings++;
  if (exercisePct >= 1) completedRings++;
  if (waterPct >= 1) completedRings++;

  if (centerScoreEl) centerScoreEl.textContent = `${completedRings}/3`;
  const avgPct = Math.round(((movePct + exercisePct + waterPct) / 3) * 100);
  if (overallEl) overallEl.textContent = `${avgPct}% COMPLETE`;
}

// ==========================================================================
// Gym Rest & Interval Countdown Timer
// ==========================================================================
class GymRestTimer {
  constructor() {
    this.totalDuration = 60;
    this.timeLeft = 60;
    this.intervalId = null;
    this.isRunning = false;
    this.circumference = 534.07;
  }

  init() {
    this.fgCircle = document.getElementById("timerFgCircle");
    this.timeText = document.getElementById("timerTimeText");
    this.labelText = document.getElementById("timerLabelText");

    const startBtn = document.getElementById("timerStartBtn");
    const pauseBtn = document.getElementById("timerPauseBtn");
    const resetBtn = document.getElementById("timerResetBtn");

    if (startBtn) startBtn.addEventListener("click", () => this.start());
    if (pauseBtn) pauseBtn.addEventListener("click", () => this.pause());
    if (resetBtn) resetBtn.addEventListener("click", () => this.reset());

    document.querySelectorAll(".timer-preset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".timer-preset-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.setDuration(parseInt(btn.dataset.time, 10));
      });
    });

    this.updateDisplay();
  }

  setDuration(seconds) {
    this.pause();
    this.totalDuration = seconds;
    this.timeLeft = seconds;
    this.updateDisplay();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    sfx.playBeep(580, 0.08);

    if (this.labelText) this.labelText.textContent = "RESTING...";

    this.intervalId = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.updateDisplay();

        // Audio countdown for final 3 seconds
        if (this.timeLeft === 3 || this.timeLeft === 2 || this.timeLeft === 1) {
          sfx.playBeep(750, 0.12);
        }

        if (this.timeLeft === 0) {
          this.complete();
        }
      }
    }, 1000);
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this.intervalId);
    if (this.labelText) this.labelText.textContent = "PAUSED";
  }

  reset() {
    this.pause();
    this.timeLeft = this.totalDuration;
    if (this.labelText) this.labelText.textContent = "REST TIMER";
    this.updateDisplay();
  }

  complete() {
    this.pause();
    if (this.labelText) this.labelText.textContent = "SET READY! 🔥";
    sfx.playChime();
    confetti.burst(window.innerWidth / 2, window.innerHeight * 0.5);
    showToast("Rest time complete! Ready for next set! 💪");
  }

  updateDisplay() {
    this.fgCircle = document.getElementById("timerFgCircle");
    this.timeText = document.getElementById("timerTimeText");
    if (!this.timeText || !this.fgCircle) return;

    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    this.timeText.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    const fraction = this.timeLeft / this.totalDuration;
    const offset = this.circumference * (1 - fraction);
    this.fgCircle.style.strokeDashoffset = offset.toString();

    if (this.timeLeft <= 5 && this.timeLeft > 0) {
      this.fgCircle.classList.add("warning");
      this.timeText.parentElement?.classList.add("timer-pulse");
    } else {
      this.fgCircle.classList.remove("warning");
      this.timeText.parentElement?.classList.remove("timer-pulse");
    }
  }
}

const restTimer = new GymRestTimer();

window.switchToToolsTimer = function() {
  const navItem = document.querySelector('[data-nav-view="toolsView"]');
  if (navItem) navItem.click();
  setTimeout(() => {
    document.getElementById("restTimerCard")?.scrollIntoView({ behavior: "smooth" });
  }, 150);
};

// ==========================================================================
// Motivational Quote Banner
// ==========================================================================
function setRandomQuote() {
  const quoteTextEl = document.getElementById("quoteText");
  const quoteAuthorEl = document.getElementById("quoteAuthor");
  if (!quoteTextEl || !quoteAuthorEl) return;

  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  quoteTextEl.style.opacity = "0";
  setTimeout(() => {
    quoteTextEl.textContent = `“${quote.text}”`;
    quoteAuthorEl.textContent = `— ${quote.author}`;
    quoteTextEl.style.opacity = "1";
  }, 200);
}

// ==========================================================================
// Toast Notification
// ==========================================================================
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "toast-error" : "toast-success"}`;
  toast.innerHTML = `
    <span>${type === "error" ? "⚠️" : "🔥"}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================================================
// Dynamic Exercise Dropdown & Calorie Burn Estimator
// ==========================================================================
function updateExerciseOptions() {
  const select = document.getElementById("exerciseSelect");
  if (!select) return;

  const isWeightGain = state.user.goal.includes("Gain");
  const options = isWeightGain
    ? ["Strength Training", "Weightlifting", "Compound Lifts", "Hypertrophy", "Calisthenics", "Other"]
    : ["Running", "Cycling", "HIIT", "Swimming", "Jump Rope", "Cardio", "Strength Training", "Other"];

  select.innerHTML = options.map(opt => `<option value="${opt}">${opt}</option>`).join("");
  estimateCalories();
}

function estimateCalories() {
  const exercise = document.getElementById("exerciseSelect")?.value || "Strength Training";
  const duration = parseFloat(document.getElementById("durationInput")?.value || 30);
  const weight = parseFloat(document.getElementById("weightInput")?.value || state.user.currentWeight || 60);

  const met = MET_VALUES[exercise] || 5.0;
  // Standard Calorie Formula: (MET * 3.5 * weightKg / 200) * minutes
  const estimated = Math.round((met * 3.5 * weight / 200) * duration);

  const estBadge = document.getElementById("calorieEstimateValue");
  if (estBadge) {
    estBadge.textContent = `~${estimated} kcal`;
  }

  // Pre-fill calorie field if it's currently empty or at previous estimate
  const calInput = document.getElementById("caloriesInput");
  if (calInput && (!calInput.value || calInput.dataset.autoFilled === "true")) {
    calInput.value = estimated;
    calInput.dataset.autoFilled = "true";
  }
}

// ==========================================================================
// Workout History Table
// ==========================================================================
function renderHistoryTable(searchTerm = "") {
  const tbody = document.getElementById("historyTableBody");
  if (!tbody) return;

  let list = [...state.workouts].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    list = list.filter(w => w.exercise.toLowerCase().includes(term) || w.date.includes(term));
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <div class="empty-state-icon">🏋️‍♂️</div>
            <p>No workout entries found.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(item => {
    return `
      <tr>
        <td style="font-family: var(--font-mono); font-size: 0.85rem;">${item.date}</td>
        <td>
          <div class="table-exercise-cell">
            <span class="exercise-icon-badge">💪</span>
            <span>${item.exercise}</span>
          </div>
        </td>
        <td><span class="badge badge-cyan">${item.duration} min</span></td>
        <td><span class="badge badge-orange">${item.calories} kcal</span></td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="handleDeleteWorkout('${item.id}')" title="Delete entry">
            ✕
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

window.handleDeleteWorkout = function(id) {
  if (confirm("Are you sure you want to delete this workout entry?")) {
    state.deleteWorkout(id);
    renderHistoryTable(document.getElementById("historySearch")?.value || "");
    updateAllCharts();
    showToast("Workout removed.");
  }
};

// ==========================================================================
// CSV Export & Import Features
// ==========================================================================
function exportWorkoutsToCSV() {
  const headers = ["Date", "Exercise", "Duration (min)", "Calories"];
  const rows = state.workouts.map(w => [w.date, `"${w.exercise}"`, w.duration, w.calories]);
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `fitgraph_workouts_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast("Workouts exported to CSV!");
}

function exportWeightsToCSV() {
  const headers = ["Date", "Weight (kg)"];
  const rows = state.weights.map(w => [w.date, w.weight]);
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `fitgraph_weights_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast("Weight log exported to CSV!");
}

function handleCSVImport(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const lines = text.trim().split("\n");
      if (lines.length < 2) {
        showToast("CSV file is empty or missing headers.", "error");
        return;
      }

      const headers = lines[0].toLowerCase();
      let importedCount = 0;

      if (headers.includes("exercise")) {
        // Workouts CSV
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(",");
          if (parts.length >= 4) {
            const date = parts[0].trim();
            const exercise = parts[1].replace(/"/g, "").trim();
            const duration = parseInt(parts[2].trim(), 10) || 30;
            const calories = parseInt(parts[3].trim(), 10) || 300;
            state.addWorkout({ id: `w-imp-${Date.now()}-${i}`, date, exercise, duration, calories });
            importedCount++;
          }
        }
        showToast(`Imported ${importedCount} workouts from CSV!`);
      } else if (headers.includes("weight")) {
        // Weights CSV
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(",");
          if (parts.length >= 2) {
            const date = parts[0].trim();
            const weight = parseFloat(parts[1].trim());
            if (!isNaN(weight)) {
              state.addWeight({ id: `wt-imp-${Date.now()}-${i}`, date, weight });
              importedCount++;
            }
          }
        }
        showToast(`Imported ${importedCount} weight entries from CSV!`);
      } else {
        showToast("Unrecognized CSV format.", "error");
        return;
      }

      updateAllCharts();
      renderHistoryTable();
    } catch (err) {
      console.error(err);
      showToast("Failed to parse CSV file.", "error");
    }
  };
  reader.readAsText(file);
}

// ==========================================================================
// Fitness Tools (BMI Calculator & Hydration Tracker)
// ==========================================================================
function setupFitnessTools() {
  // BMI Calculator
  const calcBtn = document.getElementById("calcBmiBtn");
  if (calcBtn) {
    calcBtn.addEventListener("click", () => {
      const height = parseFloat(document.getElementById("bmiHeight")?.value);
      const weight = parseFloat(document.getElementById("bmiWeight")?.value);

      if (!height || !weight || height <= 0 || weight <= 0) {
        showToast("Please enter valid height and weight.", "error");
        return;
      }

      const heightMeters = height / 100;
      const bmi = (weight / (heightMeters * heightMeters)).toFixed(1);
      const scoreEl = document.getElementById("bmiScore");
      const categoryEl = document.getElementById("bmiCategory");
      const markerEl = document.getElementById("bmiMarker");

      if (scoreEl) scoreEl.textContent = bmi;

      let category = "Normal weight";
      let color = "#34d399";
      let percent = 45;

      if (bmi < 18.5) {
        category = "Underweight";
        color = "#38bdf8";
        percent = 15;
      } else if (bmi <= 24.9) {
        category = "Healthy / Normal";
        color = "#34d399";
        percent = 45;
      } else if (bmi <= 29.9) {
        category = "Overweight";
        color = "#fbbf24";
        percent = 70;
      } else {
        category = "Obese";
        color = "#f87171";
        percent = 92;
      }

      if (categoryEl) {
        categoryEl.textContent = category;
        categoryEl.style.color = color;
      }
      if (markerEl) {
        markerEl.style.left = `${percent}%`;
      }

      showToast(`Calculated BMI: ${bmi} (${category})`);
    });
  }

  // Hydration Tracker
  renderWaterGlasses();
  const addWaterBtn = document.getElementById("addWaterBtn");
  const resetWaterBtn = document.getElementById("resetWaterBtn");

  if (addWaterBtn) {
    addWaterBtn.addEventListener("click", () => {
      if (state.waterCount < 10) {
        state.waterCount++;
        state.saveWater();
        renderWaterGlasses();
        sfx.playChime();
        showToast("💧 Great job staying hydrated!");
      }
    });
  }

  if (resetWaterBtn) {
    resetWaterBtn.addEventListener("click", () => {
      state.waterCount = 0;
      state.saveWater();
      renderWaterGlasses();
    });
  }
}

function renderWaterGlasses() {
  const container = document.getElementById("waterGlassesContainer");
  const countEl = document.getElementById("waterProgressText");
  if (!container) return;

  container.innerHTML = "";
  for (let i = 0; i < 8; i++) {
    const glass = document.createElement("span");
    glass.style.fontSize = "1.5rem";
    glass.style.cursor = "pointer";
    glass.style.transition = "transform 0.2s";
    glass.textContent = i < state.waterCount ? "💧" : "🥛";
    glass.title = `Glass ${i + 1} (250ml)`;
    glass.onclick = () => {
      state.waterCount = i + 1;
      state.saveWater();
      renderWaterGlasses();
      updateActivityRings();
      sfx.playChime();

      if (state.waterCount >= 8) {
        confetti.burst();
        showToast("🎉 Daily 2,000ml Hydration Goal Achieved!");
      }
    };
    container.appendChild(glass);
  }

  if (countEl) {
    countEl.textContent = `${state.waterCount * 250} ml / 2,000 ml`;
  }
  updateActivityRings();
}

// ==========================================================================
// Authentication UI Handlers
// ==========================================================================
window.switchAuthTab = function(tab) {
  const signInBtn = document.getElementById("tabSignInBtn");
  const signUpBtn = document.getElementById("tabSignUpBtn");
  const signInForm = document.getElementById("signInForm");
  const signUpForm = document.getElementById("signUpForm");
  const title = document.getElementById("authModalTitle");
  const subtitle = document.getElementById("authModalSubtitle");
  const alertEl = document.getElementById("authErrorAlert");

  if (alertEl) alertEl.style.display = "none";

  if (tab === "signup") {
    signInBtn?.classList.remove("active");
    signUpBtn?.classList.add("active");
    if (signInForm) signInForm.style.display = "none";
    if (signUpForm) signUpForm.style.display = "block";
    if (title) title.textContent = "Create Your Account";
    if (subtitle) subtitle.textContent = "Start tracking your personal fitness journey";
  } else {
    signUpBtn?.classList.remove("active");
    signInBtn?.classList.add("active");
    if (signUpForm) signUpForm.style.display = "none";
    if (signInForm) signInForm.style.display = "block";
    if (title) title.textContent = "Welcome to FitGraph";
    if (subtitle) subtitle.textContent = "Sign in to track your personal workouts and progress";
  }
};

window.togglePasswordVisibility = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input) {
    if (input.type === "password") {
      input.type = "text";
      btn.textContent = "🙈";
    } else {
      input.type = "password";
      btn.textContent = "👁️";
    }
  }
};

window.handleAuthAction = function() {
  if (state.activeUsername) {
    if (confirm(`Currently signed in as ${state.user.fullName || state.user.username}.\nDo you want to sign out?`)) {
      state.logout();
      syncUserProfileUI();
      updateAllCharts();
      renderHistoryTable();
      showToast("Signed out. Please sign in or create an account.");
      openModal("authModal");
    }
  } else {
    openModal("authModal");
  }
};

function setupAuthForms() {
  // Sign In Form
  const signInForm = document.getElementById("signInForm");
  const alertEl = document.getElementById("authErrorAlert");

  if (signInForm) {
    signInForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = document.getElementById("loginUsername")?.value || "";
      const password = document.getElementById("loginPassword")?.value || "";

      const res = state.login(username, password);
      if (res.success) {
        closeModal("authModal");
        syncUserProfileUI();
        updateExerciseOptions();
        updateAllCharts();
        renderHistoryTable();
        sfx.playChime();
        confetti.burst();
        showToast(`Welcome back, ${state.user.fullName || state.user.username}! 🔥`);
      } else {
        if (alertEl) {
          alertEl.textContent = res.message;
          alertEl.style.display = "block";
        }
      }
    });
  }

  // Sign Up Goal -> Subgoal dynamic sync
  const signupGoal = document.getElementById("signupGoal");
  const signupSubgoal = document.getElementById("signupSubgoal");

  if (signupGoal && signupSubgoal) {
    signupGoal.addEventListener("change", () => {
      const isGain = signupGoal.value === "Weight Gain";
      signupSubgoal.innerHTML = isGain
        ? `
          <option value="Muscle Gain">Muscle Gain</option>
          <option value="Healthy Weight Gain">Healthy Weight Gain</option>
          <option value="Bodybuilding">Bodybuilding</option>
        `
        : `
          <option value="Fat Loss">Fat Loss</option>
          <option value="Tone and Define">Tone and Define</option>
          <option value="Health Reasons">Health Reasons</option>
        `;
    });
  }

  // Sign Up Form
  const signUpForm = document.getElementById("signUpForm");
  if (signUpForm) {
    signUpForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fullName = document.getElementById("signupFullName")?.value.trim() || "";
      const username = document.getElementById("signupUsername")?.value.trim() || "";
      const password = document.getElementById("signupPassword")?.value || "";
      const confirmPassword = document.getElementById("signupConfirmPassword")?.value || "";
      const goal = signupGoal?.value || "Weight Gain";
      const subgoal = signupSubgoal?.value || "Muscle Gain";
      const currentWeight = parseFloat(document.getElementById("signupCurrentWeight")?.value) || 60;
      const targetWeight = parseFloat(document.getElementById("signupTargetWeight")?.value) || 65;

      if (password !== confirmPassword) {
        if (alertEl) {
          alertEl.textContent = "Passwords do not match. Please re-enter.";
          alertEl.style.display = "block";
        }
        return;
      }

      if (password.length < 3) {
        if (alertEl) {
          alertEl.textContent = "Password must be at least 3 characters long.";
          alertEl.style.display = "block";
        }
        return;
      }

      const res = state.signup({
        fullName,
        username,
        password,
        goal,
        subgoal,
        currentWeight,
        targetWeight
      });

      if (res.success) {
        closeModal("authModal");
        syncUserProfileUI();
        updateExerciseOptions();
        updateAllCharts();
        renderHistoryTable();
        sfx.playChime();
        confetti.burst();
        showToast(`Account created! Welcome, ${res.user.fullName}! 🚀`);
      } else {
        if (alertEl) {
          alertEl.textContent = res.message;
          alertEl.style.display = "block";
        }
      }
    });
  }
}

function syncUserProfileUI() {
  const profileName = document.getElementById("userNameDisplay");
  const profileGoal = document.getElementById("userGoalDisplay");
  const profileAvatar = document.getElementById("userAvatarDisplay");
  const authBtnHeader = document.getElementById("authBtnHeaderText");

  const displayName = state.user.fullName || state.user.username;
  if (profileName) profileName.textContent = displayName;
  if (profileGoal) profileGoal.textContent = `${state.user.goal} • ${state.user.subgoal}`;
  if (profileAvatar) profileAvatar.textContent = (displayName || "U").charAt(0).toUpperCase();

  if (authBtnHeader) {
    authBtnHeader.textContent = state.activeUsername ? "Sign Out" : "Sign In";
  }

  // Pre-fill body weight in log workout form
  const weightInput = document.getElementById("weightInput");
  if (weightInput) {
    weightInput.value = state.user.currentWeight || 60;
  }
}

// ==========================================================================
// Goal & User Settings Modal
// ==========================================================================
function setupUserSettings() {
  syncUserProfileUI();

  // Populate goal modal inputs
  const nameInput = document.getElementById("modalUsername");
  const goalSelect = document.getElementById("modalGoalSelect");
  const subgoalSelect = document.getElementById("modalSubgoalSelect");
  const targetWeightInput = document.getElementById("modalTargetWeight");

  if (nameInput) nameInput.value = state.user.fullName || state.user.username;
  if (goalSelect) goalSelect.value = state.user.goal;
  if (targetWeightInput) targetWeightInput.value = state.user.targetWeight;

  const updateSubgoals = () => {
    if (!subgoalSelect || !goalSelect) return;
    const isGain = goalSelect.value === "Weight Gain";
    subgoalSelect.innerHTML = isGain
      ? `
        <option value="Muscle Gain">Muscle Gain</option>
        <option value="Healthy Weight Gain">Healthy Weight Gain</option>
        <option value="Bodybuilding">Bodybuilding</option>
      `
      : `
        <option value="Fat Loss">Fat Loss</option>
        <option value="Tone and Define">Tone and Define</option>
        <option value="Health Reasons">Health Reasons</option>
      `;
    subgoalSelect.value = state.user.subgoal;
  };

  if (goalSelect) {
    goalSelect.addEventListener("change", updateSubgoals);
  }
  updateSubgoals();

  // Save Modal
  const saveGoalBtn = document.getElementById("saveGoalBtn");
  if (saveGoalBtn) {
    saveGoalBtn.addEventListener("click", () => {
      state.user.fullName = nameInput.value.trim() || state.user.username;
      state.user.goal = goalSelect.value;
      state.user.subgoal = subgoalSelect.value;
      state.user.targetWeight = parseFloat(targetWeightInput.value) || 65;
      state.saveUser();

      syncUserProfileUI();
      updateExerciseOptions();
      updateAllCharts();
      closeModal("goalModal");
      showToast("Profile & fitness goals updated! 🎯");
    });
  }
}

// ==========================================================================
// Modal Helpers
// ==========================================================================
window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
  }
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
  }
};

// ==========================================================================
// Application Initialization
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Session Check & Initial View Gate
  if (state.activeUsername) {
    closeModal("authModal");
    syncUserProfileUI();
  } else {
    openModal("authModal");
  }

  // 2. Set Default Date to Today
  const dateInput = document.getElementById("workoutDateInput");
  if (dateInput) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }

  // 3. Motivational Quote
  setRandomQuote();
  const newQuoteBtn = document.getElementById("newQuoteBtn");
  if (newQuoteBtn) {
    newQuoteBtn.addEventListener("click", setRandomQuote);
  }

  // 4. Exercise Dropdowns & Auto-Calculator Listeners
  updateExerciseOptions();
  const exerciseSelect = document.getElementById("exerciseSelect");
  const durationInput = document.getElementById("durationInput");
  const weightInput = document.getElementById("weightInput");
  const caloriesInput = document.getElementById("caloriesInput");

  if (exerciseSelect) exerciseSelect.addEventListener("change", estimateCalories);
  if (durationInput) durationInput.addEventListener("input", estimateCalories);
  if (weightInput) weightInput.addEventListener("input", estimateCalories);
  if (caloriesInput) {
    caloriesInput.addEventListener("input", () => {
      caloriesInput.dataset.autoFilled = "false";
    });
  }

  // Quick Duration Chips
  document.querySelectorAll(".chip-duration").forEach(chip => {
    chip.addEventListener("click", () => {
      const mins = chip.dataset.mins;
      if (durationInput) {
        durationInput.value = mins;
        estimateCalories();
      }
      document.querySelectorAll(".chip-duration").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
    });
  });

  // 5. Workout Form Submission
  const workoutForm = document.getElementById("workoutForm");
  if (workoutForm) {
    workoutForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const date = document.getElementById("workoutDateInput")?.value || new Date().toISOString().split("T")[0];
      const exercise = exerciseSelect?.value || "Strength Training";
      const duration = parseInt(durationInput?.value || 30, 10);
      const calories = parseInt(caloriesInput?.value || 300, 10);
      const weight = parseFloat(weightInput?.value);

      // Create & Add workout
      const newWorkout = {
        id: `w-${Date.now()}`,
        date,
        exercise,
        duration,
        calories
      };
      state.addWorkout(newWorkout);

      // If weight was provided, log it too
      if (!isNaN(weight) && weight > 0) {
        state.addWeight({
          id: `wt-${Date.now()}`,
          date,
          weight
        });
      }

      sfx.playChime();
      confetti.burst(window.innerWidth / 2, window.innerHeight * 0.5);
      showToast("Workout and weight logged successfully! 🔥");

      // Refresh UI
      renderHistoryTable();
      updateAllCharts();

      // Reset fields
      if (durationInput) durationInput.value = 30;
      if (caloriesInput) caloriesInput.value = "";
      estimateCalories();
    });
  }

  // 6. Navigation Tabs (Sidebar + Mobile Bottom Nav)
  const navLinks = document.querySelectorAll("[data-nav-view]");
  const viewSections = document.querySelectorAll(".view-section");

  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetView = link.dataset.navView;

      navLinks.forEach(l => l.classList.remove("active"));
      document.querySelectorAll(`[data-nav-view="${targetView}"]`).forEach(l => l.classList.add("active"));

      viewSections.forEach(section => {
        section.style.display = section.id === targetView ? "block" : "none";
      });

      // Close mobile sidebar if open
      document.getElementById("appSidebar")?.classList.remove("mobile-open");

      // Scroll top
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // Mobile sidebar toggle
  const mobileToggle = document.getElementById("mobileMenuToggle");
  const sidebar = document.getElementById("appSidebar");
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");
    });
  }

  // 7. Time Range Filters for Charts
  document.querySelectorAll(".chart-filter-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".chart-filter-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      state.activeTimeRange = pill.dataset.range;
      updateAllCharts();
    });
  });

  // 8. History Search Input
  const searchInput = document.getElementById("historySearch");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      renderHistoryTable(e.target.value);
    });
  }

  // 9. CSV Export & Import Handlers
  const exportWorkoutsBtn = document.getElementById("exportWorkoutsBtn");
  const exportWeightsBtn = document.getElementById("exportWeightsBtn");
  const csvFileInput = document.getElementById("csvFileInput");
  const importCSVBtn = document.getElementById("importCSVBtn");

  if (exportWorkoutsBtn) exportWorkoutsBtn.addEventListener("click", exportWorkoutsToCSV);
  if (exportWeightsBtn) exportWeightsBtn.addEventListener("click", exportWeightsToCSV);

  if (importCSVBtn && csvFileInput) {
    importCSVBtn.addEventListener("click", () => csvFileInput.click());
    csvFileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleCSVImport(e.target.files[0]);
      }
    });
  }



  // 11. Fitness Tools, User Profile & Auth
  setupFitnessTools();
  setupUserSettings();
  setupAuthForms();
  restTimer.init();

  // 12. Initialize Charts, Rings & Tables
  initCharts();
  renderHistoryTable();
  updateActivityRings();
});
