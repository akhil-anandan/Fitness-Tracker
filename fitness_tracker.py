import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime, timedelta
import os
import uuid
import base64
import time
import requests
from streamlit_lottie import st_lottie

# ---------- 🔧 CONFIGURATION ----------
st.set_page_config(page_title="FitGraph", layout="centered")
# ------------------------- 🎨 Custom CSS (Login Button + Animated NavBar + Quote Styling)
st.markdown("""
    <style>
    /* 🔵 Blue Login Button */
    div.stButton > button:first-child {
        background-color: #007BFF;
        color: white;
        border: none;
        padding: 0.5em 1.5em;
        border-radius: 5px;
        transition: background-color 0.3s;
    }
    div.stButton > button:hover {
        background-color: #0056b3;
        color: white;
    }

    /* ⬇️ Slide Down Animation for Sidebar (3s) */
    @keyframes slideDown {
        0% {
            transform: translateY(-100%);
            opacity: 0;
        }
        100% {
            transform: translateY(0%);
            opacity: 1;
        }
    }
    section[data-testid="stSidebar"] {
        animation: slideDown 1s ease-in-out;
        z-index: 999;
        position: relative;
        background: linear-gradient(to bottom right, #000C1A, #001A33, #002B59);
        color: white;
    }a

    /* 💬 Motivational Quote Style with larger padding and font */
    .stAlert {
        font-size: 22px !important;
        padding: 2rem !important;
    }
    </style>
""", unsafe_allow_html=True)

# ------------------------- 🔧 Background Utility
def set_bg_image(image_path):
    with open(image_path, "rb") as f:
        data_url = base64.b64encode(f.read()).decode()
    st.markdown(f"""
        <style>
        .stApp {{
            background-image: url("data:image/png;base64,{data_url}");
            background-size: cover;
            background-position: center;
            background-attachment: fixed;
        }}
        .block-container {{
            background-color: rgba(0, 0, 0, 0.4);
            padding: 2rem;
            border-radius: 10px;
        }}
        </style>
    """, unsafe_allow_html=True)

# ------------------------- 🔐 File Utilities
def get_user_files(user_id):
    return f"user_data/workouts_{user_id}.csv", f"user_data/weights_{user_id}.csv"

def create_user_files(user_id):
    os.makedirs("user_data", exist_ok=True)
    workout_file, weight_file = get_user_files(user_id)
    if not os.path.exists(workout_file):
        pd.DataFrame(columns=["Date", "Exercise", "Duration (min)", "Calories"]).to_csv(workout_file, index=False)
    if not os.path.exists(weight_file):
        pd.DataFrame(columns=["Date", "Weight (kg)"]).to_csv(weight_file, index=False)

def load_workouts(user_id):
    return pd.read_csv(get_user_files(user_id)[0])

def load_weights(user_id):
    return pd.read_csv(get_user_files(user_id)[1])

def save_workout(user_id, data):
    df = load_workouts(user_id)
    df = pd.concat([df, data], ignore_index=True)
    df.to_csv(get_user_files(user_id)[0], index=False)

def save_weight(user_id, data):
    df = load_weights(user_id)
    df = pd.concat([df, data], ignore_index=True)
    df.to_csv(get_user_files(user_id)[1], index=False)

# ------------------------- 🎮 First Load: Show logo.jpg with zoom animation (no quote)
if "title_shown" not in st.session_state:
    with open("logo.jpg", "rb") as img_file:
        logo_b64 = base64.b64encode(img_file.read()).decode()

    st.markdown(f"""
    <style>
    @keyframes zoomIn {{
        0% {{ transform: scale(1.2); opacity: 0; }}
        100% {{ transform: scale(1); opacity: 1; }}
    }}
    .intro {{
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-image: url("data:image/png;base64,{logo_b64}");
        background-size: cover;
        background-position: center;
        animation: zoomIn 3s ease-in-out forwards;
        z-index: 9999;
    }}
    </style>
    <div class="intro"></div>
    """, unsafe_allow_html=True)

    time.sleep(3)
    st.session_state.title_shown = True
    st.rerun()

# ------------------------- ✅ Main Background for All Pages (bg.jpg)
set_bg_image("bg.jpg")

# ------------------------- 🏷️ Title
st.markdown("<h1 style='text-align:center; color:white;'>🏋️‍♀️ Fitness Tracker</h1>", unsafe_allow_html=True)

# ------------------------- 🔐 Login
if "user_logged_in" not in st.session_state:
    st.markdown("### 🔐 Please Log In")
    try:
        lottie_login = requests.get("https://assets10.lottiefiles.com/packages/lf20_jcikwtux.json").json()
        st_lottie(lottie_login, height=200)
    except:
        st.warning("⚠️ Unable to load animation (offline?)")

    username = st.text_input("Username")
    password = st.text_input("Password", type="password")
    remember = st.checkbox("Remember Me")
    if st.button("Login"):
        if username and password:
            st.session_state.user_logged_in = True
            st.session_state.username = username
            st.session_state.user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, username))
            create_user_files(st.session_state.user_id)
            st.session_state.show_quote = True
            st.rerun()
        else:
            st.warning("Enter both username and password.")
    st.stop()

# ✅ Show motivational quote only after login
if st.session_state.get("show_quote", False):
    st.info("💬 *“The pain you feel today will be the strength you feel tomorrow.”*")
    del st.session_state["show_quote"]

# ------------------------- 🎯 Goal Selection
if "user_goal" not in st.session_state:
    st.markdown("### 🎯 What is your fitness goal?")
    goal = st.radio("Select your goal:", ["Weight Gain", "Weight Loss"])
    subgoal = st.selectbox("Choose your focus:", {
        "Weight Gain": ["Muscle Gain", "Healthy Weight Gain", "Bodybuilding"],
        "Weight Loss": ["Fat Loss", "Tone and Define", "Health Reasons"]
    }[goal])
    if st.button("Submit Goal"):
        st.session_state.user_goal = goal
        st.session_state.user_subgoal = subgoal
        st.success(f"Goal: {goal} — {subgoal}")
        st.rerun()
    st.stop()

# ------------------------- 🧽 Sidebar Navigation
username = st.session_state.username
user_id = st.session_state.user_id
goal = st.session_state.user_goal

st.sidebar.title("📋 Navigation")
st.sidebar.write(f"👤 **User**: {username}")
st.sidebar.write(f"🎯 **Goal**: {goal}")
st.sidebar.write(f"📌 **Category**: {st.session_state.user_subgoal}")
page = st.sidebar.radio("Go to", ["Workout & Weight", "View 1-Week Progress"])

# ------------------------- 🏋️ Workout Log
if page == "Workout & Weight":
    st.header("🏃‍♂️ Your Workout")
    exercise_list = ["Weightlifting", "Compound Lifts", "Strength Training"] if goal == "Weight Gain" else ["Running", "Cycling", "HIIT", "Swimming"]

    with st.form("workout_form"):
        col1, col2 = st.columns(2)
        with col1:
            date = st.date_input("Date", value=datetime.today())
            exercise = st.selectbox("Exercise", exercise_list + ["Other"])
            duration = st.number_input("Duration (min)", min_value=1)
            calories = st.number_input("Calories Burned", min_value=1)
        with col2:
            weight = st.number_input("Weight (kg)", min_value=0.0)

        if st.form_submit_button("Log Workout & Weight"):
            save_workout(user_id, pd.DataFrame({
                "Date": [date],
                "Exercise": [exercise],
                "Duration (min)": [duration],
                "Calories": [calories]
            }))
            save_weight(user_id, pd.DataFrame({
                "Date": [date],
                "Weight (kg)": [weight]
            }))
            st.success("✅ Workout and Weight logged!")

# ------------------------- 📊 Weekly Progress
if page == "View 1-Week Progress":
    st.header("📅 Weekly Progress")
    weights = load_weights(user_id)
    workouts = load_workouts(user_id)

    st.subheader("📉 Weight Trend")
    if not weights.empty:
        weights["Date"] = pd.to_datetime(weights["Date"])
        recent = weights[weights["Date"] >= datetime.today() - timedelta(days=6)]
        if not recent.empty:
            fig = px.line(recent, x="Date", y="Weight (kg)", markers=True)
            st.plotly_chart(fig)
        else:
            st.info("No recent weight data.")
    else:
        st.info("No weight entries.")

    st.subheader("🔥 Workouts")
    if not workouts.empty:
        workouts["Date"] = pd.to_datetime(workouts["Date"])
        recent_w = workouts[workouts["Date"] >= datetime.today() - timedelta(days=6)]
        if not recent_w.empty:
            cal_fig = px.line(recent_w.groupby("Date")["Calories"].sum().reset_index(),
                              x="Date", y="Calories", title="Calories Burned")
            st.plotly_chart(cal_fig)
        else:
            st.info("No workouts in last 7 days.")
    else:
        st.info("No workouts recorded.")
